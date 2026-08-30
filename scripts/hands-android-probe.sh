#!/usr/bin/env bash
set -euo pipefail
ADB='adb'
PKG='ru.mirsamozanyatykh.mobileagent'
ACCESSIBILITY_SERVICE="$PKG/expo.modules.accessibilityagent.OX2AccessibilityService"

$ADB install -r "$GITHUB_WORKSPACE/hands-smoke.apk"
echo 'INSTALL=PASS' | tee hands-runtime.txt
$ADB shell pm grant "$PKG" android.permission.RECORD_AUDIO 2>/dev/null || true
echo "RECORD_AUDIO_GRANT=$( $ADB shell dumpsys package "$PKG" | tr -d '\r' | grep 'android.permission.RECORD_AUDIO' | head -1 || true )" | tee -a hands-runtime.txt

# CI test-environment setup: enable the app's real AccessibilityService.
# Both the master accessibility switch and the exact service component must be enabled.
# This changes only the disposable emulator state; production code is untouched.
$ADB shell settings put secure accessibility_enabled 1
$ADB shell settings put secure enabled_accessibility_services "$ACCESSIBILITY_SERVICE"
ACCESSIBILITY_ENABLED=$($ADB shell settings get secure accessibility_enabled | tr -d '\r')
ACCESSIBILITY_STATE=$($ADB shell settings get secure enabled_accessibility_services | tr -d '\r')
echo "ACCESSIBILITY_ENABLED=$ACCESSIBILITY_ENABLED" | tee -a hands-runtime.txt
echo "ACCESSIBILITY_SERVICE_STATE=$ACCESSIBILITY_STATE" | tee -a hands-runtime.txt
test "$ACCESSIBILITY_ENABLED" = '1'
echo "$ACCESSIBILITY_STATE" | grep -Fq "$ACCESSIBILITY_SERVICE"
echo 'ACCESSIBILITY_SERVICE_ENABLED=PASS' | tee -a hands-runtime.txt

# settings writes are asynchronous on Android. Do not launch the smoke route until
# the system reports the service as installed/enabled; the app also has a retry gate.
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
  echo 'ACCESSIBILITY_SERVICE_BIND=FAIL' | tee -a hands-runtime.txt
  $ADB shell dumpsys accessibility > hands-accessibility-dump.txt 2>&1 || true
  exit 1
fi
echo 'ACCESSIBILITY_SERVICE_BIND=PASS' | tee -a hands-runtime.txt

$ADB logcat -c
# Empty host + /hands-smoke path: three slashes are intentional.
$ADB shell am force-stop "$PKG"
$ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///hands-smoke' -p "$PKG" | tee hands-launch.txt
echo 'OX2_LAUNCH=PASS' | tee -a hands-runtime.txt

for _ in $(seq 1 45); do
  $ADB logcat -d -v time > hands-logcat.txt
  grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt && break
  grep -q 'HANDS_EXCEPTION:' hands-logcat.txt && break
  sleep 1
done
$ADB shell dumpsys activity activities > hands-activities-before.txt
$ADB shell dumpsys window > hands-window-before.txt
$ADB shell uiautomator dump /sdcard/hands-ui-before.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-before.xml > hands-ui-before.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-before.png
$ADB logcat -d -v time > hands-logcat.txt

grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt
grep -q 'HANDS_SMOKE_START' hands-logcat.txt
grep -q 'HANDS_TOOLSET_CREATED' hands-logcat.txt
grep -q 'HANDS_APPROVAL_HANDLER_SET' hands-logcat.txt
grep -q 'HANDS_UI_OBSERVE_RESULT status=observed' hands-logcat.txt
grep -q 'HANDS_UI_ACT_RESULT status=verified verified=true' hands-logcat.txt
echo 'HANDS_ACCESSIBILITY=PASS' | tee -a hands-runtime.txt

for _ in $(seq 1 20); do
  $ADB logcat -d -v time > hands-logcat.txt
  grep -q 'PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED' hands-logcat.txt && break
  sleep 1
done
sleep 2
$ADB shell dumpsys activity activities > hands-activities-after.txt
$ADB shell dumpsys window > hands-window-after.txt
$ADB shell uiautomator dump /sdcard/hands-ui-after.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-after.xml > hands-ui-after.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-after.png
$ADB logcat -d -v time > hands-logcat.txt
TOP=$($ADB shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
echo "$TOP" | tee hands-top.txt
echo "$TOP" | grep -q 'com.android.settings'
echo 'DEVICE_OPEN_APP=PASS' | tee -a hands-runtime.txt
grep -q 'HANDS_SESSION_APPROVED=true package=com.android.settings' hands-logcat.txt
grep -q 'HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings' hands-logcat.txt
grep -q 'PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED' hands-logcat.txt
echo 'HANDS_RUNTIME=PASS' | tee -a hands-runtime.txt
$ADB shell pidof com.android.settings | tr -d '\r' > hands-target-pid.txt
grep -E 'FATAL EXCEPTION|AndroidRuntime' hands-logcat.txt > hands-fatal.txt || true
test ! -s hands-fatal.txt
{
  echo '### HANDS ANDROID EVIDENCE'
  cat hands-provenance.txt
  cat hands-runtime.txt
  echo 'Top activity:'; cat hands-top.txt
  echo 'Target PID:'; cat hands-target-pid.txt
  echo 'UIAutomator bytes:'; wc -c hands-ui-before.xml hands-ui-after.xml 2>/dev/null || true
} >> "$GITHUB_STEP_SUMMARY"
