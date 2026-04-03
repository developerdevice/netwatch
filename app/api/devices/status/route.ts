import { NextResponse } from 'next/server'

import { getCurrentServerSession } from '@/lib/server/auth/session'
import { consumeStatusRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { loadStoredTopology } from '@/lib/server/map-repository/topology-repository'
import { connectAuthenticatedRouterOsClient, summarizePingReplies } from '@/lib/server/routeros/client'
import { normalizePingTargetIpv4 } from '@/lib/server/security/safe-ipv4'
import { Device, DeviceStatus } from '@/lib/types'

export const runtime = 'nodejs'

interface DeviceSnapshot {
  deviceId: string
  mapId: string
  status: DeviceStatus
  latency?: number
}

function deriveStatusFromPing(latencyMs: number | undefined, isUp: boolean): DeviceStatus {
  if (!isUp) return 'offline'
  if (latencyMs != null && latencyMs >= 200) return 'warning'
  return 'online'
}

function getStatusPingConcurrency() {
  const raw = Number(process.env.NETWATCH_STATUS_PING_CONCURRENCY)
  if (Number.isFinite(raw) && raw >= 1 && raw <= 64) {
    return Math.floor(raw)
  }
  return 12
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return []

  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) break
      results[i] = await worker(items[i])
    }
  }

  const poolSize = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: poolSize }, () => runWorker()))
  return results
}

type ActiveServerSession = NonNullable<Awaited<ReturnType<typeof getCurrentServerSession>>>

async function pingDeviceOnce(device: Device, session: ActiveServerSession): Promise<DeviceSnapshot> {
  const addr = normalizePingTargetIpv4(device.ip ?? '')
  if (!addr) {
    return {
      deviceId: device.id,
      mapId: device.mapId,
      status: 'unknown',
      latency: undefined,
    }
  }

  const client = await connectAuthenticatedRouterOsClient(
    {
      host: session.host,
      port: session.port,
      secure: session.secure,
    },
    session.username,
    session.password
  )

  try {
    const replies = await client.talk(['/ping', `=address=${addr}`, '=count=1'])
    const ping = summarizePingReplies(replies)
    const latency = ping.latencyMs != null ? Math.round(ping.latencyMs) : undefined

    return {
      deviceId: device.id,
      mapId: device.mapId,
      status: deriveStatusFromPing(latency, ping.isUp),
      latency,
    }
  } finally {
    await client.close().catch(() => undefined)
  }
}

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

  const unknownSnapshots: DeviceSnapshot[] = []
  const toPing: Device[] = []

  for (const device of devices) {
    if (!normalizePingTargetIpv4(device.ip ?? '')) {
      unknownSnapshots.push({
        deviceId: device.id,
        mapId: device.mapId,
        status: 'unknown',
        latency: undefined,
      })
      continue
    }
    toPing.push(device)
  }

  try {
    const concurrency = getStatusPingConcurrency()
    const pingSnapshots =
      toPing.length === 0
        ? []
        : await mapWithConcurrency(toPing, concurrency, device => pingDeviceOnce(device, session))

    return NextResponse.json({
      ok: true,
      data: {
        devices: [...unknownSnapshots, ...pingSnapshots],
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
