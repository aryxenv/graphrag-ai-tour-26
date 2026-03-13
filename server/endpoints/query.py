"""Query endpoints — RAG and GraphRAG search with streaming responses."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from utils.graphrag_query import graphrag_query_stream, select_query_engine
from utils.rag_query import rag_query_stream

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)


class GraphRAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    community_level: int = Field(2, ge=0)


async def _sse_wrapper(generator):
    """Wrap an async generator into SSE data events."""
    async for chunk in generator:
        if chunk.startswith("__USAGE__"):
            # Extract usage data and send as a custom SSE event
            usage_data = chunk[9:]  # strip __USAGE__ prefix
            yield f"event: usage\ndata: {usage_data}\n\n"
        else:
            escaped = chunk.replace("\n", "\ndata: ")
            yield f"data: {escaped}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/rag")
async def query_rag(body: QueryRequest):
    """Query Azure AI Search RAG with streaming response."""
    return StreamingResponse(
        _sse_wrapper(rag_query_stream(body.query)),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/graphrag")
async def query_graphrag(body: GraphRAGQueryRequest):
    """Two-step GraphRAG query: agent selects engine, then streams search results.

    Step 1: LLM agent picks the best query engine (global/local/drift).
    Step 2: Runs the corresponding GraphRAG search and streams the answer.
    """
    # Step 1: Agent determines query engine
    engine, engine_input_tokens = select_query_engine(body.query)

    async def _stream_with_engine_header():
        # Send the selected engine as the first SSE event
        yield f"event: engine\ndata: {engine}\n\n"
        # Step 2: Stream the GraphRAG answer
        output_tokens = 0
        async for chunk in graphrag_query_stream(
            query=body.query,
            query_engine=engine,
            community_level=body.community_level,
        ):
            escaped = chunk.replace("\n", "\ndata: ")
            yield f"data: {escaped}\n\n"
            output_tokens += len(chunk) // 4  # rough estimate
        # Send usage event (engine selection input tokens + estimated output)
        yield f"event: usage\ndata: {engine_input_tokens}:{output_tokens}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        _stream_with_engine_header(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
