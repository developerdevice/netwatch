import 'server-only'

import { randomUUID } from 'node:crypto'

import { DeviceStatus } from '@/lib/types'
import { getSqliteDatabase } from '@/lib/server/db/sqlite'

export interface DeviceMonitorState {
  serverId: string
  deviceId: string
  mapId: string
  status: DeviceStatus
  latencyMs?: number
  statusSince: string
}

export interface DeviceStatusEvent {
  id: string
  serverId: string
  deviceId: string
  deviceLabel: string
  mapId: string
  previousStatus: DeviceStatus | null
  newStatus: DeviceStatus
  latencyMs?: number
  changedAt: string
}

interface StateRow {
  server_id: string
  device_id: string
  map_id: string
  status: string
  latency_ms: number | null
  status_since: string
}

export function getDeviceMonitorState(
  serverId: string,
  deviceId: string
): DeviceMonitorState | null {
  const db = getSqliteDatabase()
  const row = db
    .prepare(
      'SELECT * FROM device_monitor_state WHERE server_id = ? AND device_id = ?'
    )
    .get(serverId, deviceId) as StateRow | undefined

  if (!row) return null

  return {
    serverId: row.server_id,
    deviceId: row.device_id,
    mapId: row.map_id,
    status: row.status as DeviceStatus,
    latencyMs: row.latency_ms ?? undefined,
    statusSince: row.status_since,
  }
}

export function upsertDeviceMonitorState(state: DeviceMonitorState) {
  const db = getSqliteDatabase()
  db.prepare(`
    INSERT INTO device_monitor_state (server_id, device_id, map_id, status, latency_ms, status_since)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(server_id, device_id) DO UPDATE SET
      map_id = excluded.map_id,
      status = excluded.status,
      latency_ms = excluded.latency_ms,
      status_since = excluded.status_since
  `).run(
    state.serverId,
    state.deviceId,
    state.mapId,
    state.status,
    state.latencyMs ?? null,
    state.statusSince
  )
}

export function insertStatusChangeEvent(event: Omit<DeviceStatusEvent, 'id'>) {
  const db = getSqliteDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO device_status_events (
      id, server_id, device_id, device_label, map_id,
      previous_status, new_status, latency_ms, changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.serverId,
    event.deviceId,
    event.deviceLabel,
    event.mapId,
    event.previousStatus,
    event.newStatus,
    event.latencyMs ?? null,
    event.changedAt
  )
  return id
}

export function listDeviceStatusEvents(
  serverId: string,
  deviceId: string,
  limit = 100
): DeviceStatusEvent[] {
  const db = getSqliteDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM device_status_events
       WHERE server_id = ? AND device_id = ?
       ORDER BY changed_at DESC
       LIMIT ?`
    )
    .all(serverId, deviceId, limit) as {
    id: string
    server_id: string
    device_id: string
    device_label: string
    map_id: string
    previous_status: string | null
    new_status: string
    latency_ms: number | null
    changed_at: string
  }[]

  return rows.map(row => ({
    id: row.id,
    serverId: row.server_id,
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    mapId: row.map_id,
    previousStatus: row.previous_status as DeviceStatus | null,
    newStatus: row.new_status as DeviceStatus,
    latencyMs: row.latency_ms ?? undefined,
    changedAt: row.changed_at,
  }))
}

export function deleteMonitorDataForServer(serverId: string) {
  const db = getSqliteDatabase()
  db.prepare('DELETE FROM device_monitor_state WHERE server_id = ?').run(serverId)
  db.prepare('DELETE FROM device_status_events WHERE server_id = ?').run(serverId)
}
