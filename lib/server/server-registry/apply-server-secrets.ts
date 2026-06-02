import 'server-only'

import {
  upsertServerSecrets,
  type UpsertSecretsResult,
} from '@/lib/server/server-registry/credentials-repository'
import {
  extractSecretsPatch,
  secretsPayloadErrorMessage,
  type ServerRegistryPayload,
} from '@/lib/server/server-registry/server-secrets-payload'
import { getRegisteredServer } from '@/lib/server/server-registry/repository'

export function applyServerSecretsFromPayload(
  serverId: string,
  payload: ServerRegistryPayload
): UpsertSecretsResult {
  const patch = extractSecretsPatch(payload)
  if (Object.keys(patch).length === 0) {
    return { ok: true }
  }
  return upsertServerSecrets(serverId, patch)
}

export function secretsResultToHttpStatus(code: string): number {
  if (code === 'ENCRYPTION_NOT_CONFIGURED' || code === 'ENCRYPTION_KEY_INVALID') return 503
  return 400
}

export function buildSecretsErrorResponse(result: Extract<UpsertSecretsResult, { ok: false }>) {
  return {
    ok: false as const,
    error: {
      code: result.code,
      message: secretsPayloadErrorMessage(result.code),
    },
    status: secretsResultToHttpStatus(result.code),
  }
}

export function getServerAfterSecrets(serverId: string) {
  return getRegisteredServer(serverId)
}
