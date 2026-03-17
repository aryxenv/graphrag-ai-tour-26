# Copilot Instructions

## Build & Run

### Client (React + Vite)

```bash
cd client
npm install
npm run dev          # Dev server on http://localhost:5173
npm run build        # Type-check (tsc -b) then Vite build
npm run lint         # ESLint (flat config, ESLint 9)
```

### Server (FastAPI + uv)

```bash
cd server
uv venv && uv pip install -r requirements.txt
uv run python main.py   # Uvicorn on http://localhost:8000, reload enabled
```

### Indexing Pipelines

```bash
# GraphRAG indexing (from repo root)
cd graphrag
uv venv && uv pip install -r requirements.txt
graphrag index --root .

# RAG indexing (uploads to Azure AI Search)
cd rag
uv venv && uv pip install -r requirements.txt
uv run python src/index.py
```

### Evaluation

```bash
cd eval
uv venv && uv pip install -r requirements.txt
uv run python src/run_eval.py --pipeline both      # Live eval against both pipelines
uv run python src/run_eval.py --pipeline rag        # Single pipeline
uv run python src/run_eval_batch.py                 # Batch eval on pre-built dataset
```

## Architecture

This is a demo comparing **GraphRAG vs vanilla RAG** on the same corpus, with three UI tabs (Ask, Explore, Build) and a FastAPI backend.

### Data Flow

1. **Indexing** happens offline — `graphrag/` builds a knowledge graph (entities, communities, reports as parquet files + LanceDB vectors); `rag/` chunks and uploads to Azure AI Search.
2. **Querying** is streaming — the client fires concurrent SSE requests to `/api/query/rag` and `/api/query/graphrag`. GraphRAG uses an LLM agent to select the query engine (local/global/drift) before streaming.
3. **Evaluation** is two-phase — "quick" (relevance + coherence) runs per-pipeline as soon as streaming finishes; "full" (groundedness + similarity + retrieval) runs after both complete, using GraphRAG as ground truth.

### SSE Streaming Protocol

The server emits SSE events with `data:` lines. Newlines within chunks are encoded as multiple `data:` lines within a single SSE event. A `data: [DONE]` sentinel marks stream end. GraphRAG responses include an initial `event: engine` event and a final `event: usage` event. Token usage is encoded as `__USAGE__<input>:<output>`.

### Authentication

All Azure services use `DefaultAzureCredential` — ensure `az login` is run. No API keys are stored in code; env vars hold only endpoint URLs.

## Conventions

### Client

- **Feature-driven file organization**: API (`src/api/{feature}.api.ts`), hooks (`src/hooks/{feature}.hooks.ts`), and components (`src/components/{feature}/`) are grouped by feature (ask, explore, build).
- **State management**: TanStack Query (`useQuery`/`useMutation`) for server state; `useState` for local UI state; `localStorage` via `loadFromStorage`/`saveToStorage` helpers for persistence.
- **Streaming hooks**: `useStreamingQuery` manages dual concurrent SSE streams with `AbortController` cancellation, TTFT measurement via `performance.now()` refs, and token estimation (~4 chars/token).
- **TypeScript is strict**: `noUnusedLocals`, `noUnusedParameters`, and `noUncheckedSideEffectImports` are enforced.
- **UI framework**: Fluent UI v9 (`@fluentui/react-components`) exclusively — see `.github/ui.instructions.md` for component rules.

### Server

- **Router structure**: Each feature has its own router file in `server/endpoints/` with an `APIRouter(prefix="/api/{feature}")`. Routers are registered in `main.py`.
- **Async generators for streaming**: All query functions return `AsyncGenerator[str, None]` and are wrapped in `StreamingResponse` with `_sse_wrapper` for SSE formatting and client disconnect detection.
- **Pydantic validation**: Request bodies use `Field(min_length=..., max_length=...)` and query params use `Query(default, ge=..., le=...)`.
- **Parallel evaluation**: Evaluators run in `ThreadPoolExecutor(max_workers=2)` since the Azure AI Evaluation SDK is synchronous.
- **GraphRAG engine fallback**: If the LLM returns an unrecognized engine name, the server defaults to `"local"`.

### Git

- **Conventional Commits**: All commit messages must follow the format `<type>: <description>` — e.g., `feat: add build tab question generation`, `fix: handle SSE disconnect on abort`, `docs: update eval README`, `refactor: extract SSE wrapper`. Common types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`, `perf`.
- **Branch naming**: Use `feat/...` for features and `fix/...` for bug fixes (e.g., `feat/explore-show-book`, `fix/sse-disconnect`).
- **Workflow**: Always create a GitHub issue first describing the work, then wait for human approval on the issue before starting implementation. Work on a feature branch (never commit directly to `main`). When done, open a PR targeting `main` and wait for human review — do not merge automatically. Only merge after explicit human approval.

### Shared

- **Environment variables**: Each component (`server/`, `graphrag/`, `rag/`, `eval/`) has its own `.env` file with Azure endpoint URLs. See the corresponding `.env.example` files.
- **Embedding model**: `text-embedding-3-large` (3072 dimensions) is used everywhere — Azure Cognitive Services endpoint for GraphRAG, Azure OpenAI endpoint for RAG.
- **Chunking alignment**: Both pipelines use 1200-token/char chunks with 100 overlap to keep the comparison fair.
- **GraphRAG output format**: Indexed artifacts are parquet files in `graphrag/output/` (entities, relationships, communities, community_reports, text_units). The server and eval scripts read these directly with pandas.
