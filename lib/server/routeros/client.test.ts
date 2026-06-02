import { describe, expect, it } from 'vitest'

import { parseRouterOsLatencyToMs, summarizePingReplies } from './client'
import type { RouterOsReplySentence } from './client'

describe('parseRouterOsLatencyToMs', () => {
  it('converte microssegundos para milissegundos', () => {
    expect(parseRouterOsLatencyToMs('217us')).toBeCloseTo(0.217, 5)
    expect(parseRouterOsLatencyToMs('207 us')).toBeCloseTo(0.207, 5)
    expect(parseRouterOsLatencyToMs('500μs')).toBeCloseTo(0.5, 5)
  })

  it('mantém milissegundos e segundos', () => {
    expect(parseRouterOsLatencyToMs('12ms')).toBe(12)
    expect(parseRouterOsLatencyToMs('1.5 ms')).toBe(1.5)
    expect(parseRouterOsLatencyToMs('2s')).toBe(2000)
  })

  it('assume ms quando a unidade não vem no valor', () => {
    expect(parseRouterOsLatencyToMs('45')).toBe(45)
    expect(parseRouterOsLatencyToMs('45.2')).toBe(45.2)
  })

  it('ignora textos sem latência numérica', () => {
    expect(parseRouterOsLatencyToMs('timeout')).toBeUndefined()
    expect(parseRouterOsLatencyToMs('host unreachable')).toBeUndefined()
    expect(parseRouterOsLatencyToMs(undefined)).toBeUndefined()
  })
})

describe('summarizePingReplies', () => {
  it('trata ping MikroTik em microssegundos como latência baixa (online)', () => {
    const replies: RouterOsReplySentence[] = [
      {
        reply: '!re',
        attrs: {
          '=seq': '0',
          '=host': '187.103.71.0',
          '=time': '217us',
        },
        words: [],
      },
      {
        reply: '!re',
        attrs: {
          '=sent': '1',
          '=received': '1',
          '=packet-loss': '0',
        },
        words: [],
      },
    ]

    const summary = summarizePingReplies(replies)
    expect(summary.isUp).toBe(true)
    expect(summary.latencyMs).toBeCloseTo(0.217, 5)
  })
})
