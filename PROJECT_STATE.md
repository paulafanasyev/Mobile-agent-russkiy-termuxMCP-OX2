# PROJECT STATE — Mobile-agent-russkiy-termuxMCP-OX2

## Mission
Build and stabilize the Android application «Мобильный ИИ-агент» / Светлана. Active working copy: this repository. Do not modify upstream. Do not touch «Мир Самозанятых».

## Rules
- Never claim work is done without factual verification.
- Statuses: [VERIFIED], [PARTIALLY VERIFIED], [PENDING], [UNVERIFIED].
- Re-check after every change.
- Capability order: NO_PRIVILEGE → SHIZUKU_AVAILABLE → ROOT_AVAILABLE.
- Shizuku is not root.
- Offline baseline is required; online AI is additional.
- OmniRoute is external tooling only and must not be added to this project.

## Baseline
- Active repository: paulafanasyev/Mobile-agent-russkiy-termuxMCP-OX2. [VERIFIED]
- Server-side import completed. [VERIFIED]
- Upstream license: MIT. [VERIFIED]
- app.json: package ru.mirsamozanyatykh.mobileagent; version 2.1.1; Android versionCode 3. [VERIFIED from source]

## M0 — APK build
- Run 32653447415, commit 461f968f940041b8631ce05504de83da4df083b4. [VERIFIED]
- Android build job 97228468532: success. [VERIFIED]
- libbox build, validation, Expo prebuild, Gradle checks and assembleDebug all succeeded. [VERIFIED]
- Artifact: mobile-agent-russkiy-debug-apk. [VERIFIED]
- Artifact size: 169,313,200 bytes. [VERIFIED]
- Artifact SHA-256: 0eb608637aa77329ad6834b7a816c16f57fa0ced9eeb9826f16bf067417a12e7. [VERIFIED]
- M0 = ACHIEVED. [VERIFIED]

## M1 — APK static validation
- APK artifact downloaded and unpacked from artifact 9497279429. [VERIFIED]
- APK size: 458,315,137 bytes. [VERIFIED]
- ABI directories: arm64-v8a, armeabi-v7a, x86, x86_64. [VERIFIED]
- libbox.so present only under arm64-v8a. [VERIFIED]
- Binary AndroidManifest.xml contains package ru.mirsamozanyatykh.mobileagent and versionName 2.1.1. [VERIFIED]
- Binary versionCode 3: [PENDING] — not yet decoded from the AXML typed attribute; source app.json says 3.
- M1 manifest validation: [PARTIALLY VERIFIED].

## libbox ABI / graceful degradation audit
- Current build script does NOT call `gomobile bind -target=androidarm64`; it invokes sing-box `build_libbox` with `-target android -platform android/arm64`. [VERIFIED from scripts/build-libbox-android.sh]
- Current APK therefore contains libbox.so only in arm64-v8a. [VERIFIED from APK]
- Current `FirewallModule.kt` does not call `System.loadLibrary("box")`. [VERIFIED]
- Current `FirewallVpnService.kt` constructs `LibboxForwardingBridge` and only marks firewall RUNNING after a successful bridge result. [VERIFIED]
- Current `LibboxForwardingBridge.kt` checks `Class.forName("libbox.Libbox")`, but intentionally always returns `StartResult(false)` because the real PlatformInterface/OpenTun/CommandServer adapter is not wired yet. [VERIFIED]
- Therefore the previously suspected unconditional static `System.loadLibrary("box")` crash is NOT present in the current main branch. [VERIFIED]
- The actual current blocker is different: the firewall compatibility bridge does not start libbox and therefore cannot reach RUNNING. [VERIFIED]
- Non-arm64 graceful degradation is still [UNVERIFIED] at runtime; no real-device/emulator smoke test has been performed.

## Next
1. Complete binary versionCode decoding if needed.
2. Install APK on a real Android device and run smoke test.
3. Verify normal app launch independently of firewall.
4. Verify firewall prepare/start/status behavior and capture logcat.
5. Fix only issues demonstrated by runtime verification.
6. Then implement memory, voice, avatar FSM, capability-aware tools and diagnostics.

## fullstack-agent audit
Use architecture ideas only; do not copy AGPL code/text. Adopt independently: reactive avatar FSM, PTT-first voice, user data outside code, identity adoption, self-diagnostics, modular tool registry, honest offline/online separation.
