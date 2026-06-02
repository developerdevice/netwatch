import { NextResponse } from 'next/server'

import { getCurrentServerSession } from '@/lib/server/auth/session'
import { listDeviceStatusEvents } from '@/lib/server/monitoring/monitor-repository'

export const runtime = 'nodejs'

export async function GET(request: Request) {
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

  const deviceId = new URL(request.url).searchParams.get('deviceId')?.trim()
  if (!deviceId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DEVICE_ID',
          message: 'deviceId nao informado.',
        },
      },
      { status: 400 }
    )
  }

  const events = listDeviceStatusEvents(session.serverId, deviceId)

  return NextResponse.json({
    ok: true,
    data: {
      entries: events.map(event => ({
        timestamp: event.changedAt,
        status: event.newStatus,
        latency: event.latencyMs,
        previousStatus: event.previousStatus,
      })),
    },
  })
}
