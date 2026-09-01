# CLI-Anything OX2 Harness

This directory is the OX2-specific agent-native CLI layer inspired by HKUDS/CLI-Anything.

CLI-Anything's canonical methodology builds a stateful CLI harness with machine-readable output and tests. This OX2 harness applies that pattern to the Android/Expo project: it exposes safe, deterministic project inspection and verification operations without granting an agent an arbitrary shell.

## Install

From the repository root:

```bash
python -m venv .venv-cli-anything
. .venv-cli-anything/bin/activate
pip install -e agent-harness
```

## Usage

```bash
cli-anything-ox2 info
cli-anything-ox2 status
cli-anything-ox2 test
cli-anything-ox2 lint

cli-anything-ox2 --json info
cli-anything-ox2 --json status
```

Only fixed, reviewed commands are exposed. The harness does not accept arbitrary shell strings.

## Relation to upstream CLI-Anything

Upstream: https://github.com/HKUDS/CLI-Anything

The upstream project documents a seven-phase harness workflow and expects a generated `SKILL.md`. The OX2 skill is stored at `skills/cli-anything-ox2/SKILL.md`.
