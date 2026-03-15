# Evaluation

Scores RAG and GraphRAG responses using the [Azure AI Evaluation SDK](https://learn.microsoft.com/python/api/overview/azure/ai-evaluation-readme).

## Evaluators

| Evaluator        | What it measures                                        | Phase |
| ---------------- | ------------------------------------------------------- | ----- |
| **Relevance**    | Does the response address the query?                    | Quick |
| **Coherence**    | Is the response well-structured and readable?           | Quick |
| **Groundedness** | Is the response supported by the retrieved context?     | Full  |
| **Similarity**   | How close is the response to the ground truth?          | Full  |
| **Retrieval**    | Does the retrieved context support answering the query? | Full  |

All scores are on a 1–5 scale, normalized to 0–100% in the UI.

## Structure

```
eval/
  data/
    eval_dataset.json       # Golden dataset (query, response, context, ground_truth)
    eval_dataset.jsonl       # JSONL version for SDK batch eval
    answers/                 # 20 reference answer files
  results/                   # Output from eval runs
  src/
    evaluators.py            # Shared evaluator builder (used by batch script)
    run_eval_batch.py        # Batch eval on pre-built JSONL dataset
    run_eval.py              # Live pipeline runner (RAG vs GraphRAG comparison)
    process_dataset.py       # Builds eval_dataset.json from raw answers + parquet
    convert_to_jsonl.py      # Converts eval_dataset.json → .jsonl
```

## Usage

### Batch eval (score existing dataset)

```bash
cd eval
uv run python src/run_eval_batch.py
```

### Live pipeline eval (run queries + score)

```bash
cd eval
uv run python src/run_eval.py --pipeline both
```

### Server integration

The server exposes two phased eval endpoints at `/api/evaluate/`:

- **`POST /quick`** — Relevance + Coherence (fires per-pipeline as soon as streaming completes)
- **`POST /full`** — Groundedness + Similarity + Retrieval (fires once both pipelines finish)

## Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```
AZURE_OPENAI_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.openai.azure.com/
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.cognitiveservices.azure.com/
```

The `AZURE_AI_SEARCH_ENDPOINT` is only needed if running the live RAG pipeline via `run_eval.py`.

_This documentation was generated with the help of AI_
