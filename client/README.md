# Client

React 19 frontend with Fluent UI v9, built with Vite.

## Tabs

- **Ask** — Side-by-side RAG vs GraphRAG comparison with streaming responses, TTFT metrics, and AI evaluation badges.
- **Explore** — 3D force-directed knowledge graph visualization using `react-force-graph-3d`.
- **Build** — End-to-end pipeline walkthrough: generate memos, run GraphRAG indexing, query the graph.

## Structure

```
src/
  App.tsx                    # Tab navigation + lazy-loaded pages
  constants.ts               # API base URL, localStorage keys
  types.ts                   # Shared TypeScript types
  api/
    ask.api.ts               # SSE streaming, eval API calls
    explore.api.ts           # Graph data fetching
    build.api.ts             # Memo generation + indexing
  hooks/
    ask.hooks.ts             # Streaming state, phased eval orchestration
    explore.hooks.ts         # Graph data hook
    build.hooks.ts           # Build pipeline hook
    storage.ts               # localStorage persistence helpers
  components/
    Header.tsx               # Navigation header
    ask/
      QueryInput.tsx         # Search input with suggestion pills
      QueryPanel.tsx         # Markdown response panel with streaming
      EvalBadge.tsx          # Evaluation score badge with tooltip
    tabs/
      Ask.tsx                # Ask tab layout (two-panel + metrics)
      Explore.tsx            # Explore tab (3D graph)
      Build.tsx              # Build tab (pipeline wizard)
```

## Setup

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`. Expects the server at `http://localhost:8000`.

## Build

```bash
npm run build
```

Output in `dist/`.

_This documentation was generated with the help of AI_
