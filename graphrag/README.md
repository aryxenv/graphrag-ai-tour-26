# GraphRAG Backend

This directory contains the GraphRAG indexing pipeline and search configuration used by the demo. It processes the source corpus (currently _A Christmas Carol_ by Charles Dickens) into a structured knowledge graph and exposes multiple search methods over it.

## How It Works

1. **Chunking**: The input text is split into 1200-token chunks with 100-token overlap using the `o200k_base` tokenizer.
2. **Entity and relationship extraction**: GPT-4.1 reads each chunk and extracts typed entities (`organization`, `person`, `geo`, `event`) and the relationships between them, guided by the prompt in `prompts/extract_graph.txt`.
3. **Description summarization**: When multiple chunks mention the same entity, their descriptions are merged into a single summary (max 500 tokens) via `prompts/summarize_descriptions.txt`.
4. **Community detection**: The entity graph is clustered (max cluster size 10). Each community gets an LLM-generated report summarizing its members and themes.
5. **Embedding**: Text units and entity descriptions are embedded with `text-embedding-3-large` and stored in a LanceDB vector store for retrieval.

## Directory Layout

```
settings.yaml    Pipeline and model configuration
requirements.txt Python dependencies (graphrag, pandas)
source.py        Utility script to look up cited entities/reports by ID
input/           Source documents (book.txt)
output/          Indexed artifacts (parquet files, LanceDB, stats)
prompts/         All LLM prompt templates
cache/           Cached LLM responses (keyed by content hash)
logs/            Pipeline run logs
```

## Output Artifacts

After indexing, the `output/` directory contains:

| File                        | Contents                                              |
| --------------------------- | ----------------------------------------------------- |
| `entities.parquet`          | Extracted entities with type, description, embeddings |
| `relationships.parquet`     | Entity-to-entity relationships with descriptions      |
| `communities.parquet`       | Graph community assignments                           |
| `community_reports.parquet` | LLM-generated summaries per community                 |
| `text_units.parquet`        | Source text chunks with metadata                      |
| `documents.parquet`         | Document-level metadata                               |
| `lancedb/`                  | Vector index for embedding-based retrieval            |
| `context.json`              | Serialized graph context for the frontend Explore tab |

## Search Methods

The pipeline supports four search modes, each with its own prompt template:

- **Local search**: Retrieves relevant text units and entities via embedding similarity, then generates an answer grounded in that local context. Best for specific, fact-based questions.
- **Global search**: Map-reduce over community reports. The map step scores each report's relevance; the reduce step synthesizes a final answer. Best for broad, summarization-style questions.
- **DRIFT search**: Iteratively refines the query using graph structure, drifting through related communities to gather diverse context. Good for exploratory or ambiguous questions.
- **Basic search**: Simple vector similarity search over text units. Serves as the vanilla RAG baseline in the Ask tab comparison.

## Configuration

### Model Deployments

Before running the pipeline, deploy two models in your Azure AI Foundry project:

1. **GPT-4.1**: Used for entity extraction, description summarization, community reports, and all search queries. Deploy it with the deployment name `gpt-4.1`.
2. **text-embedding-3-large**: Used for embedding text units and entity descriptions. Deploy it with the deployment name `text-embedding-3-large`.

If you are new to Foundry and don't know how to deploy a model yet, refer to this guide: [How to deploy a Foundry Model](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/deploy-foundry-models#deploy-a-model)

The deployment names must match what is in `settings.yaml` (`azure_deployment_name` fields). If you use different names, update the config accordingly.

The default auth method is `azure_managed_identity`. Make sure your identity has the **Cognitive Services OpenAI User** role on the resource (must be logged in with [azure cli](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows?view=azure-cli-latest&pivots=winget)). If you prefer key-based auth, switch `auth_method` to `api_key` in `settings.yaml` and set `GRAPHRAG_API_KEY` in your `.env` file. (not recommended to use key-based auth)

### Pipeline Settings

All model and pipeline settings are in `settings.yaml`. Key sections:

- **completion_models / embedding_models**: Azure OpenAI endpoints, deployment names, and auth method.
- **chunking**: Token size, overlap, and encoding model.
- **extract_graph**: Entity types to extract and number of gleaning passes.
- **community_reports**: Max output and input lengths for community summaries.
- **vector_store**: LanceDB path for the embedding index.

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

The `.env` file requires three variables:

```
GRAPHRAG_API_KEY=<API_KEY>
AZURE_OPENAI_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.openai.azure.com/
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://<YOUR_FOUNDRY_RESOURCE_NAME>.cognitiveservices.azure.com/
```

Keep the `GRAPHRAG_API_KEY` as it is (or paste API key there if you are using key-based auth -> NOT recommended), replace `<YOUR_FOUNDRY_RESOURCE_NAME>` with the name of your Azure AI Foundry resource. If you are using key-based auth instead of managed identity, also set `GRAPHRAG_API_KEY` and update `auth_method` in `settings.yaml`.

## Running the Pipeline

```bash
# Activate the virtual environment
.venv/Scripts/Activate.ps1   # Windows
source .venv/bin/activate     # macOS/Linux

# Run indexing (builds the full knowledge graph)
graphrag index

# Query the graph
graphrag query --method local "Who is Ebenezer Scrooge?"
graphrag query --method global "What are the major themes?"
```

See the [GraphRAG docs](https://microsoft.github.io/graphrag/) for the full CLI reference and advanced configuration options.

## Looking Up Citations

GraphRAG answers include citations like `[Data: Entities (59, 12); Reports (6)]`. These reference the `human_readable_id` column (not the UUID). Use `source.py` to resolve them:

```bash
python source.py
```

Edit the `cited_entity_ids` and `cited_report_ids` lists in the script to look up different citations.

## References

- [GraphRAG Github - Microsoft Research](https://github.com/microsoft/graphrag): Open-source repository for the GraphRAG project by Microsoft Research.
- [GraphRAG - Microsoft Research](https://microsoft.github.io/graphrag/): GraphRAG website.
- [Microsoft Foundry Portal](ai.azure.com): Microsoft Foundry portal to manage end-to-end lifecycle of AI models powered by Azure.

_This documentation was generated with the help of AI_
