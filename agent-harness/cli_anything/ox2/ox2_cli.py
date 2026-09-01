"""Agent-native CLI for the OX2 Android mobile-agent repository."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import click


ALLOWED_ACTIONS = {
    "test": ["pnpm", "test"],
    "lint": ["pnpm", "lint"],
}


def _root() -> Path:
    # The harness is normally launched from the repository root.
    cwd = Path.cwd()
    if (cwd / "package.json").exists():
        return cwd
    raise click.ClickException("Run cli-anything-ox2 from the OX2 repository root.")


def _run(args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(args, cwd=_root(), text=True, capture_output=True)
    output = (proc.stdout + proc.stderr).strip()
    return proc.returncode, output


@click.group()
@click.option("--json", "as_json", is_flag=True, help="Emit machine-readable JSON.")
@click.pass_context
def main(ctx: click.Context, as_json: bool) -> None:
    """Control and inspect the OX2 project through a stable agent interface."""
    ctx.ensure_object(dict)
    ctx.obj["json"] = as_json


def _emit(ctx: click.Context, payload: dict) -> None:
    if ctx.obj["json"]:
        click.echo(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        click.echo(payload.get("message", json.dumps(payload, ensure_ascii=False)))


@main.command("info")
@click.pass_context
def info(ctx: click.Context) -> None:
    """Return project identity and supported safe operations."""
    root = _root()
    package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    _emit(ctx, {
        "ok": True,
        "project": package.get("name"),
        "version": package.get("version"),
        "package_manager": package.get("packageManager"),
        "framework": "Expo 57 / React Native 0.86",
        "operations": ["info", "status", "test", "lint"],
        "message": f"OX2 {package.get('version')} — {package.get('name')}",
    })


@main.command("status")
@click.pass_context
def status(ctx: click.Context) -> None:
    """Read git status without changing the working tree."""
    code, output = _run(["git", "status", "--short", "--branch"])
    _emit(ctx, {"ok": code == 0, "exit_code": code, "git_status": output, "message": output or "clean"})


@main.command("test")
@click.pass_context
def test(ctx: click.Context) -> None:
    """Run the project's Vitest suite."""
    code, output = _run(ALLOWED_ACTIONS["test"])
    _emit(ctx, {"ok": code == 0, "exit_code": code, "command": ALLOWED_ACTIONS["test"], "output": output, "message": output})
    if code:
        raise click.exceptions.Exit(code)


@main.command("lint")
@click.pass_context
def lint(ctx: click.Context) -> None:
    """Run the project's Expo lint command."""
    code, output = _run(ALLOWED_ACTIONS["lint"])
    _emit(ctx, {"ok": code == 0, "exit_code": code, "command": ALLOWED_ACTIONS["lint"], "output": output, "message": output})
    if code:
        raise click.exceptions.Exit(code)


if __name__ == "__main__":
    main()
