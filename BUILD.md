# GraphRAG Demo — Build Notes

## Architecture

React + Vite client (`client/`) with Fluent UI v9, backed by placeholder API stubs ready for a Python/FastAPI backend.

### Three Tabs

**Ask** — Side-by-side comparison of GraphRAG vs vanilla RAG on the same pre-built graph. AI-generated question buttons (cross-document, global, hidden insight, timeline) — visitor picks one, both systems answer simultaneously. Demonstrates GraphRAG's advantage on multi-hop and summarization queries.

**Explore** — 3D force-directed graph visualization (`react-force-graph-3d` / Three.js) of a pre-indexed knowledge graph. Nodes colored by entity type, clickable for details. Pre-filled with the larger persistent graph (same corpus as Ask tab).

**Build** — End-to-end self-service demo:

1. Visitor selects a scenario (tech startup / hospital / law firm) + memo count
2. Foundry agent generates interconnected corporate memos with implicit cross-references
3. GraphRAG indexes memos → extracts entities/relationships → builds knowledge graph
4. AI generates curated questions from the indexed graph
5. Visitor picks a question → GraphRAG answers with citations

### API Layer

All backend calls are in `src/api.ts` as placeholder functions returning mock data. Each maps to a future endpoint:

| Function                 | Endpoint                    | Purpose                             |
| ------------------------ | --------------------------- | ----------------------------------- |
| `queryGraphRAG`          | `POST /api/query/graphrag`  | GraphRAG local/global search        |
| `queryVanillaRAG`        | `POST /api/query/vanilla`   | Basic vector search for comparison  |
| `fetchAskQuestions`      | `GET /api/questions/ask`    | Pre-generated questions for Ask tab |
| `fetchExploreGraph`      | `GET /api/graph/explore`    | Full graph for 3D visualization     |
| `generateMemos`          | `POST /api/build/generate`  | Foundry agent memo generation       |
| `indexMemos`             | `POST /api/build/index`     | Trigger GraphRAG indexing pipeline  |
| `generateBuildQuestions` | `POST /api/build/questions` | Generate questions from new graph   |
| `queryBuildGraph`        | `POST /api/build/query`     | Query the build-tab graph           |

### Stack

- **UI**: React 19, Fluent UI v9 (`@fluentui/react-components`), `react-force-graph-3d`
- **Theme**: Foundry dark (#151515 background, #7b53e6 purple brand)
- **Build**: Vite 7, TypeScript 5.9
- **Graph models**: Azure OpenAI GPT-4.1 + text-embedding-3-large via Foundry
