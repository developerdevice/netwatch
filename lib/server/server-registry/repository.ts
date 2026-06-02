import 'server-only'

import { randomUUID } from 'node:crypto'

import { RegisteredRouterServer } from '@/lib/types'
import { getSqliteDatabase } from '@/lib/server/db/sqlite'
import { getServerConfigFlags } from '@/lib/server/server-registry/credentials-repository'
import { deleteMonitorDataForServer } from '@/lib/server/monitoring/monitor-repository'
import { deleteServerSecrets } from '@/lib/server/server-registry/credentials-repository'

const SERVER_REGISTRY_KEY = 'server_registry'

interface StoredRow {
  value: string
}

interface PersistedServerRecord {
  id: string
  label: string
  host: string
  port: number
  secure: boolean
}

interface PersistedServerRegistryDocument {
  version: 1
  servers: PersistedServerRecord[]
}

function toPersistedRecord(server: RegisteredRouterServer): PersistedServerRecord {
  return {
    id: server.id,
    label: server.label,
    host: server.host,
    port: server.port,
    secure: server.secure,
  }
}

function readDocument(): PersistedServerRegistryDocument | null {
  const db = getSqliteDatabase()
  const row = db
    .prepare('SELECT value FROM app_state WHERE key = ?')
    .get(SERVER_REGISTRY_KEY) as StoredRow | undefined

  if (!row) return null
  return JSON.parse(row.value) as PersistedServerRegistryDocument
}

function writeDocument(document: PersistedServerRegistryDocument) {
  const db = getSqliteDatabase()

  db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run({
    key: SERVER_REGISTRY_KEY,
    value: JSON.stringify(document),
    updatedAt: new Date().toISOString(),
  })
}

function withConfigFlags(server: Omit<RegisteredRouterServer, 'monitorConfigured' | 'telegramConfigured'>): RegisteredRouterServer {
  const flags = getServerConfigFlags(server.id)
  return {
    ...server,
    monitorConfigured: flags.monitorConfigured,
    telegramConfigured: flags.telegramConfigured,
  }
}

export function listRegisteredServers(): RegisteredRouterServer[] {
  const servers = readDocument()?.servers ?? []
  return servers.map(server =>
    withConfigFlags({
      id: server.id,
      label: server.label,
      host: server.host,
      port: server.port,
      secure: server.secure,
    })
  )
}

export function getRegisteredServer(serverId: string) {
  return listRegisteredServers().find(server => server.id === serverId) ?? null
}

export interface CreateRegisteredServerInput {
  label: string
  host: string
  port: number
  secure?: boolean
}

export function addRegisteredServer(input: CreateRegisteredServerInput) {
  const currentServers = listRegisteredServers()
  const normalizedHost = input.host.trim()
  const normalizedPort = input.port

  const duplicate = currentServers.find(
    server => server.host === normalizedHost && server.port === normalizedPort
  )

  if (duplicate) {
    return duplicate
  }

  const base = {
    id: randomUUID(),
    label: input.label.trim() || normalizedHost,
    host: normalizedHost,
    port: normalizedPort,
    secure: input.secure ?? normalizedPort === 8729,
  }
  const nextServer = withConfigFlags(base)

  writeDocument({
    version: 1,
    servers: [...currentServers.map(toPersistedRecord), toPersistedRecord(nextServer)],
  })

  return nextServer
}

export type UpdateRegisteredServerResult =
  | { ok: true; server: RegisteredRouterServer }
  | { ok: false; reason: 'not_found' | 'duplicate' }

export function updateRegisteredServer(id: string, input: CreateRegisteredServerInput): UpdateRegisteredServerResult {
  const currentServers = listRegisteredServers()
  const index = currentServers.findIndex(server => server.id === id)
  if (index === -1) return { ok: false, reason: 'not_found' }

  const normalizedHost = input.host.trim()
  const normalizedPort = input.port

  const duplicate = currentServers.find(
    (server, i) => i !== index && server.host === normalizedHost && server.port === normalizedPort
  )
  if (duplicate) {
    return { ok: false, reason: 'duplicate' }
  }

  const previous = currentServers[index]
  const nextServer = withConfigFlags({
    id: previous.id,
    label: input.label.trim() || normalizedHost,
    host: normalizedHost,
    port: normalizedPort,
    secure: input.secure ?? normalizedPort === 8729,
  })

  const nextServers = [...currentServers]
  nextServers[index] = nextServer

  writeDocument({
    version: 1,
    servers: nextServers.map(toPersistedRecord),
  })

  return { ok: true, server: nextServer }
}

export function removeRegisteredServer(id: string): boolean {
  const currentServers = listRegisteredServers()
  const nextServers = currentServers.filter(server => server.id !== id)
  if (nextServers.length === currentServers.length) return false

  writeDocument({
    version: 1,
    servers: nextServers.map(toPersistedRecord),
  })

  deleteServerSecrets(id)
  deleteMonitorDataForServer(id)

  return true
}
