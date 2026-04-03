import { describe, expect, it } from 'vitest'

import { normalizeServerConnectHost } from './safe-server-host'

describe('normalizeServerConnectHost', () => {
  it('aceita IPv4 e hostname DNS', () => {
    expect(normalizeServerConnectHost('192.168.1.1')).toBe('192.168.1.1')
    expect(normalizeServerConnectHost('router.lan')).toBe('router.lan')
    expect(normalizeServerConnectHost('My-Gateway.local')).toBe('my-gateway.local')
  })

  it('rejeita caracteres de injecao e hostnames invalidos', () => {
    expect(normalizeServerConnectHost('host;rm')).toBeNull()
    expect(normalizeServerConnectHost('host name')).toBeNull()
    expect(normalizeServerConnectHost('')).toBeNull()
    expect(normalizeServerConnectHost('-bad.com')).toBeNull()
  })
})
