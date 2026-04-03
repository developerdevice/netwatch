import 'server-only'

import { INITIAL_MAPS } from '@/lib/mock-data'
import {
  createPersistedTopologyDocument,
  type PersistedTopologyDocument,
  restorePersistedTopologyDocument,
} from '@/lib/netwatch/topology-state'
import { NetworkMap } from '@/lib/types'
import { getSqliteDatabase } from '@/lib/server/db/sqlite'

interface TopologyStateRow {
  value: string
}

export interface StoredTopologyState {
  maps: NetworkMap[]
  seeded: boolean
}

function getTopologyStorageKey(serverId: string) {
  return `topology:${serverId}`
}

function readDocument(serverId: string): PersistedTopologyDocument | null {
  const db = getSqliteDatabase()
  const row = db
    .prepare('SELECT value FROM app_state WHERE key = ?')
    .get(getTopologyStorageKey(serverId)) as TopologyStateRow | undefined

  if (!row) return null

  return JSON.parse(row.value) as PersistedTopologyDocument
}

function writeDocument(serverId: string, document: PersistedTopologyDocument) {
  const db = getSqliteDatabase()

  db.prepare(`
    INSERT INTO app_state (key, value, updated_at)
    VALUES (@key, @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run({
    key: getTopologyStorageKey(serverId),
    value: JSON.stringify(document),
    updatedAt: new Date().toISOString(),
  })
}

export function loadStoredTopology(serverId: string): StoredTopologyState {
  const document = readDocument(serverId)

  if (!document) {
    const seededDocument = createPersistedTopologyDocument(INITIAL_MAPS)
    writeDocument(serverId, seededDocument)

    return {
      maps: restorePersistedTopologyDocument(seededDocument),
      seeded: true,
    }
  }

  return {
    maps: restorePersistedTopologyDocument(document),
    seeded: false,
  }
}

export function saveStoredTopology(serverId: string, maps: NetworkMap[]) {
  writeDocument(serverId, createPersistedTopologyDocument(maps))
}
