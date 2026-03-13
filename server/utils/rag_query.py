"""RAG query: hybrid search on Azure AI Search + streaming GPT-4.1 answer."""

import os
from collections.abc import AsyncGenerator

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from openai import AzureOpenAI

INDEX_NAME = "rag-index"

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


def _embed_query(client: AzureOpenAI, text: str) -> list[float]:
    """Get embedding vector for a query string."""
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-large",
    )
    return response.data[0].embedding


def _search(query: str, top_k: int = 5) -> list[dict]:
    """Hybrid search: text + vector on Azure AI Search."""
    client = _get_openai_client()
    query_embedding = _embed_query(client, query)

    search_client = SearchClient(
        endpoint=os.environ["AZURE_AI_SEARCH_ENDPOINT"],
        index_name=INDEX_NAME,
        credential=_credential,
    )

    vector_query = VectorizedQuery(
        vector=query_embedding, k_nearest_neighbors=top_k, fields="embedding"
    )

    results = search_client.search(
        search_text=query,
        vector_queries=[vector_query],
        top=top_k,
        select=["content", "source"],
    )

    return [{"content": r["content"], "source": r["source"]} for r in results]


async def rag_query_stream(question: str) -> AsyncGenerator[str, None]:
    """Retrieve relevant chunks and stream a GPT-4.1 answer."""
    results = _search(question)

    context = "\n\n---\n\n".join(
        f"[Source: {r['source']}]\n{r['content']}" for r in results
    )

    client = _get_openai_client()

    stream = client.chat.completions.create(
        model="gpt-4.1",
        stream=True,
        stream_options={"include_usage": True},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant. Answer the user's question based on the "
                    "provided context. If the context doesn't contain enough information, "
                    "say so. Cite the source when possible."
                ),
            },
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}",
            },
        ],
    )

    usage = None
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
        if chunk.usage:
            usage = {
                "input_tokens": chunk.usage.prompt_tokens,
                "output_tokens": chunk.usage.completion_tokens,
            }
    if usage:
        yield f"__USAGE__{usage['input_tokens']}:{usage['output_tokens']}"
