import 'server-only'

import { getCurrentServerSession } from '@/lib/server/auth/session'
import { loadStoredTopology } from '@/lib/server/map-repository/topology-repository'

export async function getDeviceActionContext(deviceId: string) {
  const session = await getCurrentServerSession()
  if (!session) {
    return {
      ok: false as const,
      status: 401,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sessao MikroTik nao encontrada.',
      },
    }
  }

  const { maps } = loadStoredTopology(session.serverId)
  const device = maps.flatMap(map => map.devices).find(entry => entry.id === deviceId)

  if (!device) {
    return {
      ok: false as const,
      status: 404,
      error: {
        code: 'DEVICE_NOT_FOUND',
        message: 'Dispositivo nao encontrado no mapa atual do servidor.',
      },
    }
  }

  return {
    ok: true as const,
    session,
    device,
  }
}
