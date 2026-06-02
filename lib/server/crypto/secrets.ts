import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const raw = process.env.NETWATCH_SECRETS_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('NETWATCH_SECRETS_ENCRYPTION_KEY is not configured')
  }

  let key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_LENGTH) {
    key = Buffer.from(raw, 'hex')
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error('NETWATCH_SECRETS_ENCRYPTION_KEY must be 32 bytes (base64 or hex)')
  }
  return key
}

export function isSecretsEncryptionConfigured(): boolean {
  return Boolean(process.env.NETWATCH_SECRETS_ENCRYPTION_KEY?.trim())
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptSecret(ciphertext: string): string {
  const payload = Buffer.from(ciphertext, 'base64')
  const iv = payload.subarray(0, IV_LENGTH)
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
