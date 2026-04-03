import 'server-only'

import type { MutableServerSession, SessionStore } from '@/lib/server/auth/session-types'

const globalSessions = globalThis as typeof globalThis & {
  __netwatchServerSessions?: Map<string, MutableServerSession>
}

function getMap() {
  if (!globalSessions.__netwatchServerSessions) {
    globalSessions.__netwatchServerSessions = new Map()
  }
  return globalSessions.__netwatchServerSessions
}

export const memorySessionStore: SessionStore = {
  async get(sessionId: string) {
    return getMap().get(sessionId) ?? null
  },

  async set(session: MutableServerSession) {
    getMap().set(session.sessionId, session)
  },

  async delete(sessionId: string) {
    getMap().delete(sessionId)
  },

  async cleanupExpired() {
    const map = getMap()
    const now = Date.now()
    for (const [id, session] of map.entries()) {
      if (session.expiresAt <= now) {
        map.delete(id)
      }
    }
  },
}
