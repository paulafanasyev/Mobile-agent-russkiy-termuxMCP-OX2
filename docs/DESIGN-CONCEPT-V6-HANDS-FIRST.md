# OX2 Design Concept v6 — Hands First

**Status:** DESIGN BASELINE — no APK build is authorized at this stage.

## 1. Product principle

OX2 is not a chat wrapper. Светлана is the user-facing agent/orchestrator; Hands is the controlled execution layer that lets the agent act on Android. The UI must make this distinction visible without exposing implementation complexity.

The primary user mental model is:

> **Скажи задачу → Светлана понимает → показывает, что собирается сделать → выполняет разрешённые действия → проверяет результат → сообщает результат.**

No action is reported as completed merely because a native call returned. Completion requires a verifiable postcondition when one is available.

## 2. First-run / home experience

The first route must be Светлана's real home, not a placeholder or diagnostic screen.

Home hierarchy:

1. Светлана avatar/status — visible, calm, reactive.
2. One primary conversation surface.
3. One primary voice/hold-to-talk control.
4. Compact capability/status rail: AI provider, Hands availability, network/offline state.
5. Recent tasks / active task card only when useful.
6. Secondary navigation for Library, Tasks, Connections and Settings.

The UI must never imply that an offline model is bundled if it is not. The default state is cloud/remote AI when configured, with offline AI explicitly shown as an optional downloaded capability.

## 3. Visual language

### Light theme (default)
- Warm near-white canvas rather than pure white.
- High-contrast charcoal text.
- One restrained violet/indigo accent associated with Светлана.
- Large rounded surfaces, subtle elevation, no dense dashboard chrome.
- Native Android spacing and touch targets; minimum 44dp interactive target.

### Dark theme
- Deep graphite canvas, not absolute black.
- Same accent family with reduced saturation.
- Elevated cards differentiated by luminance, not borders everywhere.

### Motion
- Avatar has three primary states: idle, listening, working.
- Tool execution uses a short progress transition and a compact action card.
- Avoid perpetual animation that consumes battery or distracts from the task.

## 4. Hands interaction contract

Hands is a safety-critical execution subsystem. Every execution path must be explicit:

`LLM/tool-call → policy → approval → native executor → BEFORE observation → action → AFTER observation → postcondition verification → result/audit`

A successful native invocation without verification is **executed_unverified**, never **verified**.

### Required capabilities

| Capability | Required implementation | Verification requirement |
|---|---|---|
| Observe UI | Accessibility tree | fresh tree + package/activity |
| Tap | Accessibility node/gesture | expected UI transition when requested |
| Long press | Accessibility gesture | expected transition when requested |
| Swipe/scroll | Accessibility gesture | resulting tree/position evidence |
| Type text | focused/editable node | resulting text or explicit unverified status |
| Back/Home/Recents | Android global action | foreground package/activity transition |
| Open app | package launch | foreground package transition |
| Find text | tree query | exact match, not substring proof |
| Find element | resource/content-description/text query | stable node identity |
| Read screen | tree + focused node | fresh observation |
| Screenshot | real Android screenshot provider | actual capture metadata |
| File read/write/move/delete/rename | SAF/workspace layer | filesystem result + policy |
| Share/send/call | Android intent layer | launch/result state; destructive/external actions require approval |
| Settings | explicit Android intents | foreground package transition |
| Volume/brightness/flashlight | native system APIs | read-back where API permits |
| Calendar/alarm | Android APIs | created object/result identifier |
| Media | media/session APIs | playback state read-back where available |
| MCP tools | MCP runtime | tool result + audit record |
| TermuxMCP | controlled bridge | policy + command result + cancellation |

Unsupported capabilities must return `unavailable/unsupported`, never a simulated success.

## 5. Approval model

Approval is evaluated at the execution boundary, not only in UI.

- `observe` may be technically read-only, but the current OX2 safety contract requires an explicit approval decision before exposing the native UI observation tool to an agent. This must remain consistent between tool metadata, runtime enforcement and tests.
- Action tools require approval unless covered by a user-created policy.
- High/critical risk actions require explicit confirmation immediately before execution unless the user has deliberately configured an equivalent policy.
- Session approval must be scoped to the intended package/capability and must not silently authorize unrelated actions.
- Rejected/aborted operations must not call the native executor.

## 6. Causal verification rules

For `expectedText`:

- trim the expectation once;
- empty/whitespace expectation is invalid;
- compare exact text/content-description with `===`;
- a pre-existing matching node is not proof of a new action;
- surrounding/partial text is not proof.

For `expectedPackage`:

- the package must be the foreground package after the action;
- when causal verification is requested, the foreground package must transition from the BEFORE state.

For both:

- BEFORE is captured before the native action;
- AFTER is captured after the native action and wait interval;
- both expectations must be satisfied;
- failed native action forces `verified=false`;
- no expectation means `verified=false` unless a different explicit postcondition verifier exists.

## 7. Provider/runtime separation

Provider identity and model identity are separate records. The UI may display `Провайдер · Модель`, but runtime selection must preserve both IDs.

Required providers/catalog entries to audit independently:

- MiniMax M3 Free
- MiniMax M2.7 Free
- MiniMax M2 Free
- AnyModel
- GoRouter
- OpenRouter
- Z.ai
- OpenAI-compatible profiles

No provider is considered working from a catalog entry alone. Runtime evidence must show the actual selected provider, model and request path.

## 8. Offline architecture

The installed APK must not contain a large default LLM model.

Offline support is on-demand:

`catalog → device compatibility check → user chooses model → download/resume/checksum → persistent storage → explicit enable → runtime`

The default startup path must not initialize or load a model that the user has not downloaded/enabled.

LiteRT and llama.cpp are separate backend paths. They must not be mixed into a single runtime decision or represented as one interchangeable implementation without a real adapter.

## 9. Светлана voice chain

Voice is a first-class interface, not a decorative screen:

`microphone permission → speech recognition/input → orchestrator → provider/runtime → response → TTS/audio engine → avatar state`

PTT-first is the baseline for reliability and privacy. Background/listening modes must be explicit user choices.

## 10. MCP / TermuxMCP

MCP connections are capabilities, not unconditional privileges. Each connected server exposes a typed tool set subject to the same policy/audit boundary as built-in tools.

Long-running commands need cancellation and bounded loops. `/loop` must have explicit time/iteration limits and a user stop path.

## 11. Diagnostics and truthfulness

All user-visible capability badges derive from runtime capability checks. Never show `Работает` solely because a module exists in the bundle.

Recommended states:

- `Готово` — runtime verified for the capability.
- `Требуется разрешение` — Android/user permission missing.
- `Не настроено` — configuration absent.
- `Недоступно` — platform/backend does not support it.
- `Проверяется` — runtime probe in progress.
- `Ошибка` — real failure with recoverable next step.

## 12. Release gate — intentionally blocked for now

No debug/release APK build is authorized until all of the following are true:

1. Hands native action surface is implemented for the intended scope.
2. Approval boundary is proven by negative tests and source tracing.
3. Causal verification is proven for text and package transitions.
4. Светлана startup route is the real product home.
5. Design system is applied to the main flow and settings surfaces.
6. Provider/model routing is separated and verified statically.
7. Offline model is opt-in/on-demand and not bundled as the default LLM.
8. `pnpm test` and `pnpm exec tsc --noEmit` are green on the same commit.
9. Only then: clean Expo prebuild → Android build → install → launch → Hands emulator/device smoke → artifact inspection.

Until this gate is explicitly satisfied, an APK build is a **forbidden validation step**, not a progress metric.
