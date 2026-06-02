import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('credentials repository', () => {
  let tempDir = ''

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'netwatch-credentials-'))
    process.env.NETWATCH_SQLITE_PATH = path.join(tempDir, 'netwatch.sqlite')
    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NETWATCH_SQLITE_PATH
    delete process.env.NETWATCH_SECRETS_ENCRYPTION_KEY
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.resetModules()
  })

  it('salva monitor e telegram e expoe flags', async () => {
    const { upsertServerSecrets, getServerConfigFlags, getMonitorCredentials } = await import(
      './credentials-repository'
    )

    const result = upsertServerSecrets('srv-1', {
      monitorUsername: 'monitor',
      monitorPassword: 'pass',
      telegramBotToken: 'token',
      telegramChatId: '12345',
    })
    expect(result.ok).toBe(true)

    expect(getServerConfigFlags('srv-1')).toEqual({
      monitorConfigured: true,
      telegramConfigured: true,
    })

    const creds = getMonitorCredentials('srv-1')
    expect(creds?.monitorUsername).toBe('monitor')
    expect(creds?.monitorPassword).toBe('pass')
    expect(creds?.telegramBotToken).toBe('token')
    expect(creds?.telegramChatId).toBe('12345')
  })

  it('rejeita chave de criptografia invalida sem lancar excecao', async () => {
    process.env.NETWATCH_SECRETS_ENCRYPTION_KEY = 'chave-curta'
    vi.resetModules()

    const { upsertServerSecrets } = await import('./credentials-repository')
    const result = upsertServerSecrets('srv-1', {
      monitorUsername: 'ELITE',
      monitorPassword: 'ELT2014@',
    })

    expect(result).toEqual({ ok: false, code: 'ENCRYPTION_NOT_CONFIGURED' })
  })

  it('patch parcial mantem senha de monitor quando omitida', async () => {
    const { upsertServerSecrets, getMonitorCredentials } = await import('./credentials-repository')

    upsertServerSecrets('srv-1', {
      monitorUsername: 'monitor',
      monitorPassword: 'original',
    })

    upsertServerSecrets('srv-1', {
      monitorUsername: 'monitor',
    })

    const creds = getMonitorCredentials('srv-1')
    expect(creds?.monitorPassword).toBe('original')
  })
})
