import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('secrets encryption', () => {
  beforeEach(() => {
    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  })

  afterEach(() => {
    delete process.env.NETWATCH_SECRETS_ENCRYPTION_KEY
  })

  it('isSecretsEncryptionConfigured exige chave de 32 bytes', async () => {
    const { isSecretsEncryptionConfigured } = await import('./secrets')

    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = 'valor-invalido'
    expect(isSecretsEncryptionConfigured()).toBe(false)

    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    expect(isSecretsEncryptionConfigured()).toBe(true)
  })

  it('round-trip encrypt and decrypt', async () => {
    const { encryptSecret, decryptSecret } = await import('./secrets')
    const plain = 'router-monitor-s3cret!'
    expect(decryptSecret(encryptSecret(plain))).toBe(plain)
  })
})
