import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('secrets encryption', () => {
  beforeEach(() => {
    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  })

  afterEach(() => {
    delete process.env.NETWATCH_SECRETS_ENCRYPTION_KEY
  })

  it('round-trip encrypt and decrypt', async () => {
    const { encryptSecret, decryptSecret } = await import('./secrets')
    const plain = 'router-monitor-s3cret!'
    expect(decryptSecret(encryptSecret(plain))).toBe(plain)
  })
})
