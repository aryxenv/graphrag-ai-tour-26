"""Build tab API endpoints — isolated pipeline for generating, indexing,
querying, and evaluating custom memo datasets."""

import asyncio
import json
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
from azure.ai.evaluation import (
    CoherenceEvaluator,
    GroundednessEvaluator,
    RelevanceEvaluator,
    RetrievalEvaluator,
    SimilarityEvaluator,
)
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from graphrag.api.query import (
    drift_search_streaming,
    global_search_streaming,
    local_search_streaming,
)
from graphrag.config.load_config import load_config
from pydantic import BaseModel, Field

from utils.build_pipeline import (
    cleanup_workspace,
    create_workspace,
    extract_build_context,
    generate_build_questions,
    generate_memos,
    load_build_graph,
    run_indexing,
    write_memos_to_workspace,
)
from utils.graphrag_query import select_query_engine

router = APIRouter(prefix="/api/build", tags=["build"])

_credential = DefaultAzureCredential()
_token_provider = get_bearer_token_provider(
    _credential, "https://cognitiveservices.azure.com/.default"
)
_SERVER_ROOT = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class GenerateRequest(BaseModel):
    scenario: str = Field(..., pattern=r"^(tech-startup|hospital|law-firm)$")
    count: int = Field(..., ge=10, le=15)


class GenerateResponse(BaseModel):
    session_id: str
    memos: list[dict]


class SessionRequest(BaseModel):
    session_id: str = Field(..., min_length=1)


class QueryRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)


class EvaluateRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)
    response: str = Field(..., min_length=1)


class EvaluateResponse(BaseModel):
    relevance: float
    coherence: float
    groundedness: float
    similarity: float
    retrieval: float


class QuestionItem(BaseModel):
    question: str
    type: str


class ResetResponse(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_workspace_path(session_id: str) -> Path:
    return _SERVER_ROOT / "build_sessions" / session_id


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
    return round((score / 5) * 100, 1)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/generate", response_model=GenerateResponse)
async def build_generate(body: GenerateRequest):
    """Generate synthetic memos for the chosen scenario."""
    session_id = str(uuid.uuid4())
    create_workspace(session_id)
    memos = generate_memos(body.scenario, body.count)
    write_memos_to_workspace(session_id, memos)
    return GenerateResponse(session_id=session_id, memos=memos)


@router.post("/index")
async def build_index(body: SessionRequest):
    """Run the GraphRAG indexing pipeline, streaming progress via SSE."""
    session_id = body.session_id
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def progress_cb(
        workflow: str, description: str, completed: int, total: int
    ) -> None:
        loop.call_soon_threadsafe(
            queue.put_nowait,
            {
                "workflow": workflow,
                "status": description,
                "completed": completed,
                "total": total,
            },
        )

    executor = ThreadPoolExecutor(max_workers=1)
    future = loop.run_in_executor(executor, run_indexing, session_id, progress_cb)

    async def sse_generator():
        while not future.done() or not queue.empty():
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield f"data: {json.dumps(msg)}\n\n"
            except asyncio.TimeoutError:
                continue

        # Propagate any exception raised inside the indexing thread
        await future

        graph = load_build_graph(session_id)
        yield f"event: graph\ndata: {json.dumps(graph)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/graph/{session_id}")
async def build_graph(session_id: str):
    """Return the knowledge graph built for a session."""
    return load_build_graph(session_id)


@router.post("/questions", response_model=list[QuestionItem])
async def build_questions(body: SessionRequest):
    """Generate suggested questions for a built graph."""
    return generate_build_questions(body.session_id)


@router.post("/query")
async def build_query(body: QueryRequest, request: Request):
    """Query the session's GraphRAG index, streaming the answer via SSE."""
    workspace = _get_workspace_path(body.session_id)
    config = load_config(root_dir=str(workspace))

    output_dir = workspace / "output"
    entities = pd.read_parquet(output_dir / "entities.parquet")
    communities = pd.read_parquet(output_dir / "communities.parquet")
    community_reports = pd.read_parquet(output_dir / "community_reports.parquet")
    text_units = pd.read_parquet(output_dir / "text_units.parquet")
    relationships = pd.read_parquet(output_dir / "relationships.parquet")

    engine, _input_tokens = select_query_engine(body.query)

    async def sse_generator():
        yield f"event: engine\ndata: {engine}\n\n"

        if engine == "global":
            stream = global_search_streaming(
                config=config,
                entities=entities,
                communities=communities,
                community_reports=community_reports,
                query=body.query,
                response_type="Multiple Paragraphs",
                community_level=2,
                dynamic_community_selection=False,
            )
        elif engine == "drift":
            stream = drift_search_streaming(
                config=config,
                entities=entities,
                communities=communities,
                community_reports=community_reports,
                query=body.query,
                response_type="Multiple Paragraphs",
                text_units=text_units,
                relationships=relationships,
                community_level=2,
            )
        else:
            stream = local_search_streaming(
                config=config,
                entities=entities,
                communities=communities,
                community_reports=community_reports,
                query=body.query,
                response_type="Multiple Paragraphs",
                text_units=text_units,
                relationships=relationships,
                covariates=None,
                community_level=2,
            )

        async for chunk in stream:
            if await request.is_disconnected():
                break
            yield f"data: {chunk}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def build_evaluate(body: EvaluateRequest):
    """Run all five AI evaluators in parallel against a build query result."""
    context = extract_build_context(body.session_id, body.response)

    with ThreadPoolExecutor(max_workers=5) as pool:
        relevance_fut = pool.submit(
            _run_evaluator,
            RelevanceEvaluator,
            {"query": body.query, "response": body.response},
        )
        coherence_fut = pool.submit(
            _run_evaluator,
            CoherenceEvaluator,
            {"query": body.query, "response": body.response},
        )
        groundedness_fut = pool.submit(
            _run_evaluator,
            GroundednessEvaluator,
            {"query": body.query, "response": body.response, "context": context},
        )
        similarity_fut = pool.submit(
            _run_evaluator,
            SimilarityEvaluator,
            {"query": body.query, "response": body.response, "ground_truth": body.response},
        )
        retrieval_fut = pool.submit(
            _run_evaluator,
            RetrievalEvaluator,
            {"query": body.query, "context": context},
        )

    return EvaluateResponse(
        relevance=_normalize(relevance_fut.result().get("relevance", 3)),
        coherence=_normalize(coherence_fut.result().get("coherence", 3)),
        groundedness=_normalize(groundedness_fut.result().get("groundedness", 3)),
        similarity=_normalize(similarity_fut.result().get("similarity", 3)),
        retrieval=_normalize(retrieval_fut.result().get("retrieval", 3)),
    )


@router.post("/reset", response_model=ResetResponse)
async def build_reset(body: SessionRequest):
    """Clean up the session workspace and all generated artifacts."""
    cleanup_workspace(body.session_id)
    return ResetResponse(status="ok")
