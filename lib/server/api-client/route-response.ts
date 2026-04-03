import 'server-only'

import { NextResponse } from 'next/server'

import { ApiClientError } from '@/lib/server/api-client/errors'

export function toApiSuccessResponse<T>(data: T) {
  return NextResponse.json({
    ok: true,
    data,
  })
}

export function toApiErrorResponse(error: unknown) {
  if (error instanceof ApiClientError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    )
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Ocorreu um erro inesperado ao processar a requisicao.',
      },
    },
    { status: 500 }
  )
}
