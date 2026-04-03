import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('assertServerRegistrySecret', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NETWATCH_SERVER_REGISTRY_SECRET
  })

  it('permite qualquer pedido quando a variavel nao esta definida', async () => {
    const { assertServerRegistrySecret } = await import('./secret')
    const req = new Request('http://localhost/api/servers', { method: 'POST' })
    expect(assertServerRegistrySecret(req)).toBeNull()
  })

  it('rejeita quando a chave esta definida mas o header nao bate', async () => {
    process.env.NETWATCH_SERVER_REGISTRY_SECRET = 'segredo-esperado'
    const { assertServerRegistrySecret } = await import('./secret')
    const req = new Request('http://localhost/api/servers', {
      method: 'POST',
      headers: { 'x-netwatch-server-registry-secret': 'outro' },
    })
    const res = assertServerRegistrySecret(req)
    expect(res).not.toBeNull()
    expect(res!.status).toBe(403)
  })

  it('aceita header correto', async () => {
    process.env.NETWATCH_SERVER_REGISTRY_SECRET = 'segredo-esperado'
    const { assertServerRegistrySecret } = await import('./secret')
    const req = new Request('http://localhost/api/servers', {
      method: 'POST',
      headers: { 'x-netwatch-server-registry-secret': 'segredo-esperado' },
    })
    expect(assertServerRegistrySecret(req)).toBeNull()
  })

  it('aceita Authorization Bearer', async () => {
    process.env.NETWATCH_SERVER_REGISTRY_SECRET = 'token-bearer'
    const { assertServerRegistrySecret } = await import('./secret')
    const req = new Request('http://localhost/api/servers', {
      method: 'POST',
      headers: { authorization: 'Bearer token-bearer' },
    })
    expect(assertServerRegistrySecret(req)).toBeNull()
  })
})
