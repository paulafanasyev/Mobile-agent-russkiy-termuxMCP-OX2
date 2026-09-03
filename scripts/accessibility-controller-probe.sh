#!/usr/bin/env bash
set -u
ADB=adb
PKG=ru.mirsamozanyatykh.mobileagent
SERVICE="$PKG/com.paulafanasyev.ox2.accessibility.OX2BeddaAccessibilityService"
FAIL=0
: > accessibility-controller-runtime.txt
fail(){ echo "FAIL:$1 $2" | tee -a accessibility-controller-runtime.txt; FAIL=1; }
pass(){ echo "PASS:$1 $2" | tee -a accessibility-controller-runtime.txt; }
collect(){
  $ADB devices -l > controller-adb-devices.txt 2>&1 || true
  $ADB shell dumpsys accessibility > controller-accessibility-dump.txt 2>&1 || true
  $ADB shell dumpsys activity services > controller-activity-services.txt 2>&1 || true
  $ADB shell dumpsys package "$PKG" > controller-package.txt 2>&1 || true
  $ADB shell dumpsys activity activities > controller-activities.txt 2>&1 || true
  $ADB shell dumpsys window windows > controller-window.txt 2>&1 || true
  $ADB logcat -d -v threadtime > controller-logcat.txt 2>&1 || true
}

$ADB devices -l > controller-adb-devices.txt 2>&1 || true
if grep -Eq '^emulator-5554[[:space:]]+device([[:space:]]|$)' controller-adb-devices.txt; then pass H0_ADB_DEVICE reason=emulator_5554_device; else fail H0_ADB_DEVICE reason=emulator_5554_not_ready; collect; exit 1; fi

APK="$GITHUB_WORKSPACE/accessibility-controller-smoke.apk"
if $ADB install -r "$APK"; then pass H1_INSTALL reason=apk_installed; else fail H1_INSTALL reason=apk_install_failed; collect; exit 1; fi

# Clean state MUST happen before accessibility is enabled. Never kill/clear the
# app after H2/H3: doing so races AccessibilityManagerService binding and can
# create a false H5 failure.
$ADB shell am force-stop "$PKG" || true
$ADB logcat -c || true

$ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true
$ADB shell settings put secure enabled_accessibility_services "$SERVICE" >/dev/null 2>&1 || true
ENABLED=''; STATE=''
for _ in $(seq 1 20); do
  ENABLED=$($ADB shell settings get secure accessibility_enabled 2>/dev/null | tr -d '\r' || true)
  STATE=$($ADB shell settings get secure enabled_accessibility_services 2>/dev/null | tr -d '\r' || true)
  [ "$ENABLED" = 1 ] && echo "$STATE" | grep -Fq "$SERVICE" && break
  $ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true
  $ADB shell settings put secure enabled_accessibility_services "$SERVICE" >/dev/null 2>&1 || true
  sleep 1
done
if [ "$ENABLED" = 1 ]; then pass H2_ACCESSIBILITY_ENABLED reason=secure_setting_enabled; else fail H2_ACCESSIBILITY_ENABLED reason=secure_setting_not_enabled; fi
if echo "$STATE" | grep -Fq "$SERVICE"; then pass H3_ACCESSIBILITY_SERVICE_ENABLED reason=service_listed; else fail H3_ACCESSIBILITY_SERVICE_ENABLED reason=service_not_listed; fi

if $ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///accessibility-controller-smoke' -p "$PKG" > controller-launch.txt 2>&1; then pass H4_CONTROLLER_ROUTE reason=route_launch_command_succeeded; else fail H4_CONTROLLER_ROUTE reason=route_launch_failed; collect; exit 1; fi

BOUND=0
LIFECYCLE=0
JS_ENABLED=0
TREE=0
TAP=0
OPEN_SETTINGS=0

for _ in $(seq 1 60); do
  $ADB shell dumpsys accessibility > controller-accessibility-dump-live.txt 2>&1 || true
  $ADB shell dumpsys activity services > controller-activity-services-live.txt 2>&1 || true
  $ADB shell dumpsys window windows > controller-window-live.txt 2>&1 || true
  $ADB logcat -d -v threadtime > controller-logcat.txt 2>&1 || true

  # H5 is a binding proof, not a tree proof. Require the exact component in
  # dumpsys accessibility plus non-empty bound-services evidence or an Activity
  # Manager service record for the same component.
  if grep -Fq "$SERVICE" controller-accessibility-dump-live.txt && \
     (grep -Eiq 'Bound services:[[:space:]]*\{[^}]*' controller-accessibility-dump-live.txt || \
      grep -Fq "$SERVICE" controller-activity-services-live.txt); then
    if ! grep -Eiq 'Bound services:[[:space:]]*\{[[:space:]]*\}' controller-accessibility-dump-live.txt || grep -Fq "$SERVICE" controller-activity-services-live.txt; then
      BOUND=1
    fi
  fi

  if grep -q 'OX2BeddaAccessibility.*onServiceConnected called; instance set' controller-logcat.txt; then LIFECYCLE=1; fi
  if grep -q 'ACCESSIBILITY_CONTROLLER_SERVICE_ENABLED=true' controller-logcat.txt; then JS_ENABLED=1; fi
  if grep -Eq 'ACCESSIBILITY_CONTROLLER_RUNTIME service_bound=true tree_nodes=[1-9][0-9]*' controller-logcat.txt; then TREE=1; fi
  if grep -q 'PASS:ACCESSIBILITY_CONTROLLER_TAP_VERIFIED' controller-logcat.txt; then TAP=1; fi
  if grep -q 'ACCESSIBILITY_CONTROLLER_OPEN_SETTINGS=true' controller-logcat.txt; then OPEN_SETTINGS=1; fi

  [ "$BOUND" = 1 ] && [ "$LIFECYCLE" = 1 ] && [ "$JS_ENABLED" = 1 ] && [ "$TREE" = 1 ] && [ "$TAP" = 1 ] && [ "$OPEN_SETTINGS" = 1 ] && break
  sleep 1
done

$ADB shell dumpsys accessibility > controller-accessibility-dump.txt 2>&1 || true
$ADB shell dumpsys activity services > controller-activity-services.txt 2>&1 || true
$ADB shell dumpsys window windows > controller-window.txt 2>&1 || true
$ADB shell dumpsys activity activities > controller-activities.txt 2>&1 || true
$ADB logcat -d -v threadtime > controller-logcat.txt 2>&1 || true

if [ "$BOUND" = 1 ]; then pass H5_ACCESSIBILITY_SERVICE_BIND reason=dumpsys_component_and_binding_evidence; echo 'ACCESSIBILITY_CONTROLLER_BIND=PASS' | tee -a accessibility-controller-runtime.txt; else fail H5_ACCESSIBILITY_SERVICE_BIND reason=dumpsys_binding_not_proven; fi
if [ "$LIFECYCLE" = 1 ]; then pass H5A_SERVICE_LIFECYCLE reason=native_onServiceConnected; echo 'ACCESSIBILITY_CONTROLLER_LIFECYCLE=PASS' | tee -a accessibility-controller-runtime.txt; else fail H5A_SERVICE_LIFECYCLE reason=native_onServiceConnected_missing; fi
if [ "$JS_ENABLED" = 1 ]; then pass H6_SERVICE_STATUS reason=js_service_enabled_true; else fail H6_SERVICE_STATUS reason=js_service_enabled_marker_missing; fi
if [ "$TREE" = 1 ]; then pass H6A_ACCESSIBILITY_TREE reason=js_tree_nonempty; else fail H6A_ACCESSIBILITY_TREE reason=tree_marker_missing; fi
if [ "$TAP" = 1 ]; then pass H7_NATIVE_EVENT_AND_TAP reason=verified_tap_postcondition; else fail H7_NATIVE_EVENT_AND_TAP reason=verified_tap_marker_missing; fi
if [ "$OPEN_SETTINGS" = 1 ]; then pass H8_GLOBAL_OPEN_APP reason=settings_open_verified; else fail H8_GLOBAL_OPEN_APP reason=settings_open_marker_missing; fi

TOP=$($ADB shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
printf '%s\n' "$TOP" > controller-top.txt
if [ "$OPEN_SETTINGS" = 1 ] && echo "$TOP" | grep -q 'com.android.settings'; then pass H9_TARGET_FOREGROUND reason=settings_is_resumed; else fail H9_TARGET_FOREGROUND reason=settings_not_resumed; fi

$ADB shell uiautomator dump /sdcard/controller-ui.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/controller-ui.xml > controller-ui.xml 2>/dev/null || true
$ADB exec-out screencap -p > controller-after.png 2>/dev/null || true
$ADB shell pidof "$PKG" | tr -d '\r' > controller-ox2-pid.txt 2>/dev/null || true
$ADB shell pidof com.android.settings | tr -d '\r' > controller-settings-pid.txt 2>/dev/null || true
grep -E 'FATAL EXCEPTION|AndroidRuntime.*FATAL' controller-logcat.txt > controller-fatal.txt || true
if [ ! -s controller-fatal.txt ]; then pass H10_NO_FATAL reason=no_fatal_exception; else fail H10_NO_FATAL reason=fatal_exception_present; fi

cp controller-accessibility-dump.txt controller-accessibility-dump-final.txt 2>/dev/null || true
cp controller-activity-services.txt controller-activity-services-final.txt 2>/dev/null || true
cp controller-window.txt controller-window-final.txt 2>/dev/null || true

if [ "$FAIL" -ne 0 ]; then collect; echo 'ACCESSIBILITY_CONTROLLER_RUNTIME=FAIL' | tee -a accessibility-controller-runtime.txt; exit 1; fi
echo 'ACCESSIBILITY_CONTROLLER_RUNTIME=PASS' | tee -a accessibility-controller-runtime.txt
