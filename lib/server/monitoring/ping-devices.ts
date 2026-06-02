import 'server-only'

import { connectAuthenticatedRouterOsClient, summarizePingReplies } from '@/lib/server/routeros/client'
import { normalizePingTargetIpv4 } from '@/lib/server/security/safe-ipv4'
import { deriveStatusFromPing, displayLatencyMs } from '@/lib/server/monitoring/device-status'
import type { Device, DeviceStatus } from '@/lib/types'

export interface DevicePingSnapshot {
  deviceId: string
  mapId: string
  status: DeviceStatus
  latency?: number
}

export interface MonitorServerTarget {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

export async function pingDevicesForServer(
  devices: Device[],
  target: MonitorServerTarget
): Promise<DevicePingSnapshot[]> {
  const unknownSnapshots: DevicePingSnapshot[] = []
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

  if (toPing.length === 0) return unknownSnapshots

  const client = await connectAuthenticatedRouterOsClient(
    {
      host: target.host,
      port: target.port,
      secure: target.secure,
    },
    target.username,
    target.password
  )

  try {
    const pingSnapshots: DevicePingSnapshot[] = []

    for (const device of toPing) {
      const addr = normalizePingTargetIpv4(device.ip ?? '')!
      try {
        const replies = await client.talk(['/ping', `=address=${addr}`, '=count=1'])
        const ping = summarizePingReplies(replies)
        const latencyMs = ping.latencyMs != null ? displayLatencyMs(ping.latencyMs) : undefined
        const status = deriveStatusFromPing(ping.latencyMs, ping.isUp)

        pingSnapshots.push({
          deviceId: device.id,
          mapId: device.mapId,
          status,
          latency: latencyMs,
        })
      } catch {
        pingSnapshots.push({
          deviceId: device.id,
          mapId: device.mapId,
          status: 'offline',
          latency: undefined,
        })
      }
    }

    return [...unknownSnapshots, ...pingSnapshots]
  } finally {
    await client.close().catch(() => undefined)
  }
}
