# Server

FastAPI backend serving query, evaluation, and question generation endpoints.

## Endpoints

| Route                 | Method | Description                                      |
| --------------------- | ------ | ------------------------------------------------ |
| `/`                   | GET    | Health check                                     |
| `/api/query/rag`      | POST   | Stream RAG response (SSE)                        |
| `/api/query/graphrag` | POST   | Stream GraphRAG response (SSE)                   |
| `/api/questions/ask`  | GET    | Generate AI-powered sample questions             |
| `/api/evaluate/quick` | POST   | Quick eval: relevance + coherence                |
| `/api/evaluate/full`  | POST   | Full eval: groundedness + similarity + retrieval |

## Structure

```
server/
  main.py                  # FastAPI app, CORS, router registration
  settings.yaml            # GraphRAG model + chunking config
  requirements.txt
  endpoints/
    query.py               # RAG + GraphRAG SSE streaming endpoints
    evaluate.py            # Phased evaluation (quick + full)
    questions.py           # AI-generated question suggestions
  utils/
    rag_query.py           # Azure AI Search hybrid retrieval + GPT-4.1 streaming
    graphrag_query.py      # GraphRAG engine selection + streaming (global/local/drift)
    graphrag_questions.py  # Question generation from community reports
  output/                  # GraphRAG parquet tables (entities, communities, etc.)
```

## Setup

```bash
cd server
uv venv
uv pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```
GRAPHRAG_API_KEY=<API_KEY>                           # keep as-is unless using key-based auth
AZURE_OPENAI_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.openai.azure.com/
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.cognitiveservices.azure.com/
AZURE_AI_SEARCH_ENDPOINT=https://<YOUR_AZURE_AI_SEARCH_RESOURCE_NAME>.search.windows.net
```

Auth uses `DefaultAzureCredential` — run `az login` first.

## Run

```bash
uv run python main.py
```

_This documentation was generated with the help of AI_
