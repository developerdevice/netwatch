import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  ENV_KEY,
  ensureEnvEncryptionKey,
  isValidEncryptionKey,
} from './ensure-env-encryption-key.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCRIPT = path.join(__dirname, 'ensure-env-encryption-key.mjs')

const tempPaths = []

function tempEnv(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'netwatch-env-'))
  const envPath = path.join(dir, '.env')
  fs.writeFileSync(envPath, contents, 'utf8')
  tempPaths.push(dir)
  return envPath
}

afterEach(() => {
  for (const dir of tempPaths.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('isValidEncryptionKey', () => {
  it('aceita base64 de 32 bytes', () => {
    const key = Buffer.alloc(32, 9).toString('base64')
    assert.equal(isValidEncryptionKey(key), true)
  })

  it('rejeita string curta', () => {
    assert.equal(isValidEncryptionKey('hyfjdhb34h3jjh'), false)
  })
})

describe('ensureEnvEncryptionKey', () => {
  it('ignora ficheiro inexistente', () => {
    const result = ensureEnvEncryptionKey(path.join(os.tmpdir(), 'missing-netwatch.env'))
    assert.deepEqual(result, { action: 'skip', reason: 'no_file' })
  })

  it('nao altera quando a linha esta comentada', () => {
    const envPath = tempEnv(`FOO=bar\n# ${ENV_KEY}=valor\n`)
    const before = fs.readFileSync(envPath, 'utf8')
    const result = ensureEnvEncryptionKey(envPath)
    assert.deepEqual(result, { action: 'skip', reason: 'commented' })
    assert.equal(fs.readFileSync(envPath, 'utf8'), before)
  })

  it('gera chave quando a linha esta vazia', () => {
    const envPath = tempEnv(`FOO=bar\n${ENV_KEY}=\n`)
    const result = ensureEnvEncryptionKey(envPath)
    assert.equal(result.action, 'generated')
    assert.ok(isValidEncryptionKey(result.value))
    const saved = fs.readFileSync(envPath, 'utf8')
    assert.match(saved, new RegExp(`^${ENV_KEY}=[A-Za-z0-9+/]+=*$`, 'm'))
  })

  it('substitui chave invalida', () => {
    const envPath = tempEnv(`${ENV_KEY}=hyfjdhb34h3jjh\n`)
    const result = ensureEnvEncryptionKey(envPath)
    assert.equal(result.action, 'generated')
    assert.ok(isValidEncryptionKey(result.value))
    assert.doesNotMatch(fs.readFileSync(envPath, 'utf8'), /hyfjdhb34h3jjh/)
  })

  it('mantem chave valida existente', () => {
    const valid = Buffer.alloc(32, 2).toString('base64')
    const envPath = tempEnv(`${ENV_KEY}=${valid}\n`)
    const result = ensureEnvEncryptionKey(envPath)
    assert.deepEqual(result, { action: 'ok', value: valid })
    assert.match(fs.readFileSync(envPath, 'utf8'), new RegExp(`${ENV_KEY}=${valid}`))
  })

  it('adiciona linha quando ausente e sem comentario', () => {
    const envPath = tempEnv('FOO=bar\n')
    const result = ensureEnvEncryptionKey(envPath)
    assert.equal(result.action, 'generated')
    assert.match(fs.readFileSync(envPath, 'utf8'), new RegExp(`^${ENV_KEY}=`, 'm'))
  })
})

describe('CLI --export', () => {
  it('emite export shell com chave valida', () => {
    const envPath = tempEnv(`${ENV_KEY}=\n`)
    const run = spawnSync(process.execPath, [SCRIPT, envPath, '--export', '--quiet'], {
      encoding: 'utf8',
    })
    assert.equal(run.status, 0)
    assert.match(run.stdout, new RegExp(`^export ${ENV_KEY}='[A-Za-z0-9+/]+=*'\n$`))
  })
})
