import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { NETWATCH_SERVER_REGISTRY_SECRET_HEADER } from '@/lib/constants/server-registry'
import { NextResponse } from 'next/server'

export function isServerRegistrySecretConfigured(): boolean {
  return Boolean(process.env.NETWATCH_SERVER_REGISTRY_SECRET?.trim())
}

function getProvidedServerRegistrySecret(request: Request): string | null {
  const header = request.headers.get(NETWATCH_SERVER_REGISTRY_SECRET_HEADER)?.trim()
  if (header) return header

  const auth = request.headers.get('authorization')?.trim()
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    return token.length > 0 ? token : null
  }

  return null
}

function utf8TimingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function serverRegistrySecretForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'SERVER_REGISTRY_SECRET_INVALID',
        message:
          'Chave de administracao do registo ausente ou invalida.',
      },
    },
    { status: 403 }
  )
}

export function assertServerRegistrySecret(request: Request): NextResponse | null {
  const expected = process.env.NETWATCH_SERVER_REGISTRY_SECRET?.trim()
  if (!expected) return null

  const provided = getProvidedServerRegistrySecret(request)
  if (!provided || !utf8TimingSafeEqual(provided, expected)) {
    return serverRegistrySecretForbiddenResponse()
  }

  return null
}
