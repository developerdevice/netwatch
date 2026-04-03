import { NextResponse } from 'next/server'

import { getCurrentServerSessionSummary } from '@/lib/server/auth/session'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      session: await getCurrentServerSessionSummary(),
    },
  })
}
