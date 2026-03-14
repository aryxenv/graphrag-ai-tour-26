"""Eval pipeline: process → convert → validate in one command.

Usage:
    .venv/Scripts/python main.py
"""

import subprocess
import sys
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent
SRC_DIR = EVAL_DIR / "src"
PYTHON = sys.executable

STEPS = [
    ("Process dataset (answers + contexts + classify)", SRC_DIR / "process_dataset.py"),
    ("Convert to JSONL", SRC_DIR / "convert_to_jsonl.py"),
    ("Validate JSONL", SRC_DIR / "validate_jsonl.py"),
]


def main() -> None:
    for label, script in STEPS:
        print(f"\n{'=' * 60}")
        print(f"  {label}")
        print(f"  → {script.name}")
        print(f"{'=' * 60}\n")

        result = subprocess.run(
            [PYTHON, str(script)],
            cwd=str(EVAL_DIR),
        )
        if result.returncode != 0:
            print(f"\n✗ Step failed: {label}")
            sys.exit(result.returncode)

    print(f"\n{'=' * 60}")
    print("  All steps completed.")
    print(f"  Upload eval/eval_dataset.jsonl to Foundry.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
