"""Evaluate endpoint — score responses using Azure AI Evaluation."""

import os
import re
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
from azure.ai.evaluation import (
    CoherenceEvaluator,
    GroundednessEvaluator,
    RelevanceEvaluator,
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
    """Lazy-load GraphRAG parquet tables (cached after first call)."""
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
    """Parse [Data: Sources/Reports/Entities (...)] citations from a GraphRAG
    response and resolve them to actual text from parquet tables."""
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


class ScoreResult(BaseModel):
    relevance: float
    groundedness: float
    coherence: float
    overall: float


class EvaluateSingleRequest(BaseModel):
    query: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)
    pipeline: str = Field("rag", pattern="^(rag|graphrag)$")


class EvaluateRequest(BaseModel):
    query: str = Field(..., min_length=1)
    rag_response: str = Field(..., min_length=1)
    graphrag_response: str = Field(..., min_length=1)


class EvaluateResponse(BaseModel):
    rag: ScoreResult
    graphrag: ScoreResult


def _evaluate_response(query: str, response: str, context: str) -> ScoreResult:
    """Run three evaluators on a single response and return normalized scores."""
    with ThreadPoolExecutor(max_workers=3) as pool:
        rel_future = pool.submit(
            _run_evaluator,
            RelevanceEvaluator,
            {"query": query, "response": response},
        )
        ground_future = pool.submit(
            _run_evaluator,
            GroundednessEvaluator,
            {"query": query, "response": response, "context": context},
        )
        coh_future = pool.submit(
            _run_evaluator,
            CoherenceEvaluator,
            {"query": query, "response": response},
        )

    rel_result = rel_future.result()
    ground_result = ground_future.result()
    coh_result = coh_future.result()

    # Scores are 1-5, normalize to 0-100%
    relevance = (rel_result.get("relevance", 3) / 5) * 100
    groundedness = (ground_result.get("groundedness", 3) / 5) * 100
    coherence = (coh_result.get("coherence", 3) / 5) * 100
    overall = round((relevance + groundedness + coherence) / 3, 1)

    return ScoreResult(
        relevance=round(relevance, 1),
        groundedness=round(groundedness, 1),
        coherence=round(coherence, 1),
        overall=overall,
    )


@router.post("/single", response_model=ScoreResult)
async def evaluate_single(body: EvaluateSingleRequest):
    """Evaluate a single response against its own pipeline's context.

    - pipeline=rag   → context from Azure AI Search (RAG retrieval)
    - pipeline=graphrag → context extracted from [Data: ...] citations in the response
    """
    if body.pipeline == "graphrag":
        context = _extract_graphrag_context(body.response)
    else:
        results = _search(body.query)
        context = "\n\n---\n\n".join(
            f"[Source: {r['source']}]\n{r['content']}" for r in results
        )
    return _evaluate_response(body.query, body.response, context)


@router.post("", response_model=EvaluateResponse)
async def evaluate(body: EvaluateRequest):
    """Evaluate both RAG and GraphRAG responses against source context."""
    results = _search(body.query)
    context = "\n\n---\n\n".join(
        f"[Source: {r['source']}]\n{r['content']}" for r in results
    )

    with ThreadPoolExecutor(max_workers=2) as pool:
        rag_future = pool.submit(
            _evaluate_response, body.query, body.rag_response, context
        )
        graphrag_future = pool.submit(
            _evaluate_response, body.query, body.graphrag_response, context
        )

    return EvaluateResponse(
        rag=rag_future.result(),
        graphrag=graphrag_future.result(),
    )
