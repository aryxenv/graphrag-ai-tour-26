targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (used for resource naming)')
param environmentName string

@minLength(1)
@description('Azure region for all resources')
param location string

@description('Principal ID of the deploying user (for RBAC on data plane)')
param deployerPrincipalId string = ''

var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

// AI Services (Azure OpenAI + Embeddings)
module aiServices 'modules/ai-services.bicep' = {
  scope: rg
  name: 'ai-services'
  params: {
    name: 'ai-${resourceToken}'
    location: location
    tags: tags
  }
}

// Azure AI Search
module aiSearch 'modules/ai-search.bicep' = {
  scope: rg
  name: 'ai-search'
  params: {
    name: 'search-${resourceToken}'
    location: location
    tags: tags
  }
}

// Storage Account
module storage 'modules/storage.bicep' = {
  scope: rg
  name: 'storage'
  params: {
    name: 'st${resourceToken}'
    location: location
    tags: tags
  }
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  scope: rg
  name: 'log-analytics'
  params: {
    name: 'log-${resourceToken}'
    location: location
    tags: tags
  }
}

// Container Registry
module containerRegistry 'modules/container-registry.bicep' = {
  scope: rg
  name: 'container-registry'
  params: {
    name: 'cr${resourceToken}'
    location: location
    tags: tags
  }
}

// Container Apps Environment
module containerAppsEnvironment 'modules/container-apps-environment.bicep' = {
  scope: rg
  name: 'container-apps-environment'
  params: {
    name: 'cae-${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Server Container App
module serverApp 'modules/container-app.bicep' = {
  scope: rg
  name: 'server-container-app'
  params: {
    name: 'server-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'server' })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryLoginServer: containerRegistry.outputs.loginServer
    containerRegistryName: containerRegistry.outputs.name
    targetPort: 8000
    env: [
      { name: 'AZURE_OPENAI_ENDPOINT', value: aiServices.outputs.openAiEndpoint }
      { name: 'AZURE_COGNITIVE_SERVICES_ENDPOINT', value: aiServices.outputs.cognitiveServicesEndpoint }
      { name: 'AZURE_AI_SEARCH_ENDPOINT', value: aiSearch.outputs.endpoint }
      { name: 'AZURE_BLOB_STORAGE_ENDPOINT', value: storage.outputs.blobEndpoint }
      { name: 'GRAPHRAG_API_KEY', value: '<API_KEY>' }
    ]
    secrets: []
    minReplicas: 1
  }
}

// Client Container App
module clientApp 'modules/container-app.bicep' = {
  scope: rg
  name: 'client-container-app'
  params: {
    name: 'client-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'client' })
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryLoginServer: containerRegistry.outputs.loginServer
    containerRegistryName: containerRegistry.outputs.name
    targetPort: 80
    env: [
      { name: 'API_BASE_URL', value: 'https://${serverApp.outputs.fqdn}/api' }
    ]
    secrets: []
  }
}

// RBAC: Grant server managed identity access to all services
module roleAssignments 'modules/role-assignments.bicep' = {
  scope: rg
  name: 'role-assignments'
  params: {
    principalId: serverApp.outputs.principalId
    deployerPrincipalId: deployerPrincipalId
    aiServicesName: aiServices.outputs.name
    aiSearchName: aiSearch.outputs.name
    storageAccountName: storage.outputs.name
  }
}

// Outputs required by azd
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output SERVICE_SERVER_URI string = 'https://${serverApp.outputs.fqdn}'
output SERVICE_CLIENT_URI string = 'https://${clientApp.outputs.fqdn}'
output AZURE_OPENAI_ENDPOINT string = aiServices.outputs.openAiEndpoint
output AZURE_COGNITIVE_SERVICES_ENDPOINT string = aiServices.outputs.cognitiveServicesEndpoint
output AZURE_AI_SEARCH_ENDPOINT string = aiSearch.outputs.endpoint
output AZURE_BLOB_STORAGE_ENDPOINT string = storage.outputs.blobEndpoint
