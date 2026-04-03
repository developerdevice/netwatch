import 'server-only'

import { ApiClient } from '@/lib/server/api-client/contracts'
import { getApiClientConfig } from '@/lib/server/api-client/config'
import { RouterboardApiClient } from '@/lib/server/api-client/routerboard-client'

let apiClientInstance: ApiClient | null = null

export function createApiClient(): ApiClient {
  const config = getApiClientConfig()

  switch (config.driver) {
    case 'routerboard':
    default:
      return new RouterboardApiClient(config)
  }
}

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = createApiClient()
  }

  return apiClientInstance
}

export type { ApiClient, ApiClientTopologySnapshot } from '@/lib/server/api-client/contracts'
export { ApiClientError, ApiClientNotConfiguredError } from '@/lib/server/api-client/errors'
export { getApiClientConfig } from '@/lib/server/api-client/config'
