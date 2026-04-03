import { NextResponse } from 'next/server'

import { clearCurrentServerSession } from '@/lib/server/auth/session'

export const runtime = 'nodejs'

export async function POST() {
  await clearCurrentServerSession()

  return NextResponse.json({
    ok: true,
    data: {
      loggedOut: true,
    },
  })
}
