import { describe, expect, it } from 'vitest'

import { formatLatencyLabel } from './latency'

describe('formatLatencyLabel', () => {
  it('formata microssegundos', () => {
    expect(formatLatencyLabel(0.217)).toBe('217 µs')
  })

  it('formata milissegundos', () => {
    expect(formatLatencyLabel(12)).toBe('12 ms')
  })
})
