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
    );

    CREATE TABLE IF NOT EXISTS server_monitor_secrets (
      server_id TEXT PRIMARY KEY,
      monitor_username TEXT,
      monitor_password_enc TEXT,
      telegram_bot_token_enc TEXT,
      telegram_chat_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_monitor_state (
      server_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      map_id TEXT NOT NULL,
      status TEXT NOT NULL,
      latency_ms REAL,
      status_since TEXT NOT NULL,
      PRIMARY KEY (server_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS device_status_events (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      device_label TEXT NOT NULL,
      map_id TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      latency_ms REAL,
      changed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_device_status_events_lookup
      ON device_status_events (server_id, device_id, changed_at DESC);
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
