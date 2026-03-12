"""Evaluate endpoint — score responses using Azure AI Evaluation."""

import os
from concurrent.futures import ThreadPoolExecutor

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
    """Evaluate a single response against source context."""
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
