import { describe, expect, it } from 'vitest'

import { normalizePingTargetIpv4, normalizeStrictIpv4 } from './safe-ipv4'

describe('normalizeStrictIpv4', () => {
  it('aceita IPv4 canonico', () => {
    expect(normalizeStrictIpv4('192.168.0.1')).toBe('192.168.0.1')
    expect(normalizeStrictIpv4('0.0.0.0')).toBe('0.0.0.0')
    expect(normalizeStrictIpv4('255.255.255.255')).toBe('255.255.255.255')
  })

  it('rejeita injecao e formatos perigosos', () => {
    expect(normalizeStrictIpv4('192.168.1.1; /ip')).toBeNull()
    expect(normalizeStrictIpv4('192.168.1.1 =foo=bar')).toBeNull()
    expect(normalizeStrictIpv4('10.0.0.1\n/ip')).toBeNull()
    expect(normalizeStrictIpv4('192.168.01.1')).toBeNull()
    expect(normalizeStrictIpv4('192.168.1')).toBeNull()
    expect(normalizeStrictIpv4('256.1.1.1')).toBeNull()
    expect(normalizeStrictIpv4('')).toBeNull()
    expect(normalizeStrictIpv4('0')).toBeNull()
    expect(normalizeStrictIpv4(' 10.0.0.1')).toBeNull()
  })
})

describe('normalizePingTargetIpv4', () => {
  it('rejeita 0.0.0.0 como alvo', () => {
    expect(normalizePingTargetIpv4('0.0.0.0')).toBeNull()
  })

  it('aceita host valido', () => {
    expect(normalizePingTargetIpv4('8.8.8.8')).toBe('8.8.8.8')
  })
})
