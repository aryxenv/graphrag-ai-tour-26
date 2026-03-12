"""Query Azure AI Search with RAG (retrieve + generate)."""

import os

from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings
from openai import AzureOpenAI

load_dotenv()

INDEX_NAME = "rag-index"

AZURE_OPENAI_ENDPOINT = os.environ["AZURE_OPENAI_ENDPOINT"]
AZURE_COGNITIVE_SERVICES_ENDPOINT = os.environ["AZURE_COGNITIVE_SERVICES_ENDPOINT"]
AZURE_AI_SEARCH_ENDPOINT = os.environ["AZURE_AI_SEARCH_ENDPOINT"]

credential = DefaultAzureCredential()


def get_embeddings_client() -> AzureOpenAIEmbeddings:
    return AzureOpenAIEmbeddings(
        azure_deployment="text-embedding-3-large",
        azure_endpoint=AZURE_COGNITIVE_SERVICES_ENDPOINT,
        api_version="2024-02-01",
        azure_ad_token_provider=lambda: credential.get_token(
            "https://cognitiveservices.azure.com/.default"
        ).token,
    )


def search(query: str, top_k: int = 5) -> list[dict]:
    """Hybrid search: text + vector."""
    embeddings_client = get_embeddings_client()
    query_embedding = embeddings_client.embed_query(query)

    search_client = SearchClient(
        endpoint=AZURE_AI_SEARCH_ENDPOINT,
        index_name=INDEX_NAME,
        credential=credential,
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


def ask(question: str) -> str:
    """Retrieve relevant chunks and generate an answer with GPT-4.1."""
    results = search(question)

    context = "\n\n---\n\n".join(
        f"[Source: {r['source']}]\n{r['content']}" for r in results
    )

    token_provider = lambda: credential.get_token(
        "https://cognitiveservices.azure.com/.default"
    ).token

    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_version="2024-12-01-preview",
        azure_ad_token_provider=token_provider,
    )

    response = client.chat.completions.create(
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
            {
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}",
            },
        ],
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    import sys

    question = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "What is this book about?"
    print(f"\nQuestion: {question}\n")
    answer = ask(question)
    print(f"Answer:\n{answer}")
