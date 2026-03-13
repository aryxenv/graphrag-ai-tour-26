"""GraphRAG query: agent-based engine selection + streaming search."""

import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path

import pandas as pd
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from graphrag.api.query import (
    drift_search_streaming,
    global_search_streaming,
    local_search_streaming,
)
from graphrag.config.load_config import load_config
from openai import AzureOpenAI

_SERVER_ROOT = Path(__file__).resolve().parent.parent

_credential = DefaultAzureCredential()
_token_provider = get_bearer_token_provider(
    _credential, "https://cognitiveservices.azure.com/.default"
)


def _get_openai_client() -> AzureOpenAI:
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_version="2024-12-01-preview",
        azure_ad_token_provider=_token_provider,
    )


def _load_graphrag_data() -> dict[str, pd.DataFrame]:
    """Load all required parquet files from the server output directory."""
    output_dir = _SERVER_ROOT / "output"
    return {
        "entities": pd.read_parquet(output_dir / "entities.parquet"),
        "communities": pd.read_parquet(output_dir / "communities.parquet"),
        "community_reports": pd.read_parquet(output_dir / "community_reports.parquet"),
        "text_units": pd.read_parquet(output_dir / "text_units.parquet"),
        "relationships": pd.read_parquet(output_dir / "relationships.parquet"),
    }


def _load_graphrag_config():
    """Load GraphRAG config from server directory."""
    return load_config(root_dir=str(_SERVER_ROOT))


_ENGINE_SELECTION_PROMPT = """\
You are a query routing agent for a GraphRAG knowledge graph system. Given a user query, \
decide which search engine method is best suited to answer it. Return ONLY a JSON object.

The three options:

1. **global** — Best for broad, thematic questions that require synthesizing information \
across the ENTIRE dataset. Uses community reports in a map-reduce fashion. \
Examples: "What are the main themes?", "What values are most important across all characters?"

2. **local** — Best for questions about specific entities, relationships, or facts \
mentioned in the documents. Combines knowledge graph data with raw text chunks. \
Examples: "What are the healing properties of chamomile?", "Who is Bob Cratchit?"

3. **drift** — Best for questions that start local but benefit from broader community context. \
Expands the search breadth by incorporating community insights for more comprehensive answers. \
Use when a question is specific but might need surrounding context to answer fully. \
Examples: "How does Scrooge's relationship with money change?", \
"What connections exist between the Ghost of Christmas Past and Scrooge's childhood?"

Respond with ONLY this JSON (no markdown, no explanation):
{"query_engine": "global" | "local" | "drift"}"""


def select_query_engine(query: str) -> tuple[str, int]:
    """Use an LLM agent to determine the best GraphRAG query engine for a query.

    Returns a tuple of (engine_name, prompt_tokens).
    """
    client = _get_openai_client()

    response = client.chat.completions.create(
        model="gpt-4.1",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _ENGINE_SELECTION_PROMPT},
            {"role": "user", "content": query},
        ],
    )

    raw = response.choices[0].message.content or "{}"
    result = json.loads(raw)
    engine = result.get("query_engine", "local")
    prompt_tokens = response.usage.prompt_tokens if response.usage else 0

    if engine not in ("global", "local", "drift"):
        engine = "local"

    return engine, prompt_tokens


async def graphrag_query_stream(
    query: str,
    query_engine: str,
    community_level: int = 2,
) -> AsyncGenerator[str, None]:
    """Run a GraphRAG search with the specified engine and stream results."""
    config = _load_graphrag_config()
    data = _load_graphrag_data()

    common_args = {
        "config": config,
        "entities": data["entities"],
        "communities": data["communities"],
        "community_reports": data["community_reports"],
        "query": query,
        "response_type": "Multiple Paragraphs",
    }

    if query_engine == "global":
        stream = global_search_streaming(
            **common_args,
            community_level=community_level,
            dynamic_community_selection=False,
        )
    elif query_engine == "drift":
        stream = drift_search_streaming(
            **common_args,
            text_units=data["text_units"],
            relationships=data["relationships"],
            community_level=community_level,
        )
    else:  # local
        stream = local_search_streaming(
            **common_args,
            text_units=data["text_units"],
            relationships=data["relationships"],
            covariates=None,
            community_level=community_level,
        )

    async for chunk in stream:
        yield chunk
