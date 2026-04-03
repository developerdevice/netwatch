import { getApiClientConfig } from '@/lib/server/api-client'
import { toApiSuccessResponse } from '@/lib/server/api-client/route-response'
import { requireServerSession } from '@/lib/server/map-repository/session-topology-guard'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireServerSession()
  if (!auth.ok) return auth.response

  return toApiSuccessResponse({
    enabled: getApiClientConfig().enabled,
    driver: getApiClientConfig().driver,
  })
}
