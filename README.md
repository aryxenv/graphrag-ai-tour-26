# GraphRAG Interactive Demo

A hands-on demo built for the Microsoft Foundry booth at AI Tour Brussels 2026. Explore how GraphRAG turns unstructured documents into a knowledge graph and compare its answers against vanilla RAG, all through a foundry-like web app.

## Preview

![Foundry x GraphRAG Preview](./foundry_x_graphrag_preview.jpeg)

## What It Does

The app has three tabs:

- **Ask**: Submit a question and see GraphRAG and vanilla RAG answer side by side. Pre-generated questions highlight where GraphRAG excels: multi-hop reasoning, cross-document synthesis, and global summarization.
- **Explore**: Browse a 3D force-directed visualization of a pre-built knowledge graph. Click any node to inspect entities and relationships extracted by GraphRAG.
- **Build**: Walk through the full pipeline end to end. Pick a scenario, generate synthetic corporate memos with a Foundry agent, run GraphRAG indexing, and then query the resulting graph.

## Architecture

- **Frontend**: React 19 with Fluent UI v9, themed to match Foundry branding. Graph visualization powered by `react-force-graph-3d` / Three.js. Built with Vite and TypeScript.
- **Backend**: Python with GraphRAG for indexing and search. Azure OpenAI GPT-4.1 and text-embedding-3-large via Foundry for graph extraction and embeddings.
- **API**: All client-server calls are defined in `client/src/api.ts`. Each function maps to a planned Express endpoint.

## Project Structure

```
client/          React + Vite frontend
graphrag/        GraphRAG indexing config, prompts, cached outputs, and source data
BUILD.md         Detailed technical build notes and endpoint mapping
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Azure OpenAI resource with GPT-4.1 and text-embedding-3-large deployments

### Frontend

```bash
cd client
npm install
npm run dev
```

### GraphRAG Backend

```bash
cd graphrag
python -m venv .venv # or uv venv (if you prefer uv)
.venv/Scripts/Activate.ps1   # Windows
pip install -r requirements.txt
```

Configure your Azure OpenAI connection in `graphrag/settings.yaml`, then run the indexing pipeline. See [graphrag/README.md](graphrag/README.md) for the full pipeline walkthrough, search methods, output artifacts, and CLI usage.

## Additional Details

- [graphrag/README.md](graphrag/README.md): GraphRAG pipeline details, configuration, and search modes
- [BUILD.md](BUILD.md): Full technical breakdown including tab behavior, API endpoint mapping, and stack details
