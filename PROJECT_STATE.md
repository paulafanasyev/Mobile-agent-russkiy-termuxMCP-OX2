# PROJECT STATE — Mobile-agent-russkiy-termuxMCP-OX2

## Mission
Build and stabilize the Android application «Мобильный ИИ-агент» / Светлана. This repository is the active OX Alpha working copy. Do not modify upstream. Do not touch «Мир Самозанятых».

## Rules
- Never claim work is done without factual verification.
- Use [VERIFIED], [PARTIALLY VERIFIED], [PENDING], [UNVERIFIED].
- Re-check after every change.
- Root is never assumed. Capability order: NO_PRIVILEGE → SHIZUKU_AVAILABLE → ROOT_AVAILABLE.
- Shizuku is not root.
- Offline baseline is required; online AI is additional.
- OmniRoute is external tooling only and must not be added to this project.

## Import / baseline
- Active repository: paulafanasyev/Mobile-agent-russkiy-termuxMCP-OX2.
- Upstream: paulafanasyev/Mobile-agent-russkiy-termuxMCP.
- Server-side import completed. [VERIFIED]
- MIT license present. [VERIFIED]
- Makefile blob SHA: 60012ccc6259e4ee3c1eff078a3afa771871fd29. [VERIFIED]
- modules/root-access/android/build.gradle blob SHA: 41a3fb981d928dd30d6184644d42469d213b8282. [VERIFIED]
- LICENSE blob SHA: d32312e99c05713d3c1774c73cdd9a9bba4335b6. [VERIFIED]
- app.json present; Android package ru.mirsamozanyatykh.mobileagent, version 2.1.1, versionCode 3. [VERIFIED]

## Critical path
1. Restore project memory — this file. [VERIFIED]
2. Replace the known broken root-access Android Gradle configuration. [PENDING]
3. Let Android CI run and inspect the actual job/log. [PENDING]
4. Fix only errors demonstrated by CI; repeat until APK is actually produced. [PENDING]
5. Only after M0 is stable, implement persistent memory, voice loop, avatar FSM, capability-aware tool registry, diagnostics, safe updates and separate identity.

## fullstack-agent audit
Use architecture ideas only; do not copy AGPL code/text. Adopt independently: reactive avatar FSM, PTT-first voice, user data outside code, identity adoption, self-diagnostics, modular tool registry, honest offline/online separation.

## Security
Never commit API keys, tokens, passwords or private credentials.
