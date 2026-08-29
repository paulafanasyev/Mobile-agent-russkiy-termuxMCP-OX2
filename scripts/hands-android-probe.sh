#!/usr/bin/env bash
set -euo pipefail

adb install -r "$GITHUB_WORKSPACE/hands-smoke.apk"
echo "INSTALL=PASS" | tee hands-runtime.txt

# Enable the real AccessibilityService; no mock bridge is allowed.
adb shell settings put secure accessibility_enabled 1
adb shell settings put secure enabled_accessibility_services 'ru.mirsamozanyatykh.mobileagent/expo.modules.accessibilityagent.OX2AccessibilityService'
echo "ACCESSIBILITY_SERVICE_ENABLED=PASS" | tee -a hands-runtime.txt

adb shell am start -W \
  -a android.intent.action.VIEW \
  -d 'mobile-agent://hands-smoke' \
  -p ru.mirsamozanyatykh.mobileagent
echo "OX2_LAUNCH=PASS" | tee -a hands-runtime.txt
sleep 4

adb shell dumpsys activity activities > hands-activities-after.txt
adb shell dumpsys window > hands-window-after.txt
adb shell uiautomator dump /sdcard/hands-ui.xml >/dev/null 2>&1 || true
adb shell cat /sdcard/hands-ui.xml > hands-ui.xml 2>/dev/null || true
adb logcat -d -v time > hands-logcat.txt

TOP=$(adb shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
echo "$TOP" | tee hands-top.txt

if echo "$TOP" | grep -q 'com.android.settings'; then
  echo 'DEVICE_OPEN_APP=PASS' | tee -a hands-runtime.txt
else
  echo 'DEVICE_OPEN_APP=FAIL' | tee -a hands-runtime.txt
  adb shell dumpsys activity activities | tail -120
  exit 1
fi

grep -q 'HANDS_SMOKE_START' hands-logcat.txt
grep -q 'HANDS_TOOLSET_CREATED' hands-logcat.txt
grep -q 'HANDS_APPROVAL_HANDLER_SET' hands-logcat.txt
grep -q 'ACCESSIBILITY_SERVICE_ENABLED=PASS' hands-runtime.txt
grep -q 'HANDS_UI_OBSERVE_RESULT status=observed' hands-logcat.txt
grep -q 'HANDS_UI_ACT_RESULT status=verified verified=true' hands-logcat.txt
grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt
grep -q 'HANDS_SESSION_APPROVED=true package=com.android.settings' hands-logcat.txt
grep -q 'HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings' hands-logcat.txt
grep -q 'PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED' hands-logcat.txt
echo 'HANDS_RUNTIME=PASS' | tee -a hands-runtime.txt

grep -q 'HANDS_ACTION_EXECUTED' hands-ui.xml
echo 'HANDS_UI=PASS' | tee -a hands-runtime.txt

adb shell pidof com.android.settings | tee hands-target-pid.txt
grep -E 'FATAL EXCEPTION|AndroidRuntime' hands-logcat.txt > hands-fatal.txt || true
test ! -s hands-fatal.txt

{
  echo '### HANDS ANDROID EVIDENCE'
  cat hands-provenance.txt
  cat hands-runtime.txt
  echo 'Top activity:'
  cat hands-top.txt
  echo 'Target PID:'
  cat hands-target-pid.txt
} >> "$GITHUB_STEP_SUMMARY"
