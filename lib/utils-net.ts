import { DeviceStatus } from './types'

export function formatBps(bps: number): string {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} Kbps`
  return `${bps} bps`
}

export function statusColor(status: DeviceStatus): string {
  switch (status) {
    case 'online': return 'var(--status-online)'
    case 'offline': return 'var(--status-offline)'
    case 'warning': return 'var(--status-warning)'
    default: return 'var(--status-unknown)'
  }
}

export function statusColorHex(status: DeviceStatus): string {
  switch (status) {
    case 'online': return '#34d399'
    case 'offline': return '#f87171'
    case 'warning': return '#fbbf24'
    default: return '#94a3b8'
  }
}

export function statusLabel(status: DeviceStatus): string {
  switch (status) {
    case 'online': return 'Online'
    case 'offline': return 'Offline'
    case 'warning': return 'Atenção'
    default: return 'Desconhecido'
  }
}

let idCounter = 0
export function generateId(): string {
  return `id_${Date.now()}_${++idCounter}`
}
