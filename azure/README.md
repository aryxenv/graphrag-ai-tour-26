# Azure Deployment Guide

Deploy the GraphRAG Demo (React client + FastAPI server) to **Azure Container Apps** using the Azure Developer CLI (`azd`).

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Azure Container Apps Environment        │
│                                                 │
│  ┌──────────────────┐   ┌────────────────────┐  │
│  │  client (nginx)   │──▶│  server (FastAPI)  │  │
│  │  port 80          │   │  port 8000         │  │
│  └──────────────────┘   └────────────────────┘  │
│                                │                 │
└────────────────────────────────│─────────────────┘
                                 │
                        Auto-provisioned services:
                        • AI Services (gpt-4.1 + embeddings)
                        • Azure AI Search
                        • Azure Storage Account
                        • Azure Container Registry
```

**Everything is provisioned by this template** — AI Services with model deployments, AI Search, Storage Account, Container Registry, Container Apps Environment, and two Container Apps. No pre-existing resources needed.

## Prerequisites

- [Azure Developer CLI (`azd`)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd) v1.0+
- [Azure CLI (`az`)](https://learn.microsoft.com/cli/azure/install-azure-cli) with Bicep
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Azure subscription with quota for Azure OpenAI models (`gpt-4.1`, `text-embedding-3-large`)

## Deploy

```bash
# 1. Authenticate (if not already)
azd auth login

# 2. Deploy everything
azd up
```

That's it. `azd up` will prompt for an **environment name** and **Azure region**, then:

1. **Provision** all infrastructure (AI Services, AI Search, Storage, ACR, Container Apps)
2. **Deploy** model deployments (`gpt-4.1` + `text-embedding-3-large` at 500K TPM each)
3. **Post-provision hook** automatically:
   - Indexes RAG data into the new AI Search instance (`rag-index`)
   - Sets server ingress timeout to 600s for long-running GraphRAG queries
4. **Build** Docker images for client and server
5. **Push** images to Azure Container Registry
6. **Deploy** both Container Apps with auto-configured environment variables
7. **Assign RBAC** roles to the server's managed identity

> The first deployment takes ~10–15 minutes. Subsequent deploys (`azd deploy`) are faster since infrastructure already exists.

## What Gets Configured Automatically

| Setting | How It's Set |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Derived from provisioned AI Services account |
| `AZURE_COGNITIVE_SERVICES_ENDPOINT` | Derived from provisioned AI Services account |
| `AZURE_AI_SEARCH_ENDPOINT` | Derived from provisioned AI Search service |
| `AZURE_BLOB_STORAGE_ENDPOINT` | Derived from provisioned Storage Account |
| `GRAPHRAG_API_KEY` | Hardcoded to `<API_KEY>` (placeholder for GraphRAG compatibility) |
| `API_BASE_URL` (client) | Derived from server Container App FQDN |
| `rag-index` (AI Search) | Auto-populated by postprovision hook |
| RBAC roles | Auto-assigned to server managed identity |

## Common Operations

```bash
# Redeploy code changes only (no infra changes)
azd deploy

# Redeploy a single service
azd deploy --service server
azd deploy --service client

# View deployment outputs (endpoints, URIs)
azd env get-values

# Stream server logs
az containerapp logs show \
  --name <server-app-name> \
  --resource-group rg-<env-name> \
  --follow

# Tear down everything
azd down
```

## Troubleshooting

| Issue | Fix |
|---|---|
| **Model deployment fails** | Your subscription may lack quota for `gpt-4.1` or `text-embedding-3-large` in the selected region. Try a different region or request quota increase. |
| **Client shows blank page** | Check browser console; redeploy with `azd deploy --service client` |
| **Docker build fails** | Ensure Docker Desktop is running |
| **`azd up` fails on Bicep** | Run `az bicep upgrade` to update Bicep CLI |

## Infrastructure Details

All Bicep files live in `azure/`:

```
azure/
├── main.bicep                              # Orchestrator (subscription-scoped)
├── main.parameters.json                    # Only 2 params: env name + location
└── modules/
    ├── ai-services.bicep                   # AI Services + model deployments
    ├── ai-search.bicep                     # Azure AI Search (Basic)
    ├── storage.bicep                       # Storage Account + feedback container
    ├── container-registry.bicep            # Azure Container Registry (Basic)
    ├── log-analytics.bicep                 # Log Analytics Workspace
    ├── container-apps-environment.bicep    # Container Apps Environment
    ├── container-app.bicep                 # Reusable Container App module
    └── role-assignments.bicep              # RBAC for server managed identity
```

Key design choices:

- Both **server** and **client** have `minReplicas: 1` (always warm) to avoid cold-start latency.
- **GraphRAG data** (parquet + LanceDB, ~9 MB) is baked into the server Docker image.
- **Runtime API URL injection** — the client nginx entrypoint replaces the default API URL with the actual server FQDN at container startup.
- **RBAC is auto-assigned** — Cognitive Services OpenAI User, Search Index Data Reader/Contributor, Storage Blob Data Contributor.

_This documentation was generated with the help of AI_
