import 'server-only'

interface WindowState {
  count: number
  windowStart: number
}

const buckets = new Map<string, WindowState>()

export function consumeMemoryWindow(
  key: string,
  max: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  let state = buckets.get(key)
  if (!state || now - state.windowStart >= windowMs) {
    state = { count: 0, windowStart: now }
    buckets.set(key, state)
  }

  if (state.count >= max) {
    const retryAfterMs = windowMs - (now - state.windowStart)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  state.count += 1
  return { ok: true }
}
