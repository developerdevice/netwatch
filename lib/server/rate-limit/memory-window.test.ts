import { describe, expect, it } from 'vitest'

import { consumeMemoryWindow } from '@/lib/server/rate-limit/memory-window'

describe('consumeMemoryWindow', () => {
  it('permite ate o limite e bloqueia depois', () => {
    const key = `test-${Math.random()}`
    expect(consumeMemoryWindow(key, 2, 60_000).ok).toBe(true)
    expect(consumeMemoryWindow(key, 2, 60_000).ok).toBe(true)
    const blocked = consumeMemoryWindow(key, 2, 60_000)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0)
    }
  })
})
