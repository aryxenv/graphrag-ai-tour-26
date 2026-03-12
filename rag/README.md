# RAG with Azure AI Search

Chunks text documents, embeds them with Azure OpenAI, and indexes into Azure AI Search for retrieval-augmented generation.

## Setup

```bash
cd rag
uv venv
uv pip install -r requirements.txt --link-mode=copy
```

Create a `.env` file:

```
AZURE_OPENAI_ENDPOINT=<your-azure-openai-endpoint>
AZURE_COGNITIVE_SERVICES_ENDPOINT=<your-cognitive-services-endpoint>
AZURE_AI_SEARCH_ENDPOINT=<your-search-endpoint>
```

Auth uses `DefaultAzureCredential` (managed identity / az login).

## Usage

Place `.txt` files in `data/`, then:

```bash
# Index documents into Azure AI Search
uv run python src/index.py

# Query
uv run python src/query.py "What is this book about?"
```

## How it works

1. **Index**: Reads text files from `data/`, splits with LangChain `RecursiveCharacterTextSplitter` (1200 chars, 100 overlap), embeds with `text-embedding-3-large`, uploads to Azure AI Search with HNSW vector index.
2. **Query**: Hybrid search (text + vector) retrieves top-5 chunks, passes them as context to `gpt-4.1` for a grounded answer.
