#!/usr/bin/env pwsh
# Pre-provision hook: captures the deploying user's principal ID for RBAC.

$principalId = az ad signed-in-user show --query id -o tsv 2>$null
if ($principalId) {
    Write-Host "Deployer principal ID: $principalId"
    azd env set AZURE_DEPLOYER_PRINCIPAL_ID $principalId
} else {
    Write-Host "Warning: Could not determine deployer principal ID. RBAC for postprovision hook may fail." -ForegroundColor Yellow
}
