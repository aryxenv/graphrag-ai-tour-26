import os
from pathlib import Path
import json

from azure.ai.evaluation import evaluate
from evaluators import build_evaluators
from azure.identity import DefaultAzureCredential
from dotenv import load_dotenv

EVAL_DIR = Path(__file__).resolve().parent.parent

load_dotenv(EVAL_DIR / ".env")
output_path = EVAL_DIR / "results" / "eval_results.json"
output_path.parent.mkdir(exist_ok=True)
DATASET_PATH = EVAL_DIR / "data" / "eval_dataset.jsonl"

model_config = {
    "azure_endpoint": os.environ["AZURE_OPENAI_ENDPOINT"],
    "azure_deployment": "gpt-4.1",
    "api_version": "2024-12-01-preview",
}
credential = DefaultAzureCredential()

results = evaluate(
    data=str(DATASET_PATH),
    evaluators=build_evaluators(model_config, credential),
)

print("=== Evaluation Metrics ===")
for key, value in results.get("metrics", {}).items():
    print(f"  {key}: {value}")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump({"metrics": results.get("metrics", {}), "rows": results.get("rows", [])}, f, indent=2)
print(f"\nDetailed results saved to {output_path}")
