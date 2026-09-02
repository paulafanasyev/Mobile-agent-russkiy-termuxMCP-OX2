#!/usr/bin/env bash
set -u
ADB=adb
PKG=ru.mirsamozanyatykh.mobileagent
SERVICE="$PKG/expo.modules.accessibilityagent.OX2AccessibilityService"
FAIL=0
: > hands-runtime.txt
fail(){ echo "FAIL:$1" | tee -a hands-runtime.txt; FAIL=1; }
collect(){ $ADB shell dumpsys accessibility > hands-accessibility-dump.txt 2>&1 || true; $ADB shell dumpsys activity activities > hands-activities-failure.txt 2>&1 || true; $ADB shell dumpsys window > hands-window-failure.txt 2>&1 || true; $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true; }
pass(){ echo "$1=PASS" | tee -a hands-runtime.txt; }

if $ADB install -r "$GITHUB_WORKSPACE/hands-smoke.apk"; then pass H1_INSTALL; else fail H1_INSTALL; collect; exit 1; fi
$ADB shell pm grant "$PKG" android.permission.RECORD_AUDIO >/dev/null 2>&1 || true
if $ADB shell dumpsys package "$PKG" | tr -d '\r' | grep -Fq 'android.permission.RECORD_AUDIO'; then pass H2_RECORD_AUDIO; else fail H2_RECORD_AUDIO; fi

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
if [ "$ENABLED" = 1 ]; then pass H3_ACCESSIBILITY_ENABLED; else fail H3_ACCESSIBILITY_ENABLED; fi
if echo "$STATE" | grep -Fq "$SERVICE"; then pass H4_ACCESSIBILITY_SERVICE_ENABLED; else fail H4_ACCESSIBILITY_SERVICE_ENABLED; fi
BOUND=0
for _ in $(seq 1 30); do
  DUMP=$($ADB shell dumpsys accessibility 2>/dev/null | tr -d '\r' || true)
  if echo "$DUMP" | grep -Fq "$SERVICE"; then BOUND=1; break; fi
  sleep 1
done
if [ "$BOUND" = 1 ]; then pass H5_ACCESSIBILITY_SERVICE_BIND; else fail H5_ACCESSIBILITY_SERVICE_BIND; collect; exit 1; fi

$ADB logcat -c || true
$ADB shell am force-stop "$PKG" || true
if $ADB shell am start -W -a android.intent.action.VIEW -d 'mobile-agent:///hands-smoke' -p "$PKG" > hands-launch.txt 2>&1; then pass H6_OX2_HANDS_ROUTE; else fail H6_OX2_HANDS_ROUTE; collect; exit 1; fi

for _ in $(seq 1 60); do
  $ADB logcat -d -v time > hands-logcat.txt 2>&1 || true
  grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt && break
  grep -q 'HANDS_EXCEPTION:' hands-logcat.txt && break
  sleep 1
done
$ADB logcat -d -v time > hands-logcat.txt 2>&1 || true

# H7-H10 are application-side forensic markers. Do not infer them from UI alone.
grep -q 'HANDS_SMOKE_START' hands-logcat.txt && pass H7_HANDS_SMOKE_START || fail H7_HANDS_SMOKE_START
grep -q 'HANDS_TOOLSET_CREATED' hands-logcat.txt && pass H8_HANDS_TOOLSET_CREATED || fail H8_HANDS_TOOLSET_CREATED
grep -q 'HANDS_APPROVAL_GRANTED' hands-logcat.txt && pass H9_HANDS_APPROVAL_GRANTED || fail H9_HANDS_APPROVAL_GRANTED
grep -q 'PASS:REAL_ACCESSIBILITY_TAP_VERIFIED' hands-logcat.txt && pass H10_REAL_ACCESSIBILITY_TAP_VERIFIED || fail H10_REAL_ACCESSIBILITY_TAP_VERIFIED

$ADB shell dumpsys activity activities > hands-activities-before.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-before.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-before.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-before.xml > hands-ui-before.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-before.png 2>/dev/null || true

grep -q 'HANDS_OPEN_APP_RESULT status=launched_verified' hands-logcat.txt && pass H11_HANDS_OPEN_APP_RESULT || fail H11_HANDS_OPEN_APP_RESULT
grep -q 'HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings' hands-logcat.txt && pass H12_HANDS_NATIVE_INTENT_REQUESTED || fail H12_HANDS_NATIVE_INTENT_REQUESTED

TOP=$($ADB shell dumpsys activity activities | tr -d '\r' | grep -E 'mResumedActivity|topResumedActivity' | head -1 || true)
printf '%s\n' "$TOP" > hands-top.txt
$ADB shell dumpsys activity activities > hands-activities-after.txt 2>&1 || true
$ADB shell dumpsys window > hands-window-after.txt 2>&1 || true
$ADB shell uiautomator dump /sdcard/hands-ui-after.xml >/dev/null 2>&1 || true
$ADB shell cat /sdcard/hands-ui-after.xml > hands-ui-after.xml 2>/dev/null || true
$ADB exec-out screencap -p > hands-after.png 2>/dev/null || true
$ADB shell pidof com.android.settings | tr -d '\r' > hands-target-pid.txt 2>/dev/null || true
grep -E 'FATAL EXCEPTION|AndroidRuntime' hands-logcat.txt > hands-fatal.txt || true

if echo "$TOP" | grep -q 'com.android.settings'; then echo 'TARGET_FOREGROUND=PASS' | tee -a hands-runtime.txt; else fail TARGET_FOREGROUND; fi
if [ ! -s hands-fatal.txt ]; then echo 'NO_OX2_FATAL=PASS' | tee -a hands-runtime.txt; else fail NO_OX2_FATAL; fi
if [ "$FAIL" -ne 0 ]; then collect; exit 1; fi
echo 'HANDS_RUNTIME=PASS' | tee -a hands-runtime.txt
