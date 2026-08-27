# OX2 — Agent 2: Full Hands Audit

**Date:** 2026-08-27  
**Repository:** `paulafanasyev/Mobile-agent-russkiy-termuxMCP-OX2`  
**Audit branch:** `fix/hands-audit-2026-08-27`  
**Role:** independent critical verification  
**Status:** **NOT PASS / NOT RELEASE-READY**

## Executive conclusion

The project has a strong universal Hands model, but the implementation is **not yet proven to provide the requested maximum real phone control**. The 40-action vocabulary is present in `src/modules/hands/action-model.ts`, but the currently exposed Android Accessibility action contract implements only seven low-level UI actions (`tap`, `long_press`, `swipe`, `type`, `back`, `home`, `recents`). Therefore the existence of the 40-action TypeScript vocabulary must not be interpreted as proof that all 40 actions are executable on a real device.

Agent 2 must keep the release blocked until every claimed capability has a real execution path or is explicitly reported unavailable.

## Verified findings

### 1. Universal Hands vocabulary exists

`src/modules/hands/action-model.ts` defines 40 capabilities, including UI gestures, text/clipboard, global navigation, observation, device controls, communications, files, camera/media and custom tools.

**Disposition:** KEEP ALL 40. Do not reduce the vocabulary merely to match the current executor.

### 2. Planner was hardened

`src/modules/hands/planner.ts` now rejects empty goals, invalid action counts, disallowed policy decisions and actions without valid postconditions. It also clamps timeouts and assigns IDs/retry defaults.

**Disposition:** KEEP. Add executor/capability validation before a plan is accepted for runtime execution.

### 3. Verification was hardened

`src/modules/hands/verify.ts` rejects missing postconditions and contains a strict normalization boundary preventing an unverified native result from being treated as success.

**Disposition:** KEEP. Runtime must actually call this verification boundary; source existence alone is insufficient.

### 4. Centralized risk policy exists

`HANDS_ACTION_POLICY` covers all 40 actions and `actionPolicy()` provides a single source for risk/approval metadata.

**Disposition:** KEEP. Approval must remain enforced for external/destructive actions.

### 5. Real Accessibility bridge exists

`src/tools/executors/accessibility-executors.ts` calls the native Accessibility tree and native action functions. It observes the tree before and after execution and can return `verified` or `executed_unverified`.

**Critical note:** its causal verification currently requires both requested text/package transitions when both expectations are supplied. This may be too strict for a same-package action where only text/state changes. Verification should prove the requested postcondition, not require an unrelated package transition.

### 6. Current Accessibility action schema is only seven actions

`src/tools/accessibility-tools.ts` accepts only:
- tap
- long_press
- swipe
- type
- back
- home
- recents

This is the most important implementation gap found in this audit.

**Disposition:** expand the real executor/tool architecture while preserving the full 40-action Hands vocabulary. Do not fake support by merely adding names to a union.

### 7. Generic tool registry exists

`src/tools/registry.ts` provides registration, lookup, listing and duplicate protection. The registry is suitable as a boundary for real capability adapters, but the audit has not established a complete 40-capability registration/execution map.

**Disposition:** create an explicit capability-to-executor matrix and fail closed for missing adapters.

## Required capability matrix

Agent 2 must verify each capability end-to-end:

`launch_app`, `open_url`, `tap`, `double_tap`, `long_press`, `swipe`, `drag`, `type_text`, `clear_text`, `select_text`, `copy`, `paste`, `scroll`, `back`, `home`, `recents`, `wait`, `read_screen`, `screenshot`, `find_text`, `find_element`, `press_key`, `set_volume`, `set_brightness`, `toggle_flashlight`, `open_settings`, `set_alarm`, `create_calendar_event`, `call`, `send_sms`, `send_message`, `share`, `file_read`, `file_write`, `file_move`, `file_delete`, `file_rename`, `camera`, `play_media`, `pause_media`, `next_media`, `custom_tool`.

For every item record:

1. planner representation;
2. policy/risk;
3. approval requirement;
4. registered executor;
5. native Android/API call;
6. permission requirements;
7. actual device-side operation;
8. observation after execution;
9. postcondition verification;
10. failure behavior;
11. retry/replan behavior;
12. release APK coverage.

A capability is **PASS only when the complete chain is demonstrated**.

## Security/behavior requirements

- Never convert `executed_unverified` into `success`.
- Never report success solely because an Android API call returned without throwing.
- Destructive/external operations require explicit confirmation according to policy.
- Missing native executor must produce `unavailable`/unsupported behavior, not synthetic success.
- UI actions should prefer semantic Accessibility targets (`text`, `contentDescription`, `resourceId`, package) over blind coordinates when a semantic target is available.
- Coordinates must be validated against current screen bounds before execution.
- Re-observe after retries; do not repeat a stale coordinate action blindly.
- Communications, file deletion, external sharing and similar actions require strong postconditions and audit evidence.
- `custom_tool` must never become an unrestricted escape hatch around policy.

## Build findings

The previously reported Android resource error was valid: `android:description` must use a string resource. The branch contains the resource-reference form and a corresponding string resource.

The latest reported Gradle failure is a Kotlin compilation failure in `:expo:compileDebugKotlin`, but the visible excerpt contains mostly warnings and does not include the actual compiler diagnostic. Therefore Agent 2 must **not** claim that the warnings are the root cause. A fresh build log must capture the first actual Kotlin `e:` diagnostic.

## Release verification gate

Do not mark PASS from a green CI job alone.

Required evidence:

- exact commit SHA;
- exact release APK artifact;
- APK SHA-256;
- manifest/package verification;
- installation evidence;
- Accessibility Service enabled evidence;
- runtime UI dump;
- real Hands action evidence;
- before/after observations;
- postcondition evidence;
- crash count;
- process/focus evidence;
- release artifact, not debug artifact;
- complete 40-capability matrix with PASS/FAIL/INCONCLUSIVE.

## Current verdict

**HANDS STAGE: NOT ACCEPTED.**

The architecture is moving in the correct direction, and the maximum vocabulary is intentionally preserved. However, the implementation must still close the gap between the 40 universal capabilities and the actual Android execution layer. Until that gap is closed and demonstrated on the release artifact, any statement that the Hands can "do everything" would be unverified.

## Work already made on this audit branch

- Hardened Hands planner against unverifiable actions.
- Hardened verification against false success.
- Centralized action policy metadata.
- Corrected release smoke artifact selection toward the release APK.
- Corrected Android accessibility service description to a string resource.
- Added this independent Agent 2 audit report.
