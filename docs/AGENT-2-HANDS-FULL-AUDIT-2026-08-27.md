# OX2 — Agent 2: FULL HANDS / REAL PHONE CONTROL AUDIT

**Date:** 2026-08-27  
**Repository:** `paulafanasyev/Mobile-agent-russkiy-termuxMCP-OX2`  
**Branch under audit:** `fix/hands-audit-2026-08-27`  
**Role:** independent critical verification  
**Verdict:** **NOT PASS / NOT RELEASE-READY**

## 0. Executive verdict

The maximum Hands vocabulary MUST remain intact. The goal is not to reduce the system to the seven actions currently exposed by the low-level Accessibility tool. The goal is to connect the full universal Hands layer to real, permission-aware Android executors and verify every result on-device.

At this audit point the repository proves a universal 40-capability model and a real Android Accessibility bridge, but it does NOT yet prove end-to-end real execution of all 40 capabilities. Therefore Agent 2 must keep Hands blocked from PASS.

A green build, green unit tests, existence of a TypeScript union, or a native call returning without an exception is NOT proof of successful phone control.

## 1. Scope

Audit the complete path:

`voice/user intent → planner → Hands action model → policy → approval → capability registry → executor → native Android/API → real device operation → observation → postcondition verification → audit evidence → user-visible result`.

The audit includes `src/modules/hands/`, tool contracts/registry, Accessibility implementation, native Android module, release packaging, CI smoke tests and runtime evidence.

## 2. Universal 40-capability contract — KEEP ALL

The following vocabulary is the target maximum contract and must not be reduced merely because implementation is incomplete:

1. `launch_app`
2. `open_url`
3. `tap`
4. `double_tap`
5. `long_press`
6. `swipe`
7. `drag`
8. `type_text`
9. `clear_text`
10. `select_text`
11. `copy`
12. `paste`
13. `scroll`
14. `back`
15. `home`
16. `recents`
17. `wait`
18. `read_screen`
19. `screenshot`
20. `find_text`
21. `find_element`
22. `press_key`
23. `set_volume`
24. `set_brightness`
25. `toggle_flashlight`
26. `open_settings`
27. `set_alarm`
28. `create_calendar_event`
29. `call`
30. `send_sms`
31. `send_message`
32. `share`
33. `file_read`
34. `file_write`
35. `file_move`
36. `file_delete`
37. `file_rename`
38. `camera`
39. `play_media`
40. `pause_media`
41. `next_media`
42. `custom_tool`

**Important:** the source currently calls this a 40-capability model while the enumerated list above contains 42 entries. Agent 2 MUST reconcile this discrepancy in code and documentation rather than silently accepting the number. The exact authoritative set must be generated from one source of truth.

## 3. Current implementation findings

### F1 — Universal model exists

`src/modules/hands/action-model.ts` contains the broad Hands vocabulary covering UI, device, communication, files, camera/media and custom tools.

**Disposition:** KEEP maximum vocabulary.

### F2 — Low-level Accessibility contract is narrower

`src/tools/accessibility-tools.ts` currently validates only:
- `tap`
- `long_press`
- `swipe`
- `type`
- `back`
- `home`
- `recents`

This is not acceptable as proof of the universal Hands contract. It is acceptable as a low-level executor contract, provided the upper layer has explicit adapters for the remaining capabilities.

**Required:** expand through real adapters, not fake enum entries.

### F3 — Real native Accessibility bridge exists

`src/tools/executors/accessibility-executors.ts` calls native Accessibility functionality and obtains UI observations before/after execution. This is a real execution path for the supported low-level UI actions.

**Required:** prove the same standard for every additional capability.

### F4 — Registry exists but complete capability mapping is unproven

`src/tools/registry.ts` supports registration, lookup, listing and duplicate prevention. A complete 1:1 capability → executor map has not been proven.

**Required:** capability registry with explicit executor identity, permissions, risk, confirmation, timeout, verification and release coverage.

### F5 — Verification hardening exists

`src/modules/hands/verify.ts` rejects missing postconditions and prevents unverified native results from being reported as success.

**Required:** prove runtime always reaches this boundary.

### F6 — Planner hardening exists

`src/modules/hands/planner.ts` validates goals/action counts/policy and rejects unverifiable actions.

**Required:** plan acceptance must also validate that each action has an actually registered executor.

### F7 — Risk/approval centralization exists

The action policy is centralized across the universal action set.

**Required:** no executor or custom tool may bypass it.

### F8 — Accessibility verification can be too strict

If both expected text and expected package are supplied, verification must prove the requested state transition without demanding an unrelated package transition. Same-package actions are legitimate. Verification must be postcondition-oriented.

### F9 — CI release artifact selection needed correction

The smoke pipeline must inspect the release APK, not a debug artifact. Artifact identity and SHA-256 must be captured in evidence.

### F10 — Android resource issue

The Accessibility Service description must use a string resource reference. The corrected form and resource must be present in the audited branch.

### F11 — Latest Kotlin failure is not diagnosed by warnings

The reported `:expo:compileDebugKotlin` failure excerpt contains many warnings but no first compiler `e:` diagnostic. Agent 2 must not call those warnings the cause. A fresh build must capture the first actual error.

## 4. Mandatory 42-row capability matrix

The repository must maintain a generated/checked matrix with these columns:

`capability | model | policy | approval | executor | native/api | permission | device operation | before observation | after observation | postcondition | failure | retry/replan | release APK | evidence | verdict`

Initial status:

| # | Capability | Current audit verdict |
|---:|---|---|
| 1 | launch_app | INCONCLUSIVE — end-to-end proof required |
| 2 | open_url | INCONCLUSIVE — end-to-end proof required |
| 3 | tap | PARTIAL — real Accessibility path exists; device/release evidence required |
| 4 | double_tap | INCONCLUSIVE |
| 5 | long_press | PARTIAL — real low-level path exists; device/release evidence required |
| 6 | swipe | PARTIAL — real low-level path exists; device/release evidence required |
| 7 | drag | INCONCLUSIVE |
| 8 | type_text | PARTIAL — real low-level path exists; semantic target/release evidence required |
| 9 | clear_text | INCONCLUSIVE |
| 10 | select_text | INCONCLUSIVE |
| 11 | copy | INCONCLUSIVE |
| 12 | paste | INCONCLUSIVE |
| 13 | scroll | INCONCLUSIVE |
| 14 | back | PARTIAL — real low-level path exists; device/release evidence required |
| 15 | home | PARTIAL — real low-level path exists; device/release evidence required |
| 16 | recents | PARTIAL — real low-level path exists; device/release evidence required |
| 17 | wait | INCONCLUSIVE |
| 18 | read_screen | PARTIAL — Accessibility observation path exists; full Hands integration required |
| 19 | screenshot | INCONCLUSIVE |
| 20 | find_text | PARTIAL/INCONCLUSIVE — tree data exists; Hands-level executor proof required |
| 21 | find_element | PARTIAL/INCONCLUSIVE — tree data exists; Hands-level executor proof required |
| 22 | press_key | INCONCLUSIVE |
| 23 | set_volume | INCONCLUSIVE |
| 24 | set_brightness | INCONCLUSIVE |
| 25 | toggle_flashlight | INCONCLUSIVE |
| 26 | open_settings | INCONCLUSIVE |
| 27 | set_alarm | INCONCLUSIVE |
| 28 | create_calendar_event | INCONCLUSIVE |
| 29 | call | INCONCLUSIVE — approval and real telecom intent evidence required |
| 30 | send_sms | INCONCLUSIVE — approval and real SMS evidence required |
| 31 | send_message | INCONCLUSIVE — app-specific adapter/evidence required |
| 32 | share | INCONCLUSIVE — target/app/result verification required |
| 33 | file_read | INCONCLUSIVE |
| 34 | file_write | INCONCLUSIVE |
| 35 | file_move | INCONCLUSIVE |
| 36 | file_delete | INCONCLUSIVE — destructive action requires strong confirmation/postcondition |
| 37 | file_rename | INCONCLUSIVE |
| 38 | camera | INCONCLUSIVE |
| 39 | play_media | INCONCLUSIVE |
| 40 | pause_media | INCONCLUSIVE |
| 41 | next_media | INCONCLUSIVE |
| 42 | custom_tool | INCONCLUSIVE — must be registered, permissioned and policy-bound |

**No row may be promoted to PASS from source inspection alone.**

## 5. Required implementation architecture

### 5.1 One authoritative capability definition

Remove duplicate action vocabularies or make one generated from the other. The number must be mechanically derived; no stale "40" constant may disagree with the actual entries.

### 5.2 Capability registry

Every capability must resolve to a concrete adapter with:

- executor ID;
- input schema;
- permission requirements;
- risk level;
- confirmation requirement;
- timeout;
- retry policy;
- postcondition strategy;
- audit event type;
- release-test ID.

Missing adapter = `unsupported/unavailable`, never success.

### 5.3 Semantic UI targeting

If an Accessibility target is available, prefer:

`resourceId → contentDescription → exact/normalized text → package + class → bounds`

over blind coordinates.

Coordinates remain supported for maximum flexibility but must be bounds-checked against the current observed display and revalidated after a state change.

### 5.4 Real observation loop

For UI actions:

`observe → resolve target → execute → wait → observe → verify`

Retry must re-observe and resolve; it must never blindly replay stale coordinates.

### 5.5 Dangerous/external actions

Calls, SMS, messages, sharing, deletion and other external/destructive actions require confirmation according to policy and a strong postcondition.

### 5.6 Custom tools

`custom_tool` is not an unrestricted escape hatch. It must resolve through the same registry, policy, permission, confirmation, timeout and verification boundaries.

## 6. False-success gates

The following are mandatory failures:

- native API returns without exception but requested state did not occur;
- no postcondition exists;
- executor missing;
- accessibility disabled for an accessibility-dependent action;
- target no longer exists;
- coordinates outside current bounds;
- verification unavailable;
- observation contradicts expected result;
- runtime returns `executed_unverified` as user-visible success;
- custom tool bypasses policy.

## 7. Android/service gates

Verify:

1. Accessibility service declared correctly;
2. `android:description` references a resource;
3. string resource exists;
4. service starts;
5. service can obtain active window/root;
6. UI tree is non-empty where expected;
7. gestures execute;
8. global actions execute;
9. permissions are handled explicitly;
10. service failure is surfaced, not hidden.

## 8. Voice/Svetlana integration gate

The final system must prove:

`spoken command → speech recognition → agent intent → Hands plan → approval if needed → real executor → phone state change → observation → verification → spoken/user-visible confirmation`.

A chat response claiming that an action happened is not evidence that it happened.

## 9. Release gate

Agent 2 must receive evidence from the exact release artifact:

- commit SHA;
- workflow run URL;
- release APK artifact name;
- APK SHA-256;
- package name/version;
- install success;
- app launch;
- Accessibility enabled;
- process/focus evidence;
- UI dump;
- before/after screenshots or UI observations;
- real action evidence;
- postcondition evidence;
- crash count;
- no placeholder executor;
- capability matrix.

## 10. Build gate

The build is not PASS until:

- the first actual Kotlin compiler diagnostic is captured;
- all project-owned compile errors are fixed;
- warnings are separated from errors;
- release build succeeds;
- release artifact is the artifact under runtime testing.

## 11. Required negative tests

At minimum:

- no Accessibility permission;
- unsupported capability;
- missing executor;
- invalid target;
- stale target;
- out-of-bounds coordinates;
- failed postcondition;
- timeout;
- retry after changed screen;
- denied confirmation;
- custom tool attempting policy bypass;
- native exception;
- app crash during action;
- wrong package/state after action.

Expected result in all cases: honest failure/unavailable state, never synthetic success.

## 12. Current Agent 2 decision

**HANDS STAGE: NOT ACCEPTED.**

This is not a rejection of the maximum Hands design. The maximum design is explicitly retained. It is a rejection of claiming completion before the 40/42 capability discrepancy is resolved and every capability has a demonstrated real execution path.

## 13. Work already performed on audit branch

- Hands planner hardening.
- Verification false-success hardening.
- Centralized policy metadata.
- Release smoke artifact correction.
- Android Accessibility description resource correction.
- Expanded Agent 2 audit documentation.

## 14. Next mandatory engineering action

Build the authoritative capability registry and complete the capability-to-executor matrix. Then implement real adapters for missing capabilities, run compile/unit/integration checks, build the release APK, install it, enable Accessibility, execute representative and destructive Hands scenarios on-device, capture evidence, and only then request Agent 2 re-verification.
