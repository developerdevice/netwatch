import type { ServerSecretsPatch } from '@/lib/server/server-registry/credentials-repository'

export interface ServerRegistryPayload {
  label: string
  host: string
  port: number
  secure?: boolean
  monitorUsername?: string
  monitorPassword?: string
  telegramBotToken?: string
  telegramChatId?: string
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isValidServerRegistryPayload(value: unknown): value is ServerRegistryPayload {
  if (!value || typeof value !== 'object') return false

  const payload = value as Record<string, unknown>
  const optionalStrings = [
    'monitorUsername',
    'monitorPassword',
    'telegramBotToken',
    'telegramChatId',
  ] as const

  for (const key of optionalStrings) {
    if (payload[key] != null && typeof payload[key] !== 'string') return false
  }

  return (
    typeof payload.host === 'string' &&
    typeof payload.label === 'string' &&
    typeof payload.port === 'number' &&
    Number.isInteger(payload.port) &&
    payload.port > 0 &&
    payload.port <= 65535 &&
    (payload.secure == null || typeof payload.secure === 'boolean')
  )
}

export function extractSecretsPatch(payload: ServerRegistryPayload): ServerSecretsPatch {
  const patch: ServerSecretsPatch = {}

  if (nonEmpty(payload.monitorUsername)) patch.monitorUsername = payload.monitorUsername.trim()
  if (nonEmpty(payload.monitorPassword)) patch.monitorPassword = payload.monitorPassword.trim()
  if (nonEmpty(payload.telegramBotToken)) patch.telegramBotToken = payload.telegramBotToken.trim()
  if (nonEmpty(payload.telegramChatId)) patch.telegramChatId = payload.telegramChatId.trim()

  return patch
}

export function secretsPayloadErrorMessage(code: string): string {
  switch (code) {
    case 'ENCRYPTION_NOT_CONFIGURED':
      return 'Configure NETWATCH_SECRETS_ENCRYPTION_KEY no servidor para salvar credenciais de monitor ou Telegram.'
    case 'ENCRYPTION_KEY_INVALID':
      return 'NETWATCH_SECRETS_ENCRYPTION_KEY invalida: use exatamente 32 bytes em base64 ou hex (openssl rand -base64 32).'
    case 'MONITOR_PAIR_REQUIRED':
      return 'Informe usuario e senha de monitor juntos, ou deixe ambos vazios.'
    case 'TELEGRAM_PAIR_REQUIRED':
      return 'Informe token e chat ID do Telegram juntos, ou deixe ambos vazios.'
    case 'MONITOR_USERNAME_PASSWORD_REQUIRED':
      return 'Credenciais de monitor exigem usuario e senha na primeira configuracao.'
    default:
      return 'Nao foi possivel salvar credenciais do servidor.'
  }
}
