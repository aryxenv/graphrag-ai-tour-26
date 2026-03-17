# GraphRAG Demo — Build Notes

## Architecture

React + Vite client (`client/`) with Fluent UI v9, backed by a FastAPI server (`server/`) that serves streaming query endpoints, AI-powered evaluation, and question generation.

### Three Tabs

**Ask** — Side-by-side comparison of GraphRAG vs vanilla RAG on the same pre-built corpus. Both queries fire concurrently and stream responses via SSE. The UI shows real-time metrics (TTFT, estimated tokens) and auto-triggers Azure AI Evaluation scoring (relevance, groundedness, coherence) independently for each response once streaming completes. AI-generated question buttons (cross-document, global, hidden insight, timeline) — visitor picks one, both systems answer simultaneously.

**Explore** — 3D force-directed graph visualization (`react-force-graph-3d` / Three.js) of a pre-indexed knowledge graph. Nodes colored by entity type, clickable for details. Pre-filled with the larger persistent graph (same corpus as Ask tab).

**Build** — End-to-end self-service demo:

1. Visitor selects a scenario (tech startup / hospital / law firm) + memo count
2. Foundry agent generates interconnected corporate memos with implicit cross-references
3. GraphRAG indexes memos → extracts entities/relationships → builds knowledge graph
4. AI generates curated questions from the indexed graph
5. Visitor picks a question → GraphRAG answers with citations

### Server (`server/`)

FastAPI application with six routers:

- **Query** (`endpoints/query.py`) — SSE streaming endpoints for RAG and GraphRAG search
- **Questions** (`endpoints/questions.py`) — AI-generated question suggestions
- **Evaluate** (`endpoints/evaluate.py`) — Response quality scoring via Azure AI Evaluation SDK
- **Graph** (`endpoints/graph.py`) — Pre-indexed knowledge graph data for the Explore tab
- **Build** (`endpoints/build.py`) — End-to-end pipeline: memo generation, indexing, querying, and evaluation
- **Feedback** (`endpoints/feedback.py`) — User feedback collection

### Query Pipeline

**RAG** (`utils/rag_query.py`):
1. Embed query with `text-embedding-3-large`
2. Hybrid search (text + vector) on Azure AI Search index
3. Top-5 chunks → GPT-4.1 streaming answer with source citations

**GraphRAG** (`utils/graphrag_query.py`):
1. LLM agent selects query engine (local / global / drift) based on query type
2. Selected engine header sent as first SSE event
3. GraphRAG library streams the search result using community reports, entities, relationships, and text units

### Evaluation Pipeline

Uses Azure AI Evaluation SDK (`azure-ai-evaluation`) with five evaluators:
- **RelevanceEvaluator** — does the response answer the question?
- **CoherenceEvaluator** — is the response well-structured and logical?
- **GroundednessEvaluator** — are claims supported by source text?
- **SimilarityEvaluator** — how similar are the RAG and GraphRAG responses?
- **RetrievalEvaluator** — quality of the retrieved source documents

Scores are 1–5, normalized to 0–100%. The Ask tab evaluates in two phases: quick (relevance + coherence) fires per-pipeline as soon as streaming completes, then full (groundedness + similarity + retrieval) fires once both pipelines finish. The Build tab evaluates all five metrics in a single pass after each query.

### SSE Streaming Protocol

Server emits SSE events with `data:` lines. Newlines within a chunk are encoded as multiple `data:` lines within a single SSE event (separated by `\n\n`). The client reconstructs newlines by joining `data:` lines per event. A `data: [DONE]` sentinel marks stream end. GraphRAG responses include an initial `event: engine` event with the selected query engine name.

### API Endpoints

| Method | Endpoint                       | Purpose                                      |
| ------ | ------------------------------ | -------------------------------------------- |
| POST   | `/api/query/rag`               | Stream RAG answer via SSE                    |
| POST   | `/api/query/graphrag`          | Stream GraphRAG answer via SSE               |
| GET    | `/api/questions/ask`           | AI-generated question suggestions            |
| POST   | `/api/evaluate/quick`          | Quick eval: relevance + coherence            |
| POST   | `/api/evaluate/full`           | Full eval: groundedness + similarity + retrieval |
| GET    | `/api/graph/explore`           | Full graph for 3D visualization              |
| POST   | `/api/build/generate`          | Foundry agent memo generation                |
| POST   | `/api/build/index`             | Trigger GraphRAG indexing pipeline (SSE progress) |
| GET    | `/api/build/graph/{session_id}`| Fetch indexed graph for a build session      |
| POST   | `/api/build/questions`         | Generate questions from new graph            |
| POST   | `/api/build/query`             | Query the build-tab graph via SSE            |
| POST   | `/api/build/evaluate`          | Evaluate a build query response (5 metrics)  |
| POST   | `/api/build/reset`             | Reset and clean up a build session           |
| POST   | `/api/feedback`                | Submit user feedback                         |

### Client Architecture

- **API layer** (`src/api/`) — SSE consumption with `consumeSSE()` helper, streaming callbacks, and `AbortController` for cancellation
  - `ask.api.ts` — RAG/GraphRAG streaming, question fetching, phased evaluation
  - `explore.api.ts` — Pre-built graph data fetching
  - `build.api.ts` — Memo generation, indexing with SSE progress, build-tab querying and evaluation
- **Hooks** (`src/hooks/`)
  - `ask.hooks.ts` — `useStreamingQuery()` manages concurrent stream state, TTFT measurement (via `performance.now()` refs), token estimation (~4 chars/token), and auto-triggered per-side evaluation
  - `explore.hooks.ts` — `useExploreGraph()` fetches and caches graph data via TanStack Query
  - `build.hooks.ts` — `useBuildWizard()` orchestrates the full build pipeline (scenario → generate → index → query → evaluate) with localStorage persistence
  - `storage.ts` — localStorage persistence helpers
- **Markdown rendering** — `react-markdown` with `remark-gfm` for GFM tables, strikethrough, and task lists

### Stack

- **UI**: React 19, Fluent UI v9 (`@fluentui/react-components`), `react-force-graph-3d`, `react-markdown` + `remark-gfm`
- **Theme**: Foundry dark (#151515 background, #7b53e6 purple brand)
- **Build**: Vite 7, TypeScript 5.9
- **Server**: FastAPI, uvicorn, `azure-ai-evaluation`
- **Models**: Azure OpenAI GPT-4.1 + text-embedding-3-large
- **Auth**: `DefaultAzureCredential` (Azure Identity SDK)
