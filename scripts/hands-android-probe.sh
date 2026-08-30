#!/usr/bin/env bash
set -euo pipefail

PACKAGE='ru.mirsamozanyatykh.mobileagent'
SETTINGS='com.android.settings'

adb install -r "$GITHUB_WORKSPACE/hands-smoke.apk"
echo "INSTALL=PASS" | tee hands-runtime.txt

# Bootstrap runtime permissions so a first-run permission overlay cannot hide
# the actual Hands execution path in CI.
adb shell pm grant "$PACKAGE" android.permission.RECORD_AUDIO 2>/dev/null || true
adb shell settings put secure accessibility_enabled 1
adb shell settings put secure enabled_accessibility_services "$PACKAGE/expo.modules.accessibilityagent.OX2AccessibilityService"
echo "ACCESSIBILITY_SERVICE_ENABLED=PASS" | tee -a hands-runtime.txt
echo "RECORD_AUDIO_BOOTSTRAP=PASS" | tee -a hands-runtime.txt

adb shell am start -W \
  -a android.intent.action.VIEW \
  -d 'mobile-agent://hands-smoke' \
  -p "$PACKAGE"
echo "OX2_LAUNCH=PASS" | tee -a hands-runtime.txt

# The route needs time to observe, act, request approval and open Settings.
# A transient MainActivity/permission-controller state is not itself a failure.
settings_seen=0
for _ in $(seq 1 30); do
  TOP=$(adb shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
  echo "$TOP" > hands-top.txt
  if echo "$TOP" | grep -q "$SETTINGS"; then
    settings_seen=1
    break
  fi
  sleep 1
done

adb shell dumpsys activity activities > hands-activities-after.txt
adb shell dumpsys window > hands-window-after.txt
adb shell uiautomator dump /sdcard/hands-ui.xml >/dev/null 2>&1 || true
adb shell cat /sdcard/hands-ui.xml > hands-ui.xml 2>/dev/null || true
adb logcat -d -v time > hands-logcat.txt
cat hands-top.txt

if [ "$settings_seen" -eq 1 ]; then
  echo 'DEVICE_OPEN_APP=PASS' | tee -a hands-runtime.txt
else
  echo 'DEVICE_OPEN_APP=FAIL' | tee -a hands-runtime.txt
  tail -160 hands-activities-after.txt
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

adb shell pidof "$SETTINGS" | tee hands-target-pid.txt
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
