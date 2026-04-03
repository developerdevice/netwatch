import 'server-only'

import { getRedisClient } from '@/lib/server/redis/client'
import type { MutableServerSession, SessionStore } from '@/lib/server/auth/session-types'

const KEY_PREFIX = 'netwatch:session:'

function key(sessionId: string) {
  return `${KEY_PREFIX}${sessionId}`
}

export const redisSessionStore: SessionStore = {
  async get(sessionId: string) {
    const redis = getRedisClient()
    const raw = await redis.get(key(sessionId))
    if (!raw) return null
    try {
      const session = JSON.parse(raw) as MutableServerSession
      if (session.expiresAt <= Date.now()) {
        await redis.del(key(sessionId))
        return null
      }
      return session
    } catch {
      await redis.del(key(sessionId))
      return null
    }
  },

  async set(session: MutableServerSession) {
    const redis = getRedisClient()
    const ttlMs = Math.max(1, session.expiresAt - Date.now())
    await redis.set(key(session.sessionId), JSON.stringify(session), 'PX', ttlMs)
  },

  async delete(sessionId: string) {
    const redis = getRedisClient()
    await redis.del(key(sessionId))
  },

  async cleanupExpired() {
    /* TTL no Redis remove chaves expiradas */
  },
}
