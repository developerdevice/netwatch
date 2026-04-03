import 'server-only'

export type ApiClientDriver = 'routerboard'

export interface ApiClientConfig {
  driver: ApiClientDriver
  enabled: boolean
  timeoutMs: number
}

const DEFAULT_TIMEOUT_MS = 10_000

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === '') return fallback
  return value === 'true'
}

function parseTimeout(value: string | undefined): number {
  if (!value) return DEFAULT_TIMEOUT_MS

  const timeout = Number(value)

  if (!Number.isFinite(timeout) || timeout <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return timeout
}

export function getApiClientConfig(env: NodeJS.ProcessEnv = process.env): ApiClientConfig {
  return {
    driver: 'routerboard',
    enabled: parseBoolean(env.NETWATCH_API_ENABLED, false),
    timeoutMs: parseTimeout(env.NETWATCH_API_TIMEOUT_MS),
  }
}
