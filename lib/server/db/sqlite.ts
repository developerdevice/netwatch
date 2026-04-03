import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

let databaseInstance: Database.Database | null = null

function getDatabasePath() {
  return process.env.NETWATCH_SQLITE_PATH || path.join(process.cwd(), '.data', 'netwatch.sqlite')
}

function initializeDatabase(db: Database.Database) {
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
}

export function getSqliteDatabase() {
  if (!databaseInstance) {
    const databasePath = getDatabasePath()
    fs.mkdirSync(path.dirname(databasePath), { recursive: true })
    databaseInstance = new Database(databasePath)
    initializeDatabase(databaseInstance)
  }

  return databaseInstance
}
