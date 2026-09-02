#!/usr/bin/env bash
set -u
ADB=adb
PKG=ru.mirsamozanyatykh.mobileagent
SERVICE="$PKG/expo.modules.accessibilityagent.OX2AccessibilityService"
FAIL=0
: > hands-runtime.txt
fail(){ echo "FAIL:$1 $2" | tee -a hands-runtime.txt; FAIL=1; }
pass(){ echo "PASS:$1 $2" | tee -a hands-runtime.txt; }
collect(){ $ADB devices -l > adb-devices.txt 2>&1 || true; $ADB shell dumpsys accessibility > hands-accessibility-dump.txt 2>&1 || true; $ADB shell dumpsys activity activities > hands-activities-failure.txt 2>&1 || true; $ADB shell dumpsys window > hands-window-failure.txt 2>&1 || true; $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true; cp hands-logcat.txt full-logcat.txt 2>/dev/null || true; }
$ADB devices -l > adb-devices.txt 2>&1 || true
if grep -Eq '^emulator-5554[[:space:]]+device([[:space:]]|$)' adb-devices.txt; then pass H0_ADB_DEVICE reason=emulator_5554_device; else fail H0_ADB_DEVICE reason=emulator_5554_not_ready; collect; exit 1; fi
if $ADB install -r "$GITHUB_WORKSPACE/hands-smoke.apk"; then pass H1_INSTALL reason=apk_installed; else fail H1_INSTALL reason=apk_install_failed; collect; exit 1; fi
$ADB shell pm grant "$PKG" android.permission.RECORD_AUDIO >/dev/null 2>&1 || true
if $ADB shell dumpsys package "$PKG" | tr -d '\r' | grep -Fq 'android.permission.RECORD_AUDIO'; then pass H2_RECORD_AUDIO reason=permission_present; else fail H2_RECORD_AUDIO reason=permission_missing; fi
$ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true
$ADB shell settings put secure enabled_accessibility_services "$SERVICE" >/dev/null 2>&1 || true
ENABLED=''; STATE=''
for _ in $(seq 1 20); do ENABLED=$($ADB shell settings get secure accessibility_enabled 2>/dev/null | tr -d '\r' || true); STATE=$($ADB shell settings get secure enabled_accessibility_services 2>/dev/null | tr -d '\r' || true); [ "$ENABLED" = 1 ] && echo "$STATE" | grep -Fq "$SERVICE" && break; $ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true; $ADB shell settings put secure enabled_accessibility_services "$SERVICE" >/dev/null 2>&1 || true; sleep 1; done
if [ "$ENABLED" = 1 ]; then pass H3_ACCESSIBILITY_ENABLED reason=secure_setting_enabled; else fail H3_ACCESSIBILITY_ENABLED reason=secure_setting_not_enabled; fi
if echo "$STATE" | grep -Fq "$SERVICE"; then pass H4_ACCESSIBILITY_SERVICE_ENABLED reason=service_listed; else fail H4_ACCESSIBILITY_SERVICE_ENABLED reason=service_not_listed; fi
# H5 is a runtime proof gate, not a static manifest/settings check. Start the
# smoke route, then require dumpsys evidence of a bound service AND the native
# smoke marker proving OX2AccessibilityService.instance plus a non-empty tree.
$ADB logcat -c || true
$ADB shell am force-stop "$PKG" || true
$ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///hands-smoke' -p "$PKG" > hands-h5-launch.txt 2>&1 || true
BOUND=0
RUNTIME=0
for _ in $(seq 1 45); do
  DUMP=$($ADB shell dumpsys accessibility 2>/dev/null | tr -d '\r' || true)
  $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
  if echo "$DUMP" | grep -Fq "$SERVICE" && \
     echo "$DUMP" | grep -Eq 'Bound services:.*' && \
     grep -Eq 'HANDS_ACCESSIBILITY_RUNTIME service_bound=true native_instance=true tree_nodes=[1-9][0-9]*' hands-logcat.txt; then
    BOUND=1
    RUNTIME=1
    break
  fi
  sleep 1
done
$ADB shell dumpsys accessibility > hands-h5-dumpsys.txt 2>&1 || true
$ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
if [ "$BOUND" = 1 ] && [ "$RUNTIME" = 1 ]; then
  pass H5_ACCESSIBILITY_SERVICE_BIND reason=dumpsys_bound_and_native_instance_tree_proven
  echo 'ACCESSIBILITY_SERVICE_BIND=PASS' | tee -a hands-runtime.txt
else
  fail H5_ACCESSIBILITY_SERVICE_BIND reason=runtime_bound_service_or_native_tree_proof_missing
  collect
  exit 1
fi
$ADB shell am force-stop "$PKG" || true
if $ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///hands-smoke' -p "$PKG" > hands-launch.txt 2>&1; then pass H6_OX2_HANDS_ROUTE reason=route_launch_command_succeeded; else fail H6_OX2_HANDS_ROUTE reason=route_launch_command_failed; collect; exit 1; fi
for _ in $(seq 1 60); do $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true; grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt && break; grep -q 'HANDS_EXCEPTION:' hands-logcat.txt && break; sleep 1; done
$ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
cp hands-logcat.txt full-logcat.txt 2>/dev/null || true
$ADB shell pidof "$PKG" | tr -d '\r' > hands-ox2-pid.txt 2>/dev/null || true
grep -q 'HANDS_SMOKE_START' hands-logcat.txt && pass H7_HANDS_SMOKE_START reason=marker_present || fail H7_HANDS_SMOKE_START reason=marker_missing
grep -q 'HANDS_TOOLSET_CREATED' hands-logcat.txt && pass H8_HANDS_TOOLSET_CREATED reason=marker_present || fail H8_HANDS_TOOLSET_CREATED reason=marker_missing
grep -q 'HANDS_APPROVAL_GRANTED' hands-logcat.txt && pass H9_HANDS_APPROVAL_GRANTED reason=approval_marker_present || fail H9_HANDS_APPROVAL_GRANTED reason=approval_marker_missing
grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt && pass H10_REAL_ACCESSIBILITY_TAP_VERIFIED reason=real_accessibility_tap_marker_present || fail H10_REAL_ACCESSIBILITY_TAP_VERIFIED reason=real_accessibility_tap_marker_missing
$ADB shell dumpsys activity activities > hands-activities-before.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-before.txt 2>&1 || true
$ADB shell dumpsys accessibility > hands-dumpsys.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-before.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-before.xml > hands-ui-before.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-before.png 2>/dev/null || true
grep -q 'HANDS_OPEN_APP_RESULT status=launched_verified' hands-logcat.txt && pass H11_HANDS_OPEN_APP_RESULT reason=settings_launch_verified_marker_present || fail H11_HANDS_OPEN_APP_RESULT reason=settings_launch_marker_missing
grep -q 'HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings' hands-logcat.txt && pass H12_HANDS_NATIVE_INTENT_REQUESTED reason=native_intent_marker_present || fail H12_HANDS_NATIVE_INTENT_REQUESTED reason=native_intent_marker_missing
TOP=$($ADB shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
printf '%s\n' "$TOP" > hands-top.txt
$ADB shell dumpsys activity activities > hands-activities-after.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-after.txt 2>&1 || true
$ADB shell dumpsys accessibility > hands-dumpsys.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-after.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-after.xml > hands-ui-after.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-after.png 2>/dev/null || true
$ADB shell pidof com.android.settings | tr -d '\r' > hands-target-pid.txt 2>/dev/null || true
grep -E 'FATAL EXCEPTION|AndroidRuntime' hands-logcat.txt > hands-fatal.txt || true
if echo "$TOP" | grep -q 'com.android.settings'; then pass H13_TARGET_FOREGROUND reason=mResumedActivity_targets_settings; else fail H13_TARGET_FOREGROUND reason=mResumedActivity_not_settings; fi
if [ ! -s hands-fatal.txt ]; then pass H14_NO_OX2_FATAL reason=no_androidruntime_or_fatal_marker; else fail H14_NO_OX2_FATAL reason=fatal_marker_present; fi
if [ "$FAIL" -ne 0 ]; then collect; exit 1; fi
echo 'HANDS_RUNTIME=PASS' | tee -a hands-runtime.txt
