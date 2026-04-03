import { NextResponse } from 'next/server'

import { requireServerSession, requireStoredTopology } from '@/lib/server/map-repository/session-topology-guard'
import { saveStoredTopology } from '@/lib/server/map-repository/topology-repository'
import { validateTopologyDeviceIps } from '@/lib/server/security/topology-device-ips'
import { NetworkMap } from '@/lib/types'

export const runtime = 'nodejs'

function isTopologyPayload(value: unknown): value is { maps: NetworkMap[] } {
  if (!value || typeof value !== 'object') return false

  return Array.isArray((value as { maps?: unknown }).maps)
}

export async function GET() {
  const result = await requireStoredTopology()
  if (!result.ok) return result.response

  return NextResponse.json({
    ok: true,
    data: result.topology,
  })
}

export async function PUT(request: Request) {
  try {
    const auth = await requireServerSession()
    if (!auth.ok) return auth.response
    const { session } = auth

    const payload = await request.json()

    if (!isTopologyPayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_TOPOLOGY_PAYLOAD',
            message: 'O corpo da requisicao deve conter um array em maps.',
          },
        },
        { status: 400 }
      )
    }

    const ipCheck = validateTopologyDeviceIps(payload.maps)
    if (!ipCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_DEVICE_IP_IN_TOPOLOGY',
            message: ipCheck.message,
          },
        },
        { status: 400 }
      )
    }

    saveStoredTopology(session.serverId, payload.maps)

    return NextResponse.json({
      ok: true,
      data: {
        saved: true,
      },
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'TOPOLOGY_SAVE_FAILED',
          message: 'Nao foi possivel salvar a topologia.',
        },
      },
      { status: 500 }
    )
  }
}
