---
description: "Use when answering questions or writing code related to Azure services, Azure AI Foundry, GraphRAG, Azure AI Evaluation SDK, or any Microsoft cloud technology. Enforces use of the Microsoft Learn MCP server for accurate, up-to-date guidance."
applyTo: "**"
---

# Microsoft Learn & Azure Rules

- **Always use the Microsoft Learn MCP server** (`microsoft_docs_search`, `microsoft_docs_fetch`, `microsoft_code_sample_search`) before answering Azure or Foundry questions, writing Azure SDK code, or configuring Azure services.
- When the user asks about Azure AI Foundry, Azure AI Evaluation SDK, GraphRAG, Azure OpenAI, Azure AI Search, or any Azure service, search Microsoft Learn first to ground the answer in official documentation — do not rely solely on training data.
- When generating code that uses Azure SDKs (e.g., `azure-ai-evaluation`, `azure-identity`, `azure-search-documents`, `openai`), use `microsoft_code_sample_search` to find official examples before writing code.
- If a Microsoft Learn search returns relevant results, cite the source URL in your response so the user can verify.
- Prefer official Microsoft patterns and best practices over community patterns or Stack Overflow solutions when they conflict.
- When troubleshooting Azure errors, fetch the specific error documentation from Microsoft Learn before suggesting fixes.