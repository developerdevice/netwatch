import 'server-only'

import { NextResponse } from 'next/server'

import { getCurrentServerSession } from '@/lib/server/auth/session'
import { loadStoredTopology, type StoredTopologyState } from '@/lib/server/map-repository/topology-repository'

type ActiveServerSession = NonNullable<Awaited<ReturnType<typeof getCurrentServerSession>>>

function unauthorizedResponse() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Sessao MikroTik nao encontrada.',
      },
    },
    { status: 401 }
  )
}

export async function requireServerSession(): Promise<
  | { ok: true; session: ActiveServerSession }
  | { ok: false; response: NextResponse }
> {
  const session = await getCurrentServerSession()
  if (!session) {
    return { ok: false, response: unauthorizedResponse() }
  }
  return { ok: true, session }
}

export async function requireStoredTopology(): Promise<
  | { ok: true; session: ActiveServerSession; topology: StoredTopologyState }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireServerSession()
  if (!auth.ok) return auth

  return {
    ok: true,
    session: auth.session,
    topology: loadStoredTopology(auth.session.serverId),
  }
}
