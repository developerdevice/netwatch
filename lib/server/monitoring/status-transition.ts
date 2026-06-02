import type { Device, DeviceStatus } from '@/lib/types'
import {
  getDeviceMonitorState,
  insertStatusChangeEvent,
  upsertDeviceMonitorState,
} from '@/lib/server/monitoring/monitor-repository'
import type { DevicePingSnapshot } from '@/lib/server/monitoring/ping-devices'

export interface StatusTransitionResult {
  changed: boolean
  previousStatus: DeviceStatus | null
  newStatus: DeviceStatus
}

export function applyDeviceStatusSnapshot(
  serverId: string,
  device: Pick<Device, 'id' | 'label' | 'mapId'>,
  snapshot: DevicePingSnapshot
): StatusTransitionResult {
  const previous = getDeviceMonitorState(serverId, device.id)
  const previousStatus = previous?.status ?? null
  const changed = previousStatus !== snapshot.status

  const now = new Date().toISOString()

  upsertDeviceMonitorState({
    serverId,
    deviceId: device.id,
    mapId: snapshot.mapId,
    status: snapshot.status,
    latencyMs: snapshot.latency,
    statusSince: changed ? now : (previous?.statusSince ?? now),
  })

  if (changed) {
    insertStatusChangeEvent({
      serverId,
      deviceId: device.id,
      deviceLabel: device.label,
      mapId: snapshot.mapId,
      previousStatus,
      newStatus: snapshot.status,
      latencyMs: snapshot.latency,
      changedAt: now,
    })
  }

  return {
    changed,
    previousStatus,
    newStatus: snapshot.status,
  }
}
