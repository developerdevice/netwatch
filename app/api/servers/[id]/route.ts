import { NextResponse } from 'next/server'

import { consumeServersRegisterRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { normalizeServerConnectHost } from '@/lib/server/security/safe-server-host'
import {
  removeRegisteredServer,
  updateRegisteredServer,
} from '@/lib/server/server-registry/repository'
import { assertServerRegistrySecret } from '@/lib/server/server-registry/secret'

export const runtime = 'nodejs'

const MAX_SERVER_LABEL_LEN = 120

function isValidPayload(value: unknown): value is { label: string; host: string; port: number; secure?: boolean } {
  if (!value || typeof value !== 'object') return false

  const payload = value as Record<string, unknown>
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
    if (!isValidPayload(payload)) {
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
      ...payload,
      label,
      host: hostNorm,
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

    return NextResponse.json({
      ok: true,
      data: { server: result.server },
    })
  } catch {
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
