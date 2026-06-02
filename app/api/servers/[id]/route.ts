import { NextResponse } from 'next/server'

import { consumeServersRegisterRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { normalizeServerConnectHost } from '@/lib/server/security/safe-server-host'
import {
  removeRegisteredServer,
  updateRegisteredServer,
} from '@/lib/server/server-registry/repository'
import {
  applyServerSecretsFromPayload,
  buildSecretsErrorResponse,
  getServerAfterSecrets,
} from '@/lib/server/server-registry/apply-server-secrets'
import { assertServerRegistrySecret } from '@/lib/server/server-registry/secret'
import { isValidServerRegistryPayload } from '@/lib/server/server-registry/server-secrets-payload'

export const runtime = 'nodejs'

const MAX_SERVER_LABEL_LEN = 120

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const limit = await consumeServersRegisterRateLimit(request)
    if (!limit.ok) {
      return rateLimitedResponse(limit.retryAfterSec)
    }

    const secretResponse = assertServerRegistrySecret(request)
    if (secretResponse) return secretResponse

    const { id } = await context.params
    const serverId = id?.trim()
    if (!serverId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'INVALID_SERVER_ID', message: 'Identificador de servidor invalido.' },
        },
        { status: 400 }
      )
    }

    const payload = await request.json()
    if (!isValidServerRegistryPayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_SERVER_PAYLOAD',
            message: 'Informe nome, host e porta validos para atualizar o servidor.',
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

    const result = updateRegisteredServer(serverId, {
      label,
      host: hostNorm,
      port: payload.port,
      secure: payload.secure,
    })

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return NextResponse.json(
          {
            ok: false,
            error: { code: 'SERVER_NOT_FOUND', message: 'Servidor nao encontrado no registo.' },
          },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SERVER_HOST_DUPLICATE',
            message: 'Ja existe outro servidor com o mesmo host e porta.',
          },
        },
        { status: 409 }
      )
    }

    const secretsResult = applyServerSecretsFromPayload(serverId, payload)
    if (!secretsResult.ok) {
      const err = buildSecretsErrorResponse(secretsResult)
      return NextResponse.json({ ok: err.ok, error: err.error }, { status: err.status })
    }

    const refreshed = getServerAfterSecrets(serverId) ?? result.server

    return NextResponse.json({
      ok: true,
      data: { server: refreshed },
    })
  } catch (error) {
    console.error('[servers PATCH]', error)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SERVER_REGISTRY_UPDATE_FAILED',
          message: 'Nao foi possivel atualizar o servidor cadastrado.',
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const limit = await consumeServersRegisterRateLimit(request)
    if (!limit.ok) {
      return rateLimitedResponse(limit.retryAfterSec)
    }

    const secretResponse = assertServerRegistrySecret(request)
    if (secretResponse) return secretResponse

    const { id } = await context.params
    const serverId = id?.trim()
    if (!serverId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'INVALID_SERVER_ID', message: 'Identificador de servidor invalido.' },
        },
        { status: 400 }
      )
    }

    const removed = removeRegisteredServer(serverId)
    if (!removed) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'SERVER_NOT_FOUND', message: 'Servidor nao encontrado no registo.' },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, data: { removed: true } })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SERVER_REGISTRY_DELETE_FAILED',
          message: 'Nao foi possivel remover o servidor cadastrado.',
        },
      },
      { status: 500 }
    )
  }
}
