import { NextResponse } from 'next/server'

import { consumeServersRegisterRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { normalizeServerConnectHost } from '@/lib/server/security/safe-server-host'
import { addRegisteredServer, listRegisteredServers } from '@/lib/server/server-registry/repository'
import {
  applyServerSecretsFromPayload,
  buildSecretsErrorResponse,
  getServerAfterSecrets,
} from '@/lib/server/server-registry/apply-server-secrets'
import {
  assertServerRegistrySecret,
  isServerRegistrySecretConfigured,
} from '@/lib/server/server-registry/secret'
import { isValidServerRegistryPayload } from '@/lib/server/server-registry/server-secrets-payload'

export const runtime = 'nodejs'

const MAX_SERVER_LABEL_LEN = 120

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      servers: listRegisteredServers(),
      registrySecretRequired: isServerRegistrySecretConfigured(),
    },
  })
}

export async function POST(request: Request) {
  try {
    const limit = await consumeServersRegisterRateLimit(request)
    if (!limit.ok) {
      return rateLimitedResponse(limit.retryAfterSec)
    }

    const secretResponse = assertServerRegistrySecret(request)
    if (secretResponse) return secretResponse

    const payload = await request.json()
    if (!isValidServerRegistryPayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_SERVER_PAYLOAD',
            message: 'Informe nome, host e porta validos para cadastrar o servidor.',
          },
        },
        { status: 400 }
      )
    }

    const label = payload.label.trim()
    if (label.length < 1 || label.length > MAX_SERVER_LABEL_LEN) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_SERVER_LABEL',
            message: 'Nome do servidor deve ter entre 1 e 120 caracteres.',
          },
        },
        { status: 400 }
      )
    }

    const hostNorm = normalizeServerConnectHost(payload.host)
    if (!hostNorm) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_SERVER_HOST',
            message: 'Host invalido: use IPv4 ou hostname DNS (sem espacos nem caracteres especiais).',
          },
        },
        { status: 400 }
      )
    }

    const server = addRegisteredServer({
      label,
      host: hostNorm,
      port: payload.port,
      secure: payload.secure,
    })

    const secretsResult = applyServerSecretsFromPayload(server.id, payload)
    if (!secretsResult.ok) {
      const err = buildSecretsErrorResponse(secretsResult)
      return NextResponse.json({ ok: err.ok, error: err.error }, { status: err.status })
    }

    const refreshed = getServerAfterSecrets(server.id) ?? server

    return NextResponse.json({
      ok: true,
      data: {
        server: refreshed,
      },
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SERVER_REGISTRY_SAVE_FAILED',
          message: 'Nao foi possivel salvar o servidor cadastrado.',
        },
      },
      { status: 500 }
    )
  }
}
