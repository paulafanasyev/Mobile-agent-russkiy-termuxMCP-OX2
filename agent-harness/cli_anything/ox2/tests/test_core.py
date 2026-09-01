from pathlib import Path


def test_harness_layout() -> None:
    root = Path(__file__).resolve().parents[4]
    assert (root / "package.json").exists()
    assert (root / "agent-harness" / "setup.py").exists()


def test_allowed_actions_are_fixed() -> None:
    from cli_anything.ox2.ox2_cli import ALLOWED_ACTIONS

    assert ALLOWED_ACTIONS["test"] == ["pnpm", "test"]
    assert ALLOWED_ACTIONS["lint"] == ["pnpm", "lint"]
