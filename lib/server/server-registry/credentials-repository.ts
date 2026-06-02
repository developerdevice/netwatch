import 'server-only'

import { decryptSecret, encryptSecret, isSecretsEncryptionConfigured } from '@/lib/server/crypto/secrets'
import { getSqliteDatabase } from '@/lib/server/db/sqlite'

export interface MonitorCredentials {
  monitorUsername: string
  monitorPassword: string
  telegramBotToken: string | null
  telegramChatId: string | null
}

export interface ServerSecretsPatch {
  monitorUsername?: string
  monitorPassword?: string
  telegramBotToken?: string
  telegramChatId?: string
}

interface SecretsRow {
  server_id: string
  monitor_username: string
  monitor_password_enc: string
  telegram_bot_token_enc: string | null
  telegram_chat_id: string | null
}

function nonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function getServerConfigFlags(serverId: string): {
  monitorConfigured: boolean
  telegramConfigured: boolean
} {
  const db = getSqliteDatabase()
  const row = db
    .prepare(
      `SELECT telegram_bot_token_enc, telegram_chat_id
       FROM server_monitor_secrets WHERE server_id = ?`
    )
    .get(serverId) as Pick<SecretsRow, 'telegram_bot_token_enc' | 'telegram_chat_id'> | undefined

  if (!row) {
    return { monitorConfigured: false, telegramConfigured: false }
  }

  return {
    monitorConfigured: getMonitorCredentials(serverId) != null,
    telegramConfigured: Boolean(row.telegram_bot_token_enc && row.telegram_chat_id),
  }
}

export function listServerIdsWithMonitorCredentials(): string[] {
  const db = getSqliteDatabase()
  const rows = db
    .prepare(
      `SELECT server_id FROM server_monitor_secrets
       WHERE monitor_username IS NOT NULL AND monitor_username != ''
         AND monitor_password_enc IS NOT NULL AND monitor_password_enc != ''`
    )
    .all() as { server_id: string }[]
  return rows.map(row => row.server_id)
}

export function getMonitorCredentials(serverId: string): MonitorCredentials | null {
  const db = getSqliteDatabase()
  const row = db
    .prepare('SELECT * FROM server_monitor_secrets WHERE server_id = ?')
    .get(serverId) as SecretsRow | undefined

  if (!row?.monitor_username?.trim() || !row.monitor_password_enc) return null

  return {
    monitorUsername: row.monitor_username,
    monitorPassword: decryptSecret(row.monitor_password_enc),
    telegramBotToken: row.telegram_bot_token_enc ? decryptSecret(row.telegram_bot_token_enc) : null,
    telegramChatId: row.telegram_chat_id,
  }
}

export type UpsertSecretsResult =
  | { ok: true }
  | { ok: false; code: 'ENCRYPTION_NOT_CONFIGURED' | 'MONITOR_PAIR_REQUIRED' | 'TELEGRAM_PAIR_REQUIRED' | 'MONITOR_USERNAME_PASSWORD_REQUIRED' }

export function upsertServerSecrets(serverId: string, patch: ServerSecretsPatch): UpsertSecretsResult {
  if (!isSecretsEncryptionConfigured()) {
    const needsSecrets =
      nonEmpty(patch.monitorUsername) ||
      nonEmpty(patch.monitorPassword) ||
      nonEmpty(patch.telegramBotToken) ||
      nonEmpty(patch.telegramChatId)

    if (needsSecrets) {
      return { ok: false, code: 'ENCRYPTION_NOT_CONFIGURED' }
    }
    return { ok: true }
  }

  const hasMonitorUser = nonEmpty(patch.monitorUsername)
  const hasMonitorPass = nonEmpty(patch.monitorPassword)
  if (hasMonitorUser !== hasMonitorPass) {
    return { ok: false, code: 'MONITOR_PAIR_REQUIRED' }
  }

  const hasTelegramToken = nonEmpty(patch.telegramBotToken)
  const hasTelegramChat = nonEmpty(patch.telegramChatId)
  if (hasTelegramToken !== hasTelegramChat) {
    return { ok: false, code: 'TELEGRAM_PAIR_REQUIRED' }
  }

  const db = getSqliteDatabase()
  const existing = db
    .prepare('SELECT * FROM server_monitor_secrets WHERE server_id = ?')
    .get(serverId) as SecretsRow | undefined

  const monitorUserProvided = hasMonitorUser
  const monitorPassProvided = hasMonitorPass

  if (!existing && (monitorUserProvided || monitorPassProvided)) {
    if (!monitorUserProvided || !monitorPassProvided) {
      return { ok: false, code: 'MONITOR_USERNAME_PASSWORD_REQUIRED' }
    }
  }

  if (!existing && !monitorUserProvided && !hasTelegramToken) {
    return { ok: true }
  }

  let nextUsername = monitorUserProvided
    ? patch.monitorUsername!.trim()
    : existing?.monitor_username ?? ''

  let nextPasswordEnc = existing?.monitor_password_enc ?? ''
  if (monitorPassProvided) {
    nextPasswordEnc = encryptSecret(patch.monitorPassword!.trim())
  } else if (!existing && monitorUserProvided) {
    return { ok: false, code: 'MONITOR_USERNAME_PASSWORD_REQUIRED' }
  }

  let nextTokenEnc = existing?.telegram_bot_token_enc ?? null
  let nextChatId = existing?.telegram_chat_id ?? null

  if (hasTelegramToken && hasTelegramChat) {
    nextTokenEnc = encryptSecret(patch.telegramBotToken!.trim())
    nextChatId = patch.telegramChatId!.trim()
  }

  const hasMonitor = Boolean(nextUsername?.trim() && nextPasswordEnc)
  const hasTelegram = Boolean(nextTokenEnc && nextChatId)

  if (!hasMonitor && !hasTelegram) {
    if (existing) {
      db.prepare('DELETE FROM server_monitor_secrets WHERE server_id = ?').run(serverId)
    }
    return { ok: true }
  }

  if ((monitorUserProvided || monitorPassProvided) && !hasMonitor) {
    return { ok: false, code: 'MONITOR_USERNAME_PASSWORD_REQUIRED' }
  }

  if (!hasMonitor && hasTelegram) {
    nextUsername = ''
    nextPasswordEnc = ''
  }

  db.prepare(`
    INSERT INTO server_monitor_secrets (
      server_id, monitor_username, monitor_password_enc,
      telegram_bot_token_enc, telegram_chat_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(server_id) DO UPDATE SET
      monitor_username = excluded.monitor_username,
      monitor_password_enc = excluded.monitor_password_enc,
      telegram_bot_token_enc = excluded.telegram_bot_token_enc,
      telegram_chat_id = excluded.telegram_chat_id,
      updated_at = excluded.updated_at
  `).run(
    serverId,
    nextUsername || null,
    nextPasswordEnc || null,
    nextTokenEnc,
    nextChatId,
    new Date().toISOString()
  )

  return { ok: true }
}

export function deleteServerSecrets(serverId: string) {
  const db = getSqliteDatabase()
  db.prepare('DELETE FROM server_monitor_secrets WHERE server_id = ?').run(serverId)
}
