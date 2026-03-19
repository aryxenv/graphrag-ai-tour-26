#!/usr/bin/env pwsh
# Post-provision hook: indexes RAG data into the newly provisioned AI Search
# and increases the server Container App ingress timeout.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "`n=== Post-Provision: RAG Indexing ===" -ForegroundColor Cyan

# Env vars AZURE_AI_SEARCH_ENDPOINT, AZURE_OPENAI_ENDPOINT, AZURE_COGNITIVE_SERVICES_ENDPOINT
# are automatically available from Bicep outputs via azd environment.

Push-Location rag
try {
    Write-Host "Installing RAG dependencies..."
    uv venv --quiet 2>$null
    uv pip install -r requirements.txt --quiet
    Write-Host "Running RAG indexing pipeline..."
    uv run python src/index.py
} finally {
    Pop-Location
}

Write-Host "`n=== Post-Provision: Server Ingress Timeout ===" -ForegroundColor Cyan

$serverName = azd env get-value SERVICE_SERVER_URI 2>$null
if ($serverName) {
    $rgName = "rg-$(azd env get-value AZURE_ENV_NAME)"
    $apps = az containerapp list --resource-group $rgName -o json 2>$null | ConvertFrom-Json
    $serverApp = ($apps | Where-Object { $_.tags.'azd-service-name' -eq 'server' }).name
    if ($serverApp) {
        Write-Host "Setting server ingress timeout to 600s..."
        az containerapp ingress update --name $serverApp --resource-group $rgName --target-port 8000 --transport auto --proxy-request-timeout 600 2>$null
        Write-Host "Done."
    }
}

Write-Host "`n=== Post-Provision Complete ===" -ForegroundColor Green
