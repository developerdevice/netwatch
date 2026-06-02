import { NextResponse } from 'next/server'

import { getCurrentServerSession } from '@/lib/server/auth/session'
import { consumeStatusRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { loadStoredTopology } from '@/lib/server/map-repository/topology-repository'
import { pingDevicesForServer } from '@/lib/server/monitoring/ping-devices'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const limit = await consumeStatusRateLimit(request)
  if (!limit.ok) {
    return rateLimitedResponse(limit.retryAfterSec)
  }

  const session = await getCurrentServerSession()
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessao MikroTik nao encontrada.',
        },
      },
      { status: 401 }
    )
  }

  const { maps } = loadStoredTopology(session.serverId)
  const devices = maps.flatMap(map => map.devices)

  try {
    const snapshots = await pingDevicesForServer(devices, {
      host: session.host,
      port: session.port,
      secure: session.secure,
      username: session.username,
      password: session.password,
    })

    return NextResponse.json({
      ok: true,
      data: {
        devices: snapshots,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'DEVICE_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Falha ao consultar status dos dispositivos.',
        },
      },
      { status: 500 }
    )
  }
}
