import 'server-only'

import { NextResponse } from 'next/server'

export function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas requisicoes. Tente novamente em instantes.',
      },
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  )
}
