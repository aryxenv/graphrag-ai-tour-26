# GraphRAG Interactive Demo

A hands-on demo built for the Microsoft Foundry booth at AI Tour Brussels 2026. Explore how GraphRAG turns unstructured documents into a knowledge graph and compare its answers against vanilla RAG, all through a foundry-like web app.

## Preview

![Foundry x GraphRAG Preview](./foundry_x_graphrag_preview.jpeg)

## What It Does

The app has three tabs:

- **Ask**: Submit a question and see GraphRAG and vanilla RAG answer side by side. Pre-generated questions highlight where GraphRAG excels: multi-hop reasoning, cross-document synthesis, and global summarization. ([demo video](videos/demo_ask.md))
- **Explore**: Browse a 3D force-directed visualization of a pre-built knowledge graph. Click any node to inspect entities and relationships extracted by GraphRAG. ([demo video](videos/demo_explore.md))
- **Build**: Walk through the full pipeline end to end. Pick a scenario, generate synthetic corporate memos with a Foundry agent, run GraphRAG indexing, and then query the resulting graph. ([demo video](videos/demo_build.md))

## Architecture

- **Frontend**: React 19 + Fluent UI v9 + Vite. Graph visualization with `react-force-graph-3d` / Three.js. Streamed responses rendered with `react-markdown`.
- **Server**: FastAPI (Python). Serves query endpoints for both RAG and GraphRAG with SSE streaming. Includes AI-powered response evaluation via Azure AI Evaluation SDK.
- **RAG Pipeline**: Azure AI Search hybrid (text + vector) retrieval with GPT-4.1 answer generation.
- **GraphRAG Pipeline**: Knowledge graph extraction, community detection, and multi-engine search (local / global / drift) powered by the `graphrag` library.
- **Models**: Azure OpenAI GPT-4.1 and text-embedding-3-large.

## Project Structure

```
client/          React + Vite frontend
server/          FastAPI backend (query, evaluation, question generation)
rag/             Vanilla RAG indexing pipeline (Azure AI Search)
graphrag/        GraphRAG indexing config, prompts, cached outputs, and source data
BUILD.md         Detailed technical build notes and endpoint mapping
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- Azure OpenAI resource with `gpt-4.1` and `text-embedding-3-large` deployments
- Azure AI Search resource

### Environment Variables

Create `server/.env`:

```
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com/
AZURE_AI_SEARCH_ENDPOINT=https://<your-search>.search.windows.net
```

Authentication uses `DefaultAzureCredential` — ensure you're logged in via `az login`.

### Frontend

```bash
cd client
npm install
npm run dev
```

### Server

```bash
cd server
uv venv
uv pip install -r requirements.txt
uv run python src/index.py
```

### GraphRAG Indexing

Configure your Azure OpenAI connection in `graphrag/settings.yaml`, then run the indexing pipeline. See [graphrag/README.md](graphrag/README.md) for details.

### RAG Indexing

See [rag/README.md](rag/README.md) for the Azure AI Search indexing setup.

### Evaluation

The app evaluates responses using the Azure AI Evaluation SDK with five metrics: relevance, coherence, groundedness, similarity, and retrieval.

- **Ask tab** — two-phase evaluation:
  - **Quick** (per-pipeline): Relevance + Coherence → runs as soon as a response finishes streaming.
  - **Full** (both pipelines): Groundedness + Similarity + Retrieval → runs once both RAG and GraphRAG complete, using GraphRAG as the ground truth.
- **Build tab** — single-pass evaluation: all five metrics run together after each query.

Scores appear as badges next to each response. See [eval/README.md](eval/README.md) for batch eval scripts and dataset details.

## Additional Details

- [graphrag/README.md](graphrag/README.md): GraphRAG pipeline, configuration, and search modes
- [rag/README.md](rag/README.md): Vanilla RAG pipeline and Azure AI Search setup
- [eval/README.md](eval/README.md): Evaluation pipeline, evaluators, and phased scoring
- [BUILD.md](BUILD.md): Technical breakdown including tab behavior, API endpoints, and stack details

_This documentation was generated with the help of AI_
