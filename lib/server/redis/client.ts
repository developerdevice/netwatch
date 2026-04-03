import 'server-only'

import Redis from 'ioredis'

let sharedClient: Redis | null = null

export function isRedisConfigured(): boolean {
  return Boolean(process.env.NETWATCH_REDIS_URL?.trim())
}

export function getRedisClient(): Redis {
  const url = process.env.NETWATCH_REDIS_URL?.trim()
  if (!url) {
    throw new Error('NETWATCH_REDIS_URL nao esta definido.')
  }
  if (!sharedClient) {
    sharedClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    })
  }
  return sharedClient
}
