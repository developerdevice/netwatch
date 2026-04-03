import { Device, DeviceStatus, NetworkMap } from '@/lib/types'

export interface StatusSummary {
  total: number
  up: number
  down: number
  warning: number
}

export function getAggregateStatus(devices: Pick<Device, 'status'>[]): DeviceStatus {
  if (devices.length === 0) return 'unknown'

  const offlineCount = devices.filter(device => device.status === 'offline').length
  const warningCount = devices.filter(device => device.status === 'warning').length

  if (offlineCount === devices.length) return 'offline'
  if (offlineCount > devices.length / 2) return 'offline'
  if (offlineCount > 0 || warningCount > 0) return 'warning'

  return 'online'
}

export function getMapStatuses(maps: NetworkMap[]): Record<string, DeviceStatus> {
  return Object.fromEntries(maps.map(map => [map.id, getAggregateStatus(map.devices)]))
}

export function getStatusSummary(devices: Pick<Device, 'status'>[]): StatusSummary {
  const total = devices.length
  const up = devices.filter(device => device.status === 'online').length
  const down = devices.filter(device => device.status === 'offline').length
  const warning = devices.filter(device => device.status === 'warning').length

  return {
    total,
    up,
    down,
    warning,
  }
}

export function getSubmapNodeStatuses(maps: NetworkMap[]): Record<string, DeviceStatus> {
  const mapById = new Map(maps.map(map => [map.id, map]))
  const statuses: Record<string, DeviceStatus> = {}

  for (const map of maps) {
    for (const node of map.submapNodes) {
      const targetMap = mapById.get(node.targetMapId)
      statuses[node.id] = getAggregateStatus(targetMap?.devices ?? [])
    }
  }

  return statuses
}
