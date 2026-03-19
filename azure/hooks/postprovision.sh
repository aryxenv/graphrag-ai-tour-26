#!/bin/sh
# Post-provision hook: indexes RAG data into the newly provisioned AI Search
# and increases the server Container App ingress timeout.

set -e

echo ""
echo "=== Post-Provision: RAG Indexing ==="

cd rag
uv venv --quiet 2>/dev/null || true
uv pip install -r requirements.txt --quiet
uv run python src/index.py
cd ..

echo ""
echo "=== Post-Provision: Server Ingress Timeout ==="

RG_NAME="rg-$(azd env get-value AZURE_ENV_NAME)"
SERVER_APP=$(az containerapp list --resource-group "$RG_NAME" --query "[?tags.\"azd-service-name\"=='server'].name" -o tsv)
if [ -n "$SERVER_APP" ]; then
    echo "Setting server ingress timeout to 600s..."
    az containerapp ingress update --name "$SERVER_APP" --resource-group "$RG_NAME" --target-port 8000 --transport auto --proxy-request-timeout 600 2>/dev/null
    echo "Done."
fi

echo ""
echo "=== Post-Provision Complete ==="