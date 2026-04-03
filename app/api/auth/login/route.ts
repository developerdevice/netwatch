import { NextResponse } from 'next/server'

import { createServerSession } from '@/lib/server/auth/session'
import { consumeLoginRateLimit } from '@/lib/server/rate-limit/consume'
import { rateLimitedResponse } from '@/lib/server/rate-limit/http'
import { connectAuthenticatedRouterOsClient } from '@/lib/server/routeros/client'
import { getRegisteredServer } from '@/lib/server/server-registry/repository'

export const runtime = 'nodejs'

function isValidPayload(value: unknown): value is { serverId: string; username: string; password: string } {
  if (!value || typeof value !== 'object') return false

  const payload = value as Record<string, unknown>
  return (
    typeof payload.serverId === 'string' &&
    typeof payload.username === 'string' &&
    typeof payload.password === 'string'
  )
}

export async function POST(request: Request) {
  try {
    const limit = await consumeLoginRateLimit(request)
    if (!limit.ok) {
      return rateLimitedResponse(limit.retryAfterSec)
    }

    const payload = await request.json()
    if (!isValidPayload(payload)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'INVALID_LOGIN_PAYLOAD',
            message: 'Selecione um servidor e informe usuario e senha.',
          },
        },
        { status: 400 }
      )
    }

    const server = getRegisteredServer(payload.serverId)
    if (!server) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SERVER_NOT_FOUND',
            message: 'O servidor selecionado nao foi encontrado.',
          },
        },
        { status: 404 }
      )
    }

    const client = await connectAuthenticatedRouterOsClient(server, payload.username.trim(), payload.password)

    try {
      await client.talk(['/system/resource/print', '=.proplist=identity,version'])
    } finally {
      await client.close()
    }

    const session = await createServerSession({
      server,
      username: payload.username.trim(),
      password: payload.password,
    })

    return NextResponse.json({
      ok: true,
      data: {
        session,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error instanceof Error ? error.message : 'Falha ao autenticar no servidor MikroTik.',
        },
      },
      { status: 401 }
    )
  }
}
