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
- APK artifact downloaded and unpacked. [VERIFIED]
- APK size: 458,315,137 bytes. [VERIFIED]
- ABI directories: arm64-v8a, armeabi-v7a, x86, x86_64. [VERIFIED]
- libbox.so present only under arm64-v8a. [VERIFIED]
- Manifest package/version/versionCode inside the binary APK: [PENDING] — no aapt/apkanalyzer available in the inspection environment.
- Real-device install and smoke test: [PENDING].

## Next
1. Complete binary manifest inspection.
2. Install APK on Android and run smoke test.
3. Fix only issues demonstrated by verification.
4. Then implement memory, voice, avatar FSM, capability-aware tools and diagnostics.

## fullstack-agent audit
Use architecture ideas only; do not copy AGPL code/text. Adopt independently: reactive avatar FSM, PTT-first voice, user data outside code, identity adoption, self-diagnostics, modular tool registry, honest offline/online separation.
