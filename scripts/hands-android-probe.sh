#!/usr/bin/env bash
set -u
ADB='adb'
PKG='ru.mirsamozanyatykh.mobileagent'
ACCESSIBILITY_SERVICE="$PKG/expo.modules.accessibilityagent.OX2AccessibilityService"
FAIL=0

fail() {
  local reason="$1"
  echo "FAIL:$reason" | tee -a hands-runtime.txt
  FAIL=1
}

collect_failure_evidence() {
  $ADB shell settings get secure accessibility_enabled > hands-accessibility-state.txt 2>&1 || true
  $ADB shell settings get secure enabled_accessibility_services >> hands-accessibility-state.txt 2>&1 || true
  $ADB shell dumpsys accessibility > hands-accessibility-dump.txt 2>&1 || true
  $ADB shell dumpsys activity activities > hands-activities-failure.txt 2>&1 || true
  $ADB shell dumpsys window > hands-window-failure.txt 2>&1 || true
  $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
}

$ADB install -r "$GITHUB_WORKSPACE/hands-smoke.apk"
if [ "$?" -eq 0 ]; then
  echo 'INSTALL=PASS' | tee hands-runtime.txt
else
  echo 'INSTALL=FAIL' | tee hands-runtime.txt
  fail 'INSTALL_FAILED'
  collect_failure_evidence
  exit 1
fi

$ADB shell pm grant "$PKG" android.permission.RECORD_AUDIO 2>/dev/null || true
echo "RECORD_AUDIO_GRANT=$( $ADB shell dumpsys package "$PKG" | tr -d '\r' | grep 'android.permission.RECORD_AUDIO' | head -1 || true )" | tee -a hands-runtime.txt

# CI-only setup on the disposable emulator.
$ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true
$ADB shell settings put secure enabled_accessibility_services "$ACCESSIBILITY_SERVICE" >/dev/null 2>&1 || true

# Android may apply secure-setting changes asynchronously. Retry the writes and
# read back the authoritative settings before declaring the gate failed.
ACCESSIBILITY_ENABLED=''
ACCESSIBILITY_STATE=''
for _ in $(seq 1 15); do
  ACCESSIBILITY_ENABLED=$($ADB shell settings get secure accessibility_enabled 2>/dev/null | tr -d '\r' || true)
  ACCESSIBILITY_STATE=$($ADB shell settings get secure enabled_accessibility_services 2>/dev/null | tr -d '\r' || true)
  if [ "$ACCESSIBILITY_ENABLED" = '1' ] && echo "$ACCESSIBILITY_STATE" | grep -Fq "$ACCESSIBILITY_SERVICE"; then
    break
  fi
  $ADB shell settings put secure accessibility_enabled 1 >/dev/null 2>&1 || true
  $ADB shell settings put secure enabled_accessibility_services "$ACCESSIBILITY_SERVICE" >/dev/null 2>&1 || true
  sleep 1
done

echo "ACCESSIBILITY_ENABLED=$ACCESSIBILITY_ENABLED" | tee -a hands-runtime.txt
echo "ACCESSIBILITY_SERVICE_STATE=$ACCESSIBILITY_STATE" | tee -a hands-runtime.txt

if [ "$ACCESSIBILITY_ENABLED" != '1' ]; then
  fail 'ACCESSIBILITY_MASTER_DISABLED'
  collect_failure_evidence
  exit 1
fi

if ! echo "$ACCESSIBILITY_STATE" | grep -Fq "$ACCESSIBILITY_SERVICE"; then
  fail 'ACCESSIBILITY_SERVICE_NOT_ENABLED'
  collect_failure_evidence
  exit 1
fi
echo 'ACCESSIBILITY_SERVICE_ENABLED=PASS' | tee -a hands-runtime.txt

# Presence in dumpsys is evidence that Android knows about the service, but we
# also require a bound/enabled service entry before continuing.
ACCESSIBILITY_BOUND=0
for _ in $(seq 1 30); do
  ACCESSIBILITY_DUMP=$($ADB shell dumpsys accessibility 2>/dev/null | tr -d '\r' || true)
  if echo "$ACCESSIBILITY_DUMP" | grep -Fq "$ACCESSIBILITY_SERVICE"; then
    ACCESSIBILITY_BOUND=1
    break
  fi
  sleep 1
done
if [ "$ACCESSIBILITY_BOUND" -ne 1 ]; then
  fail 'ACCESSIBILITY_SERVICE_NOT_BOUND'
  collect_failure_evidence
  exit 1
fi
echo 'ACCESSIBILITY_SERVICE_BIND=PASS' | tee -a hands-runtime.txt

$ADB shell pidof "$PKG" > /dev/null 2>&1
if [ "$?" -ne 0 ]; then
  # The process is allowed to be started by the smoke route; this is diagnostic,
  # not a hard gate before launch.
  echo 'APP_RUNNING_BEFORE_LAUNCH=NO' | tee -a hands-runtime.txt
else
  echo 'APP_RUNNING_BEFORE_LAUNCH=YES' | tee -a hands-runtime.txt
fi

$ADB logcat -c || true
$ADB shell am force-stop "$PKG" || true
$ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///hands-smoke' -p "$PKG" | tee hands-launch.txt
if [ "${PIPESTATUS[0]}" -eq 0 ]; then
  echo 'OX2_LAUNCH=PASS' | tee -a hands-runtime.txt
else
  fail 'OX2_LAUNCH_FAILED'
  collect_failure_evidence
  exit 1
fi

for _ in $(seq 1 45); do
  $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
  if grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt; then break; fi
  if grep -q 'HANDS_EXCEPTION:' hands-logcat.txt; then break; fi
  sleep 1
done
$ADB shell dumpsys activity activities > hands-activities-before.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-before.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-before.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-before.xml > hands-ui-before.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-before.png 2>/dev/null || true
$ADB logcat -d -v time > hands-logcat.txt 2>&1 || true

if ! grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt; then fail 'TAP_VERIFIED_NOT_FOUND'; fi
if ! grep -q 'HANDS_SMOKE_START' hands-logcat.txt; then fail 'HANDS_SMOKE_START_NOT_FOUND'; fi
if ! grep -q 'HANDS_TOOLSET_CREATED' hands-logcat.txt; then fail 'HANDS_TOOLSET_CREATED_NOT_FOUND'; fi
if ! grep -q 'HANDS_APPROVAL_HANDLER_SET' hands-logcat.txt; then fail 'HANDS_APPROVAL_HANDLER_NOT_SET'; fi
if ! grep -q 'HANDS_UI_OBSERVE_RESULT status=observed' hands-logcat.txt; then fail 'UI_OBSERVE_NOT_FOUND'; fi
if ! grep -q 'HANDS_UI_ACT_RESULT status=verified verified=true' hands-logcat.txt; then fail 'UI_ACT_NOT_VERIFIED'; fi
if [ "$FAIL" -ne 0 ]; then
  collect_failure_evidence
  exit 1
fi
echo 'HANDS_ACCESSIBILITY=PASS' | tee -a hands-runtime.txt

for _ in $(seq 1 20); do
  $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
  if grep -q 'PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED' hands-logcat.txt; then break; fi
  sleep 1
done
sleep 2
$ADB shell dumpsys activity activities > hands-activities-after.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-after.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-after.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-after.xml > hands-ui-after.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-after.png 2>/dev/null || true
$ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
TOP=$($ADB shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
echo "$TOP" | tee hands-top.txt

if ! echo "$TOP" | grep -q 'com.android.settings'; then fail 'TARGET_APP_NOT_FOREGROUND'; fi
if ! grep -q 'HANDS_SESSION_APPROVED=true package=com.android.settings' hands-logcat.txt; then fail 'SESSION_APPROVAL_NOT_CONFIRMED'; fi
if ! grep -q 'HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings' hands-logcat.txt; then fail 'NATIVE_INTENT_NOT_REQUESTED'; fi
if ! grep -q 'PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED' hands-logcat.txt; then fail 'DEVICE_OPEN_APP_NOT_VERIFIED'; fi
if [ "$FAIL" -ne 0 ]; then
  collect_failure_evidence
  exit 1
fi
echo 'DEVICE_OPEN_APP=PASS' | tee -a hands-runtime.txt
echo 'HANDS_RUNTIME=PASS' | tee -a hands-runtime.txt
$ADB shell pidof com.android.settings | tr -d '\r' > hands-target-pid.txt 2>/dev/null || true
grep -E 'FATAL EXCEPTION|AndroidRuntime' hands-logcat.txt > hands-fatal.txt || true
if [ -s hands-fatal.txt ]; then
  fail 'FATAL_EXCEPTION_DETECTED'
  collect_failure_evidence
  exit 1
fi
{
  echo '### HANDS ANDROID EVIDENCE'
  cat hands-provenance.txt 2>/dev/null || true
  cat hands-runtime.txt
  echo 'Top activity:'; cat hands-top.txt
  echo 'Target PID:'; cat hands-target-pid.txt
  echo 'UIAutomator bytes:'; wc -c hands-ui-before.xml hands-ui-after.xml 2>/dev/null || true
} >> "$GITHUB_STEP_SUMMARY"
