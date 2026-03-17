"""Evaluate endpoint — phased scoring using Azure AI Evaluation.

Phase 1 (quick):  Relevance + Coherence — runs immediately after a response finishes.
Phase 2 (full):   Groundedness + Similarity + Retrieval — requires both pipelines done.
                  GraphRAG response is used as ground_truth for similarity scoring.
"""

import os
import re
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from azure.ai.evaluation import (
    CoherenceEvaluator,
    GroundednessEvaluator,
    RelevanceEvaluator,
    RetrievalEvaluator,
    SimilarityEvaluator,
)
from azure.identity import DefaultAzureCredential
from fastapi import APIRouter
from pydantic import BaseModel, Field

from utils.rag_query import _search

router = APIRouter(prefix="/api/evaluate", tags=["evaluate"])

_credential = DefaultAzureCredential()

# ── Citation parsing for GraphRAG responses ───────────────────────────────────
_CITE_RE = re.compile(r"\[Data:\s*(Sources|Reports|Entities)\s*\(([^)]+)\)\]")

_graphrag_tables: dict[str, pd.DataFrame] | None = None


def _get_graphrag_tables() -> dict[str, pd.DataFrame]:
    global _graphrag_tables
    if _graphrag_tables is None:
        from pathlib import Path

        out = Path(__file__).resolve().parent.parent / "output"
        _graphrag_tables = {
            "text_units": pd.read_parquet(out / "text_units.parquet"),
            "community_reports": pd.read_parquet(out / "community_reports.parquet"),
            "entities": pd.read_parquet(out / "entities.parquet"),
        }
    return _graphrag_tables


def _extract_graphrag_context(response_text: str) -> str:
    """Parse [Data: Sources/Reports/Entities (...)] citations and resolve to text."""
    cites: dict[str, set[int]] = {"Sources": set(), "Reports": set(), "Entities": set()}
    for m in _CITE_RE.finditer(response_text):
        for tok in m.group(2).split(","):
            tok = tok.strip()
            if tok.isdigit():
                cites[m.group(1)].add(int(tok))

    if not any(cites.values()):
        return ""

    tables = _get_graphrag_tables()
    parts: list[str] = []

    if cites["Sources"]:
        tu = tables["text_units"]
        for _, r in tu[tu["human_readable_id"].isin(cites["Sources"])].iterrows():
            parts.append(r["text"].strip())
    if cites["Reports"]:
        cr = tables["community_reports"]
        for _, r in cr[cr["human_readable_id"].isin(cites["Reports"])].iterrows():
            parts.append(r["summary"].strip())
    if cites["Entities"]:
        ent = tables["entities"]
        for _, r in ent[ent["human_readable_id"].isin(cites["Entities"])].iterrows():
            d = r.get("description", "")
            if d:
                parts.append(d.strip())

    return "\n\n---\n\n".join(parts)


def _model_config() -> dict:
    return {
        "azure_endpoint": os.environ["AZURE_OPENAI_ENDPOINT"],
        "azure_deployment": "gpt-4.1",
        "api_version": "2024-12-01-preview",
    }


def _run_evaluator(evaluator_cls, kwargs: dict) -> dict:
    evaluator = evaluator_cls(model_config=_model_config(), credential=_credential)
    return evaluator(**kwargs)


def _normalize(score: float) -> float:
    """Convert 1-5 scale to 0-100%."""
    return round((score / 5) * 100, 1)


# ── Schemas ───────────────────────────────────────────────────────────────────


class QuickScores(BaseModel):
    """Phase 1: scores that only need query + response."""

    relevance: float
    coherence: float


class FullScores(BaseModel):
    """Phase 2: scores that need context and/or ground_truth."""

    groundedness: float
    similarity: float
    retrieval: float


class QuickEvalRequest(BaseModel):
    query: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)


class FullEvalRequest(BaseModel):
    query: str = Field(..., min_length=1)
    rag_response: str = Field(..., min_length=1)
    graphrag_response: str = Field(..., min_length=1)


class FullEvalResponse(BaseModel):
    rag: FullScores
    graphrag: FullScores


# ── Phase 1: Quick eval (relevance + coherence) ─────────────────────────────


@router.post("/quick", response_model=QuickScores)
async def evaluate_quick(body: QuickEvalRequest):
    """Run relevance + coherence evaluators. No context or ground_truth needed.

    Call this as soon as a pipeline finishes streaming its response.
    """
    with ThreadPoolExecutor(max_workers=2) as pool:
        rel_fut = pool.submit(
            _run_evaluator,
            RelevanceEvaluator,
            {"query": body.query, "response": body.response},
        )
        coh_fut = pool.submit(
            _run_evaluator,
            CoherenceEvaluator,
            {"query": body.query, "response": body.response},
        )

    return QuickScores(
        relevance=_normalize(rel_fut.result().get("relevance", 3)),
        coherence=_normalize(coh_fut.result().get("coherence", 3)),
    )


# ── Phase 2: Full eval (groundedness + similarity + retrieval) ───────────────


def _full_eval_one(
    query: str, response: str, context: str, ground_truth: str
) -> FullScores:
    """Run groundedness, similarity, and retrieval for one pipeline."""
    with ThreadPoolExecutor(max_workers=3) as pool:
        ground_fut = pool.submit(
            _run_evaluator,
            GroundednessEvaluator,
            {"query": query, "response": response, "context": context},
        )
        sim_fut = pool.submit(
            _run_evaluator,
            SimilarityEvaluator,
            {"query": query, "response": response, "ground_truth": ground_truth},
        )
        ret_fut = pool.submit(
            _run_evaluator,
            RetrievalEvaluator,
            {"query": query, "context": context},
        )

    return FullScores(
        groundedness=_normalize(ground_fut.result().get("groundedness", 3)),
        similarity=_normalize(sim_fut.result().get("similarity", 3)),
        retrieval=_normalize(ret_fut.result().get("retrieval", 3)),
    )


@router.post("/full", response_model=FullEvalResponse)
async def evaluate_full(body: FullEvalRequest):
    """Run groundedness + similarity + retrieval for both pipelines.

    Requires both RAG and GraphRAG responses to be complete.
    - RAG context: retrieved from Azure AI Search
    - GraphRAG context: extracted from [Data: ...] citations in its response
    - Ground truth for RAG: GraphRAG response (the richer answer)
    - Ground truth for GraphRAG: GraphRAG response itself (self-consistency)
    """
    # Build RAG context from search
    search_results = _search(body.query)
    rag_context = "\n\n---\n\n".join(r["content"] for r in search_results)

    # Build GraphRAG context from citations
    graphrag_context = _extract_graphrag_context(body.graphrag_response)

    # Use GraphRAG response as ground truth for both
    ground_truth = body.graphrag_response

    with ThreadPoolExecutor(max_workers=2) as pool:
        rag_fut = pool.submit(
            _full_eval_one,
            body.query,
            body.rag_response,
            rag_context,
            ground_truth,
        )
        graphrag_fut = pool.submit(
            _full_eval_one,
            body.query,
            body.graphrag_response,
            graphrag_context,
            ground_truth,
        )

    return FullEvalResponse(
        rag=rag_fut.result(),
        graphrag=graphrag_fut.result(),
    )
