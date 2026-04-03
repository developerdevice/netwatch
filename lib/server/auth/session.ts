import 'server-only'

import { randomUUID } from 'node:crypto'

import { cookies } from 'next/headers'

import { getSessionStore } from '@/lib/server/auth/session-store-factory'
import { SESSION_COOKIE_NAME } from '@/lib/server/auth/session-types'
import type { MutableServerSession } from '@/lib/server/auth/session-types'
import { ActiveServerSessionSummary, RegisteredRouterServer } from '@/lib/types'

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8

function getSessionTtlMs() {
  const value = Number(process.env.NETWATCH_SESSION_TTL_MS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SESSION_TTL_MS
}

function getSessionIdFromCookieStore(cookieStore: { get(name: string): { value: string } | undefined }) {
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}

export async function createServerSession({
  server,
  username,
  password,
}: {
  server: RegisteredRouterServer
  username: string
  password: string
}) {
  const store = getSessionStore()
  await store.cleanupExpired()

  const sessionId = randomUUID()
  const ttlMs = getSessionTtlMs()
  const nextSession: MutableServerSession = {
    sessionId,
    serverId: server.id,
    serverLabel: server.label,
    host: server.host,
    port: server.port,
    secure: server.secure,
    username,
    password,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  }

  await store.set(nextSession)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false,
    maxAge: Math.floor(ttlMs / 1000),
  })

  return toActiveServerSessionSummary(nextSession)
}

export function toActiveServerSessionSummary(session: ActiveServerSessionSummary) {
  return {
    serverId: session.serverId,
    serverLabel: session.serverLabel,
    host: session.host,
    port: session.port,
    secure: session.secure,
    username: session.username,
  }
}

export async function getCurrentServerSession() {
  const store = getSessionStore()
  await store.cleanupExpired()
  const cookieStore = await cookies()
  const sessionId = getSessionIdFromCookieStore(cookieStore)
  if (!sessionId) return null

  const session = await store.get(sessionId)
  if (!session) return null

  if (session.expiresAt <= Date.now()) {
    await store.delete(sessionId)
    return null
  }

  return session
}

export async function getCurrentServerSessionSummary() {
  const session = await getCurrentServerSession()
  return session ? toActiveServerSessionSummary(session) : null
}

export async function clearCurrentServerSession() {
  const store = getSessionStore()
  const cookieStore = await cookies()
  const sessionId = getSessionIdFromCookieStore(cookieStore)
  if (sessionId) {
    await store.delete(sessionId)
  }

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false,
    maxAge: 0,
  })
}
