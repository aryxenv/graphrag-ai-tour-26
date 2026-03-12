"""Index documents into Azure AI Search using LangChain text splitter."""

import os
from pathlib import Path

from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)
from dotenv import load_dotenv
from langchain_openai import AzureOpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

INDEX_NAME = "rag-index"
DATA_DIR = Path(__file__).parent.parent / "data"

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


def create_index(index_client: SearchIndexClient) -> None:
    """Create or update the search index with vector search support."""
    fields = [
        SimpleField(name="id", type=SearchFieldDataType.String, key=True),
        SearchableField(name="content", type=SearchFieldDataType.String),
        SimpleField(name="source", type=SearchFieldDataType.String, filterable=True),
        SearchField(
            name="embedding",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=3072,  # text-embedding-3-large
            vector_search_profile_name="default-profile",
        ),
    ]

    vector_search = VectorSearch(
        algorithms=[HnswAlgorithmConfiguration(name="default-hnsw")],
        profiles=[
            VectorSearchProfile(
                name="default-profile", algorithm_configuration_name="default-hnsw"
            )
        ],
    )

    index = SearchIndex(name=INDEX_NAME, fields=fields, vector_search=vector_search)
    index_client.create_or_update_index(index)
    print(f"Index '{INDEX_NAME}' created/updated.")


def load_and_split_documents() -> list[dict]:
    """Load text files from data/ and split into chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=100,
    )

    chunks = []
    for file_path in DATA_DIR.glob("*.txt"):
        text = file_path.read_text(encoding="utf-8")
        splits = text_splitter.split_text(text)
        for i, chunk in enumerate(splits):
            chunks.append(
                {"id": f"{file_path.stem}_{i}", "content": chunk, "source": file_path.name}
            )

    print(f"Split into {len(chunks)} chunks from {len(list(DATA_DIR.glob('*.txt')))} file(s).")
    return chunks


def index_documents() -> None:
    """Main indexing pipeline: create index, chunk, embed, upload."""
    index_client = SearchIndexClient(
        endpoint=AZURE_AI_SEARCH_ENDPOINT, credential=credential
    )
    create_index(index_client)

    chunks = load_and_split_documents()
    if not chunks:
        print("No documents found in data/.")
        return

    embeddings_client = get_embeddings_client()

    # Embed in batches
    batch_size = 16
    all_texts = [c["content"] for c in chunks]
    all_embeddings: list[list[float]] = []
    for i in range(0, len(all_texts), batch_size):
        batch = all_texts[i : i + batch_size]
        all_embeddings.extend(embeddings_client.embed_documents(batch))
        print(f"Embedded {min(i + batch_size, len(all_texts))}/{len(all_texts)} chunks")

    # Prepare documents for upload
    documents = []
    for chunk, embedding in zip(chunks, all_embeddings):
        documents.append({**chunk, "embedding": embedding})

    # Upload to Azure AI Search
    search_client = SearchClient(
        endpoint=AZURE_AI_SEARCH_ENDPOINT,
        index_name=INDEX_NAME,
        credential=credential,
    )
    result = search_client.upload_documents(documents)
    succeeded = sum(1 for r in result if r.succeeded)
    print(f"Uploaded {succeeded}/{len(documents)} documents to Azure AI Search.")


if __name__ == "__main__":
    index_documents()
