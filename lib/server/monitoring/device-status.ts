import type { DeviceStatus } from '@/lib/types'

export function deriveStatusFromPing(latencyMs: number | undefined, isUp: boolean): DeviceStatus {
  if (!isUp) return 'offline'
  if (latencyMs != null && latencyMs >= 200) return 'warning'
  return 'online'
}

export function displayLatencyMs(latencyMs: number | undefined): number | undefined {
  if (latencyMs == null) return undefined
  if (latencyMs < 10) return Math.round(latencyMs * 100) / 100
  return Math.round(latencyMs)
}

export function isOutageStatus(status: DeviceStatus): boolean {
  return status === 'offline'
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`
  const hours = Math.floor(min / 60)
  const remMin = min % 60
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`
}
