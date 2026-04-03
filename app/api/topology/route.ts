import { requireStoredTopology } from '@/lib/server/map-repository/session-topology-guard'
import { toApiSuccessResponse } from '@/lib/server/api-client/route-response'
import type { ApiClientTopologySnapshot } from '@/lib/server/api-client/contracts'

export const runtime = 'nodejs'

export async function GET() {
  const result = await requireStoredTopology()
  if (!result.ok) return result.response

  const { maps } = result.topology
  const devices = maps.flatMap(m => m.devices)
  const links = maps.flatMap(m => m.links)

  const snapshot: ApiClientTopologySnapshot = {
    maps,
    devices,
    links,
    fetchedAt: new Date().toISOString(),
    source: 'stored',
  }

  return toApiSuccessResponse(snapshot)
}
