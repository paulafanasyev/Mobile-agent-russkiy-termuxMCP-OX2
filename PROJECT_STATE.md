# PROJECT STATE — Mobile-agent-russkiy-termuxMCP-OX2

## Mission
Build and stabilize the Android application «Мобильный ИИ-агент» / Светлана. Active working copy: this repository. Do not modify upstream. Do not touch «Мир Самозанятых».

## Rules
- Never claim work is done without factual verification.
- Statuses: [VERIFIED], [PARTIALLY VERIFIED], [PENDING], [UNVERIFIED].
- Re-check after every change.
- Every load-bearing code claim records the exact file path.
- Capability order: NO_PRIVILEGE → SHIZUKU_AVAILABLE → ROOT_AVAILABLE.
- Shizuku is not root.
- Offline baseline is required; online AI is additional.
- OmniRoute is external tooling only and must not be added to this project.
- **NEW RELEASE RULE:** Do not start an APK build merely to discover whether the project builds. First finish the intended Hands execution layer and product design. APK build is a final validation stage after those gates are satisfied.

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
- M0 = ACHIEVED for that historical commit. It is not evidence that the current HEAD builds.

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
- Active `FirewallModule.kt` path: `modules/firewall/android/src/main/java/expo/modules/firewall/FirewallModule.kt`; it does not call `System.loadLibrary("box")`. [VERIFIED]
- `FirewallVpnService.kt` at `modules/firewall/android/src/main/java/expo/modules/firewall/FirewallVpnService.kt` constructs `LibboxForwardingBridge` and only marks firewall RUNNING after a successful bridge result. [VERIFIED]
- `LibboxForwardingBridge.kt` at `modules/firewall/android/src/main/java/com/mobileshell/firewall/LibboxForwardingBridge.kt` checks `Class.forName("libbox.Libbox")`, but intentionally always returns `StartResult(false)` because the real PlatformInterface/OpenTun/CommandServer adapter is not wired yet. [VERIFIED]
- Therefore the previously suspected unconditional static `System.loadLibrary("box")` crash is NOT present in the current main branch. [VERIFIED]
- The actual current firewall blocker is the incomplete compatibility bridge, not a proven build/runtime crash. [VERIFIED]
- Non-arm64 graceful degradation is still [UNVERIFIED] at runtime; no real-device/emulator smoke test has been performed.

## Current stage — HANDS FIRST / DESIGN FIRST
- Branch: `agent1/hands-design-v1`.
- Design baseline: `docs/DESIGN-CONCEPT-V6-HANDS-FIRST.md`. [VERIFIED from branch]
- Current Hands vocabulary declares many action types, but the native/UI tool surface currently exposes only a small subset. [VERIFIED from `src/modules/hands/action-model.ts`, `src/tools/bridge.ts`]
- Current accessibility native module implements: UI tree snapshot, tap, long press, swipe, type, back, home, recents. [VERIFIED from `modules/accessibility-agent/android/src/main/java/expo/modules/accessibilityagent/OX2AccessibilityService.kt` and `AccessibilityAgentModule.kt`]
- Current JS bridge exposes: `device.apps.list`, `device.open_app`, `device.files.read`, `device.ui.observe`, `device.ui.act`. [VERIFIED from `src/tools/bridge.ts`]
- Therefore Hands is **not yet complete** for the declared universal action vocabulary. Do not call it complete until the intended supported actions have real adapters and end-to-end verification.
- Current `src/app/(root)/index.tsx` routes the first screen to `/svetlana`. [VERIFIED]
- Current `/svetlana` screen is a dark, voice-centric surface but is still a first implementation rather than the final v6 design system. [VERIFIED from `src/app/(root)/svetlana.tsx`]

## Build gate — BLOCKED BY DESIGN, INTENTIONALLY
No debug/release APK build should be launched until all gates below are met on the same commit:

1. Hands scope is implemented as real native/runtime adapters, with unsupported operations explicitly reported rather than simulated.
2. Approval is enforced at the execution boundary and covered by negative tests.
3. Causal verification is proven for text/content-description and foreground-package transitions.
4. Светлана startup and core task flow use the final design system.
5. Provider/model routing is explicitly separated; no provider/model is claimed working from catalog presence alone.
6. Offline LLM is opt-in/on-demand; no large default model is bundled or initialized at startup.
7. LiteRT and llama.cpp remain separate runtime paths.
8. `pnpm test` and `pnpm exec tsc --noEmit` pass on the exact release candidate commit.
9. Only after gates 1–8: clean Expo prebuild, Android debug build, install, launch, Hands emulator/device smoke, and artifact inspection.

### Important distinction
The recent CI failures in the working history are evidence of defects in the current development state, but they are **not a reason to rush another APK build**. We first close the functional/design gates; then the APK build is run once as a controlled release validation.

## Next actions
1. Complete the Hands adapter/approval/verification chain for the intended action scope.
2. Expand native Android capabilities where a real Android API/module is required.
3. Integrate Hands into Светлана's task orchestration rather than leaving it as isolated tools.
4. Apply Design Concept v6 to Светлана, task execution, permissions and settings.
5. Add/strengthen tests for the real execution boundary and causal verification.
6. Re-run unit/type checks on the branch/PR.
7. Agent 2 performs adversarial review from the resulting evidence.
8. Only after Agent 2 accepts the functional/design gate: build APK and perform runtime validation.

## fullstack-agent audit
Use architecture ideas only; do not copy AGPL code/text. Adopt independently: reactive avatar FSM, PTT-first voice, user data outside code, identity adoption, self-diagnostics, modular tool registry, honest offline/online separation.
