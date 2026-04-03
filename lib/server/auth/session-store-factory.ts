import 'server-only'

import { isRedisConfigured } from '@/lib/server/redis/client'
import { memorySessionStore } from '@/lib/server/auth/session-memory-store'
import { redisSessionStore } from '@/lib/server/auth/session-redis-store'
import type { SessionStore } from '@/lib/server/auth/session-types'

function getBackend(): 'memory' | 'redis' {
  const raw = process.env.NETWATCH_SESSION_BACKEND?.trim().toLowerCase()
  if (raw === 'redis') return 'redis'
  return 'memory'
}

export function getSessionStore(): SessionStore {
  if (getBackend() === 'redis') {
    if (!isRedisConfigured()) {
      throw new Error(
        'NETWATCH_SESSION_BACKEND=redis exige NETWATCH_REDIS_URL com uma URL Redis valida.'
      )
    }
    return redisSessionStore
  }
  return memorySessionStore
}
