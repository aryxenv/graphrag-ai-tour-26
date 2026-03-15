"""Convert eval_dataset.json → eval_dataset.jsonl (Foundry-ready format).

Each line has exactly: query, ground_truth, response, context
Matches the schema expected by Azure AI Foundry evaluation uploads.
"""

import json
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent.parent
INPUT_PATH = EVAL_DIR / "data" / "eval_dataset.json"
OUTPUT_PATH = EVAL_DIR / "data" / "eval_dataset.jsonl"


def main() -> None:
    with open(INPUT_PATH, encoding="utf-8") as f:
        dataset = json.load(f)

    written = 0
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for entry in dataset:
            if not entry.get("ground_truth"):
                continue
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            written += 1

    print(f"Wrote {written} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
