#!/usr/bin/env node
/**
 * Garante NETWATCH_SECRETS_ENCRYPTION_KEY valida em .env (Docker prod).
 * Nao altera se a linha estiver comentada com # (escolha do utilizador).
 */

import fs from 'node:fs'
import { randomBytes } from 'node:crypto'

export const ENV_KEY = 'NETWATCH_SECRETS_ENCRYPTION_KEY'
const KEY_LENGTH = 32

const COMMENTED_KEY_RE = /^\s*#\s*NETWATCH_SECRETS_ENCRYPTION_KEY=/
const ACTIVE_KEY_RE = /^\s*NETWATCH_SECRETS_ENCRYPTION_KEY=/

export function isValidEncryptionKey(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return false
  const value = raw.trim()
  let key = Buffer.from(value, 'base64')
  if (key.length !== KEY_LENGTH) {
    key = Buffer.from(value, 'hex')
  }
  return key.length === KEY_LENGTH
}

function parseActiveValue(line) {
  const eq = line.indexOf('=')
  if (eq === -1) return ''
  let value = line.slice(eq + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  return value
}

/**
 * @param {string} envPath
 * @returns {{ action: 'skip' | 'ok' | 'generated'; reason?: string; value?: string }}
 */
export function ensureEnvEncryptionKey(envPath) {
  if (!fs.existsSync(envPath)) {
    return { action: 'skip', reason: 'no_file' }
  }

  const original = fs.readFileSync(envPath, 'utf8')
  const lines = original.split(/\n/)

  if (lines.some(line => COMMENTED_KEY_RE.test(line))) {
    return { action: 'skip', reason: 'commented' }
  }

  const activeIdx = lines.findIndex(line => ACTIVE_KEY_RE.test(line))
  const currentValue = activeIdx >= 0 ? parseActiveValue(lines[activeIdx]) : ''

  if (currentValue && isValidEncryptionKey(currentValue)) {
    return { action: 'ok', value: currentValue }
  }

  const newKey = randomBytes(KEY_LENGTH).toString('base64')
  const nextLine = `${ENV_KEY}=${newKey}`

  if (activeIdx >= 0) {
    lines[activeIdx] = nextLine
  } else {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('')
    }
    lines.push(nextLine)
  }

  const normalized = lines.join('\n').replace(/\n*$/, '\n')
  fs.writeFileSync(envPath, normalized, 'utf8')

  return { action: 'generated', value: newKey }
}

function shellExport(value) {
  const escaped = value.replace(/'/g, `'\\''`)
  return `export ${ENV_KEY}='${escaped}'`
}

function isMain() {
  const entry = process.argv[1] ?? ''
  return entry.endsWith('ensure-env-encryption-key.mjs')
}

if (isMain()) {
  const envPath = process.argv[2] || '/app/.env'
  const forExport = process.argv.includes('--export')
  const quiet = process.argv.includes('--quiet')

  const result = ensureEnvEncryptionKey(envPath)

  if (forExport && result.value) {
    process.stdout.write(`${shellExport(result.value)}\n`)
  }

  if (!quiet) {
    if (result.action === 'generated') {
      console.error(`netwatch: ${ENV_KEY} gerada automaticamente em ${envPath}`)
    } else if (result.action === 'skip' && result.reason === 'commented') {
      console.error(`netwatch: ${ENV_KEY} comentada em ${envPath}; geracao automatica ignorada`)
    }
  }

  process.exit(0)
}
