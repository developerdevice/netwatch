import { requireStoredTopology } from '@/lib/server/map-repository/session-topology-guard'
import { toApiSuccessResponse } from '@/lib/server/api-client/route-response'

export const runtime = 'nodejs'

export async function GET() {
  const result = await requireStoredTopology()
  if (!result.ok) return result.response

  const links = result.topology.maps.flatMap(m => m.links)
  return toApiSuccessResponse(links)
}
