"""Batch evaluation: RAG vs GraphRAG using Azure AI Evaluation SDK.

Runs each question through a pipeline, scores the output, and produces
an aggregated comparison table.

Usage:
    python src/run_eval.py --pipeline rag
    python src/run_eval.py --pipeline graphrag
    python src/run_eval.py --pipeline both          # default

Required env vars (add to eval/.env):
    AZURE_OPENAI_ENDPOINT
    AZURE_AI_SEARCH_ENDPOINT      # only for RAG pipeline
"""

import argparse
import asyncio
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
EVAL_DIR = Path(__file__).resolve().parent.parent
SERVER_DIR = EVAL_DIR.parent / "server"
DATASET_PATH = EVAL_DIR / "data" / "eval_dataset.jsonl"
RESULTS_DIR = EVAL_DIR / "results"

# Load env BEFORE importing server modules (they read env at module level)
load_dotenv(EVAL_DIR / ".env")

# Allow importing server/utils/*
sys.path.insert(0, str(SERVER_DIR))


# ── Citation parsing (for GraphRAG context extraction) ────────────────────────
_CITE_RE = re.compile(r"\[Data:\s*(Sources|Reports|Entities)\s*\(([^)]+)\)\]")


def _parse_citations(text: str) -> dict[str, set[int]]:
    cites: dict[str, set[int]] = {"Sources": set(), "Reports": set(), "Entities": set()}
    for m in _CITE_RE.finditer(text):
        for tok in m.group(2).split(","):
            tok = tok.strip()
            if tok.isdigit():
                cites[m.group(1)].add(int(tok))
    return cites


def _resolve_contexts(cites: dict[str, set[int]], tables: dict) -> list[str]:
    ctx: list[str] = []
    if cites["Sources"]:
        tu = tables["text_units"]
        for _, r in tu[tu["human_readable_id"].isin(cites["Sources"])].iterrows():
            ctx.append(r["text"].strip())
    if cites["Reports"]:
        cr = tables["community_reports"]
        for _, r in cr[cr["human_readable_id"].isin(cites["Reports"])].iterrows():
            ctx.append(r["summary"].strip())
    if cites["Entities"]:
        ent = tables["entities"]
        for _, r in ent[ent["human_readable_id"].isin(cites["Entities"])].iterrows():
            d = r.get("description", "")
            if d:
                ctx.append(d.strip())
    return ctx


# ── Pipeline: RAG ────────────────────────────────────────────────────────────
def run_rag_pipeline(query: str) -> dict:
    from utils.rag_query import _search, _get_openai_client

    results = _search(query)
    context = "\n\n---\n\n".join(r["content"] for r in results)

    client = _get_openai_client()
    completion = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant. Answer the user's question based on the "
                    "provided context. If the context doesn't contain enough information, "
                    "say so. Cite the source when possible."
                ),
            },
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
        ],
    )
    return {
        "response": completion.choices[0].message.content or "",
        "context": context,
    }


# ── Pipeline: GraphRAG ───────────────────────────────────────────────────────
def run_graphrag_pipeline(query: str, tables: dict) -> dict:
    from utils.graphrag_query import graphrag_query_stream, select_query_engine

    engine, _ = select_query_engine(query)

    async def _collect():
        chunks: list[str] = []
        async for chunk in graphrag_query_stream(query, engine):
            chunks.append(chunk)
        return "".join(chunks)

    import warnings

    loop = asyncio.new_event_loop()
    try:
        response_text = loop.run_until_complete(_collect())
    finally:
        # Cancel lingering tasks (litellm logging workers) before closing
        for task in asyncio.all_tasks(loop):
            task.cancel()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            loop.close()

    # Extract context from citations embedded in the response
    cites = _parse_citations(response_text)
    ctx_parts = _resolve_contexts(cites, tables)
    context = "\n\n---\n\n".join(ctx_parts) if ctx_parts else ""

    return {"response": response_text, "context": context}


# ── Evaluators ───────────────────────────────────────────────────────────────
def _build_evaluators() -> dict:
    from azure.ai.evaluation import (
        CoherenceEvaluator,
        GroundednessEvaluator,
        RelevanceEvaluator,
        SimilarityEvaluator,
    )

    credential = DefaultAzureCredential()
    model_config = {
        "azure_endpoint": os.environ["AZURE_OPENAI_ENDPOINT"],
        "azure_deployment": "gpt-4.1",
        "api_version": "2024-12-01-preview",
    }
    return {
        "groundedness": GroundednessEvaluator(
            model_config=model_config, credential=credential
        ),
        "relevance": RelevanceEvaluator(
            model_config=model_config, credential=credential
        ),
        "coherence": CoherenceEvaluator(
            model_config=model_config, credential=credential
        ),
        "similarity": SimilarityEvaluator(
            model_config=model_config, credential=credential
        ),
    }


def _score_one(
    evaluators: dict, *, query: str, response: str, context: str, ground_truth: str
) -> dict:
    """Run all evaluators on a single result (parallel). Returns flat scores dict."""
    scores: dict = {}

    def _safe(name, fn):
        try:
            return fn()
        except Exception as e:
            print(f"      WARN {name}: {e}")
            return {}

    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = {
            "groundedness": pool.submit(
                _safe,
                "groundedness",
                lambda: evaluators["groundedness"](
                    query=query, response=response, context=context
                ),
            ),
            "relevance": pool.submit(
                _safe,
                "relevance",
                lambda: evaluators["relevance"](query=query, response=response),
            ),
            "coherence": pool.submit(
                _safe,
                "coherence",
                lambda: evaluators["coherence"](query=query, response=response),
            ),
        }
        if ground_truth:
            futs["similarity"] = pool.submit(
                _safe,
                "similarity",
                lambda: evaluators["similarity"](
                    query=query, response=response, ground_truth=ground_truth
                ),
            )

    for result in futs.values():
        scores.update(result.result())

    return scores


# ── Aggregation ──────────────────────────────────────────────────────────────
def _aggregate(results: list[dict]) -> dict:
    scored = [r["scores"] for r in results if r.get("scores")]
    if not scored:
        return {}

    metric_names = sorted(
        {k for s in scored for k in s if isinstance(s[k], (int, float))}
    )
    agg = {}
    for m in metric_names:
        vals = [s[m] for s in scored if m in s and isinstance(s[m], (int, float))]
        if vals:
            agg[m] = round(sum(vals) / len(vals), 2)

    # Per-type breakdown
    by_type: dict[str, list] = {}
    for r in results:
        t = r.get("type", "unknown")
        by_type.setdefault(t, [])
        if r.get("scores"):
            by_type[t].append(r["scores"])

    agg["by_type"] = {}
    for t, t_scores in by_type.items():
        ta: dict = {}
        for m in metric_names:
            vals = [s[m] for s in t_scores if m in s and isinstance(s[m], (int, float))]
            if vals:
                ta[m] = round(sum(vals) / len(vals), 2)
        agg["by_type"][t] = ta

    return agg


def _print_comparison(rag_agg: dict, graphrag_agg: dict) -> None:
    print(f"\n{'=' * 65}")
    print("  COMPARISON: RAG vs GraphRAG (averages, 1‑5 scale)")
    print(f"{'=' * 65}")

    metrics = sorted(
        (set(rag_agg) | set(graphrag_agg)) - {"by_type"},
        key=lambda x: x,
    )
    print(f"\n  {'Metric':<30} {'RAG':>8} {'GraphRAG':>10} {'Δ':>8}")
    print(f"  {'-' * 58}")
    for m in metrics:
        rv = rag_agg.get(m)
        gv = graphrag_agg.get(m)
        rs = f"{rv:.2f}" if isinstance(rv, (int, float)) else "  N/A"
        gs = f"{gv:.2f}" if isinstance(gv, (int, float)) else "  N/A"
        delta = ""
        if isinstance(rv, (int, float)) and isinstance(gv, (int, float)):
            d = gv - rv
            delta = f"{d:+.2f}"
        print(f"  {m:<30} {rs:>8} {gs:>10} {delta:>8}")

    # Per-type
    types = sorted(
        set(list(rag_agg.get("by_type", {})) + list(graphrag_agg.get("by_type", {})))
    )
    for t in types:
        print(f"\n  ── {t} ──")
        ra = rag_agg.get("by_type", {}).get(t, {})
        ga = graphrag_agg.get("by_type", {}).get(t, {})
        for m in sorted(set(ra) | set(ga)):
            rv = ra.get(m)
            gv = ga.get(m)
            rs = f"{rv:.2f}" if isinstance(rv, (int, float)) else "  N/A"
            gs = f"{gv:.2f}" if isinstance(gv, (int, float)) else "  N/A"
            delta = ""
            if isinstance(rv, (int, float)) and isinstance(gv, (int, float)):
                delta = f"{gv - rv:+.2f}"
            print(f"    {m:<28} {rs:>8} {gs:>10} {delta:>8}")


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(description="Batch eval: RAG vs GraphRAG")
    parser.add_argument(
        "--pipeline",
        choices=["rag", "graphrag", "both"],
        default="both",
        help="Which pipeline(s) to evaluate (default: both)",
    )
    args = parser.parse_args()

    # Env-var check
    needed = ["AZURE_OPENAI_ENDPOINT"]
    if args.pipeline in ("rag", "both"):
        needed.append("AZURE_AI_SEARCH_ENDPOINT")
    missing = [v for v in needed if not os.environ.get(v)]
    if missing:
        print(f"ERROR: Missing env vars: {', '.join(missing)}")
        print(f"  Add them to {EVAL_DIR / '.env'}")
        sys.exit(1)

    if not DATASET_PATH.exists():
        print(f"ERROR: {DATASET_PATH} not found — run convert_to_jsonl.py first.")
        sys.exit(1)

    # Load dataset
    dataset: list[dict] = []
    with open(DATASET_PATH, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                dataset.append(json.loads(line))
    print(f"Loaded {len(dataset)} questions")

    # Build evaluators
    evaluators = _build_evaluators()
    print(f"Initialized {len(evaluators)} evaluators")

    # Load GraphRAG parquet tables if needed
    tables = None
    if args.pipeline in ("graphrag", "both"):
        out = SERVER_DIR / "output"
        print(f"Loading GraphRAG tables from {out} ...")
        tables = {
            "text_units": pd.read_parquet(out / "text_units.parquet"),
            "community_reports": pd.read_parquet(out / "community_reports.parquet"),
            "entities": pd.read_parquet(out / "entities.parquet"),
        }

    RESULTS_DIR.mkdir(exist_ok=True)

    pipelines: list[str] = []
    if args.pipeline in ("rag", "both"):
        pipelines.append("rag")
    if args.pipeline in ("graphrag", "both"):
        pipelines.append("graphrag")

    all_agg: dict[str, dict] = {}

    for pl in pipelines:
        print(f"\n{'=' * 60}")
        print(f"  EVALUATING: {pl.upper()}")
        print(f"{'=' * 60}")

        rows: list[dict] = []
        for i, row in enumerate(dataset):
            query = row["query"]
            gt = row.get("ground_truth", "")
            qtype = row.get("type", "unknown")
            print(f"\n  [{i + 1}/{len(dataset)}] {query[:72]}...")

            # ── Run pipeline ──
            try:
                if pl == "rag":
                    output = run_rag_pipeline(query)
                else:
                    output = run_graphrag_pipeline(query, tables)
                print(
                    f"    → response {len(output['response'])} chars, context {len(output['context'])} chars"
                )
            except Exception as e:
                print(f"    ✗ Pipeline error: {e}")
                rows.append(
                    {"query": query, "type": qtype, "error": str(e), "scores": {}}
                )
                continue

            # ── Score ──
            print("    Scoring...", end=" ", flush=True)
            scores = _score_one(
                evaluators,
                query=query,
                response=output["response"],
                context=output["context"],
                ground_truth=gt,
            )
            brief = {
                k: round(v, 1) if isinstance(v, float) else v for k, v in scores.items()
            }
            print(brief)

            rows.append(
                {
                    "query": query,
                    "type": qtype,
                    "response": output["response"],
                    "context_chars": len(output["context"]),
                    "scores": scores,
                }
            )

        # ── Aggregate & save ──
        agg = _aggregate(rows)
        all_agg[pl] = agg

        out_path = RESULTS_DIR / f"{pl}_results.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(
                {"pipeline": pl, "aggregated": agg, "questions": rows},
                f,
                indent=2,
                ensure_ascii=False,
                default=str,
            )
        print(f"\n  Saved → {out_path}")

        print(f"\n  {pl.upper()} averages:")
        for m, v in sorted(agg.items()):
            if m != "by_type" and isinstance(v, (int, float)):
                print(f"    {m}: {v}")

    # ── Side-by-side comparison ──
    if len(pipelines) == 2:
        _print_comparison(all_agg["rag"], all_agg["graphrag"])

    # ── Write combined summary for API consumption ──
    if len(pipelines) == 2:
        summary = {
            "rag": _format_summary(all_agg["rag"]),
            "graphrag": _format_summary(all_agg["graphrag"]),
        }
        summary_path = RESULTS_DIR / "comparison_summary.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        print(f"\n  API-ready summary → {summary_path}")


def _format_summary(agg: dict) -> dict:
    """Shape aggregated metrics into the API-friendly schema."""
    by_type = agg.pop("by_type", {})
    out: dict = {
        "overall": {k: v for k, v in agg.items() if isinstance(v, (int, float))},
    }
    for t, t_scores in by_type.items():
        out[t] = {k: v for k, v in t_scores.items() if isinstance(v, (int, float))}
    agg["by_type"] = by_type  # restore
    return out


if __name__ == "__main__":
    main()
