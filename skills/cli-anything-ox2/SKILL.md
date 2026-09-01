---
name: cli-anything-ox2
description: Use this skill when an agent needs to inspect or verify the OX2 Android mobile-agent repository through its agent-native CLI.
---

# CLI-Anything OX2

The OX2 project has an agent-native CLI harness at `agent-harness/`.

## Preconditions

Run commands from the OX2 repository root. Install the harness with:

```bash
pip install -e agent-harness
```

## Commands

- `cli-anything-ox2 info` — project identity and supported operations.
- `cli-anything-ox2 status` — read-only Git working-tree status.
- `cli-anything-ox2 test` — run the project's Vitest suite.
- `cli-anything-ox2 lint` — run the project's Expo lint suite.
- Add `--json` before the command for structured machine-readable output.

## Safety contract

Do not add an arbitrary shell/exec command to this harness. New operations must be explicit, reviewed, deterministic, and represented as a fixed argv list.

## Verification rule

A green harness installation is not evidence that Android runtime behavior works. Runtime readiness still requires the project's existing Android/emulator smoke workflows and artifact evidence.

## Upstream methodology

This harness follows the architecture described by HKUDS/CLI-Anything: stateful/one-shot CLI interfaces, JSON output, installed-command testing, and a generated skill document. See the upstream repository for the complete methodology:

https://github.com/HKUDS/CLI-Anything
