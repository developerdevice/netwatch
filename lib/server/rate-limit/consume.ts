import 'server-only'

import { getRedisClient, isRedisConfigured } from '@/lib/server/redis/client'
import { getClientIp } from '@/lib/server/rate-limit/client-ip'
import { consumeMemoryWindow } from '@/lib/server/rate-limit/memory-window'

export type RateLimitOutcome = { ok: true } | { ok: false; retryAfterSec: number }

function parsePositiveInt(raw: string | undefined, fallback: number) {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

async function consumeRedisWindow(
  bucket: string,
  ip: string,
  max: number,
  windowSec: number
): Promise<RateLimitOutcome> {
  const redis = getRedisClient()
  const windowId = Math.floor(Date.now() / (windowSec * 1000))
  const key = `netwatch:rl:${bucket}:${ip}:${windowId}`
  const n = await redis.incr(key)
  if (n === 1) {
    await redis.expire(key, windowSec + 1)
  }
  if (n > max) {
    const elapsed = (Date.now() / 1000) % windowSec
    const retryAfterSec = Math.max(1, Math.ceil(windowSec - elapsed))
    return { ok: false, retryAfterSec }
  }
  return { ok: true }
}

export async function consumeLoginRateLimit(request: Request): Promise<RateLimitOutcome> {
  const ip = getClientIp(request)
  const max = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_LOGIN_MAX, 20)
  const windowMs = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_LOGIN_WINDOW_MS, 60_000)
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))

  if (isRedisConfigured()) {
    return consumeRedisWindow('login', ip, max, windowSec)
  }
  return consumeMemoryWindow(`login:${ip}`, max, windowMs)
}

export async function consumeStatusRateLimit(request: Request): Promise<RateLimitOutcome> {
  const ip = getClientIp(request)
  const max = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_STATUS_MAX, 120)
  const windowMs = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_STATUS_WINDOW_MS, 60_000)
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))

  if (isRedisConfigured()) {
    return consumeRedisWindow('status', ip, max, windowSec)
  }
  return consumeMemoryWindow(`status:${ip}`, max, windowMs)
}

export async function consumeServersRegisterRateLimit(request: Request): Promise<RateLimitOutcome> {
  const ip = getClientIp(request)
  const max = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_SERVERS_POST_MAX, 30)
  const windowMs = parsePositiveInt(process.env.NETWATCH_RATE_LIMIT_SERVERS_POST_WINDOW_MS, 60_000)
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))

  if (isRedisConfigured()) {
    return consumeRedisWindow('servers_post', ip, max, windowSec)
  }
  return consumeMemoryWindow(`servers_post:${ip}`, max, windowMs)
}
