import 'server-only'

import crypto from 'node:crypto'
import net from 'node:net'
import tls from 'node:tls'

import { RegisteredRouterServer } from '@/lib/types'

const SENSITIVE_PATTERNS = [/^=password=/i, /^=response=/i]

export interface RouterOsReplySentence {
  reply: string
  attrs: Record<string, string>
  words: string[]
}

interface RouterOsStreamOptions {
  onSentence?: (sentence: RouterOsReplySentence) => void | Promise<void>
}

interface RouterOsClientOptions {
  host: string
  port?: number
  secure?: boolean
  verifyTls?: boolean
  timeoutMs?: number
  log?: (message: string) => void
}

interface BufferedReaderWaiter {
  length: number
  resolve: (value: Buffer) => void
  reject: (reason?: unknown) => void
}

class BufferedSocketReader {
  private buffer = Buffer.alloc(0)
  private ended = false
  private readonly waiters: BufferedReaderWaiter[] = []

  constructor(private readonly socket: net.Socket | tls.TLSSocket) {
    socket.on('data', chunk => {
      this.buffer = Buffer.concat([this.buffer, chunk])
      this.flush()
    })

    socket.on('end', () => {
      this.ended = true
      this.flush()
    })

    socket.on('close', () => {
      this.ended = true
      this.flush()
    })
  }

  private flush() {
    while (this.waiters.length > 0) {
      const waiter = this.waiters[0]

      if (this.buffer.length >= waiter.length) {
        this.waiters.shift()
        const chunk = this.buffer.subarray(0, waiter.length)
        this.buffer = this.buffer.subarray(waiter.length)
        waiter.resolve(chunk)
        continue
      }

      if (this.ended) {
        this.waiters.shift()
        waiter.reject(new Error('Conexao encerrada antes de receber bytes suficientes.'))
        continue
      }

      break
    }
  }

  async readExact(length: number) {
    if (length === 0) return Buffer.alloc(0)

    if (this.buffer.length >= length) {
      const chunk = this.buffer.subarray(0, length)
      this.buffer = this.buffer.subarray(length)
      return chunk
    }

    if (this.ended) {
      throw new Error('Conexao encerrada durante a leitura.')
    }

    return await new Promise<Buffer>((resolve, reject) => {
      this.waiters.push({ length, resolve, reject })
    })
  }
}

function maskSensitiveWord(word: string) {
  if (SENSITIVE_PATTERNS.some(pattern => pattern.test(word))) {
    const separatorIndex = word.indexOf('=', 1)
    if (separatorIndex === -1) return word
    return `${word.slice(0, separatorIndex + 1)}***`
  }

  return word
}

function encodeLength(length: number) {
  if (length < 0x80) return Buffer.from([length])
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff])
  if (length < 0x200000) return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff])
  if (length < 0x10000000) {
    return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])
  }

  return Buffer.from([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])
}

async function readLength(reader: BufferedSocketReader) {
  const first = (await reader.readExact(1))[0]

  if ((first & 0x80) === 0x00) return first
  if ((first & 0xc0) === 0x80) {
    const second = (await reader.readExact(1))[0]
    return ((first & 0x3f) << 8) + second
  }
  if ((first & 0xe0) === 0xc0) {
    const rest = await reader.readExact(2)
    return ((first & 0x1f) << 16) + (rest[0] << 8) + rest[1]
  }
  if ((first & 0xf0) === 0xe0) {
    const rest = await reader.readExact(3)
    return ((first & 0x0f) << 24) + (rest[0] << 16) + (rest[1] << 8) + rest[2]
  }

  const rest = await reader.readExact(4)
  return (rest[0] << 24) + (rest[1] << 16) + (rest[2] << 8) + rest[3]
}

async function readWord(reader: BufferedSocketReader) {
  const length = await readLength(reader)
  if (length === 0) return ''

  return (await reader.readExact(length)).toString('utf8')
}

function parseSentence(words: string[]): RouterOsReplySentence {
  const reply = words[0] ?? ''
  const attrs: Record<string, string> = {}

  for (const word of words.slice(1)) {
    const separatorIndex = word.indexOf('=', 1)
    if (separatorIndex === -1) {
      attrs[word] = ''
      continue
    }

    attrs[word.slice(0, separatorIndex)] = word.slice(separatorIndex + 1)
  }

  return { reply, attrs, words }
}

export async function openRouterOsClient({
  host,
  port = 8728,
  secure = false,
  verifyTls = false,
  timeoutMs = 8000,
  log = () => undefined,
}: RouterOsClientOptions) {
  if (!host) {
    throw new Error('Host MikroTik nao informado.')
  }

  const socket = await new Promise<net.Socket | tls.TLSSocket>((resolve, reject) => {
    const baseSocket = secure
      ? tls.connect({
          host,
          port,
          rejectUnauthorized: verifyTls,
          servername: host,
          minVersion: 'TLSv1.2',
        })
      : net.createConnection({ host, port })

    const cleanup = () => {
      baseSocket.off('error', onError)
      baseSocket.off('connect', onConnect)
      baseSocket.off('timeout', onTimeout)
    }

    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const onConnect = () => {
      cleanup()
      resolve(baseSocket)
    }

    const onTimeout = () => {
      cleanup()
      baseSocket.destroy()
      reject(new Error(`Timeout conectando em ${host}:${port}.`))
    }

    baseSocket.setTimeout(timeoutMs)
    baseSocket.once('error', onError)
    baseSocket.once('connect', onConnect)
    baseSocket.once('timeout', onTimeout)
  })

  socket.setTimeout(0)
  const reader = new BufferedSocketReader(socket)

  async function writeWord(word: string) {
    const data = Buffer.from(word, 'utf8')
    const payload = Buffer.concat([encodeLength(data.length), data])
    log(`<<< ${maskSensitiveWord(word)}`)

    await new Promise<void>((resolve, reject) => {
      socket.write(payload, error => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  async function writeSentence(words: string[]) {
    for (const word of words) {
      await writeWord(word)
    }

    await writeWord('')
  }

  async function readSentence() {
    const words: string[] = []

    while (true) {
      const word = await readWord(reader)
      if (word === '') {
        log('>>>')
        return words
      }

      log(`>>> ${maskSensitiveWord(word)}`)
      words.push(word)
    }
  }

  async function stream(words: string[], options: RouterOsStreamOptions = {}) {
    await writeSentence(words)

    while (true) {
      const sentence = parseSentence(await readSentence())
      if (!sentence.reply) continue

      await options.onSentence?.(sentence)

      if (sentence.reply === '!done' || sentence.reply === '!fatal') {
        return sentence
      }
    }
  }

  async function talk(words: string[]) {
    const replies: RouterOsReplySentence[] = []

    await stream(words, {
      onSentence(sentence) {
        replies.push(sentence)
      },
    })

    return replies
  }

  async function login(username: string, password: string) {
    const replies = await talk(['/login', `=name=${username}`, `=password=${password}`])
    const trap = replies.find(sentence => sentence.reply === '!trap')
    if (trap) {
      throw new Error(trap.attrs['=message'] || 'Falha de autenticacao no RouterOS API.')
    }

    const challenge = replies.find(sentence => sentence.attrs['=ret'])?.attrs['=ret']
    if (!challenge) return

    const digest = crypto
      .createHash('md5')
      .update(Buffer.concat([Buffer.from([0x00]), Buffer.from(password, 'utf8'), Buffer.from(challenge, 'hex')]))
      .digest('hex')

    const legacyReplies = await talk(['/login', `=name=${username}`, `=response=00${digest}`])
    const legacyTrap = legacyReplies.find(sentence => sentence.reply === '!trap')
    if (legacyTrap) {
      throw new Error(legacyTrap.attrs['=message'] || 'Falha de autenticacao legada no RouterOS API.')
    }
  }

  async function close() {
    await new Promise<void>(resolve => {
      socket.end(() => resolve())
    }).catch(() => undefined)

    if (!socket.destroyed) {
      socket.destroy()
    }
  }

  return {
    talk,
    stream,
    login,
    close,
  }
}

export async function connectAuthenticatedRouterOsClient(
  server: Pick<RegisteredRouterServer, 'host' | 'port' | 'secure'>,
  username: string,
  password: string,
  options?: Omit<RouterOsClientOptions, 'host' | 'port' | 'secure'>
) {
  const client = await openRouterOsClient({
    host: server.host,
    port: server.port,
    secure: server.secure,
    ...options,
  })

  await client.login(username, password)
  return client
}

export interface RouterOsPingResult {
  transmitted: number
  received: number
  packetLoss: number | null
  latencyMs?: number
  rawStatus: string | null
  isUp: boolean
}

function parseLatency(rawValue: string | undefined) {
  if (!rawValue) return undefined
  const numeric = Number(rawValue.replace(/[^0-9.]/g, ''))
  return Number.isFinite(numeric) ? numeric : undefined
}

export function summarizePingReplies(replies: RouterOsReplySentence[]): RouterOsPingResult {
  let transmitted = 0
  let received = 0
  let packetLoss: number | null = null
  let latencyMs: number | undefined
  let rawStatus: string | null = null

  for (const sentence of replies) {
    if (sentence.reply !== '!re') continue

    const { attrs } = sentence
    if (attrs['=sent']) transmitted = Number(attrs['=sent'])
    if (attrs['=received']) received = Number(attrs['=received'])
    if (attrs['=packet-loss']) packetLoss = Number(attrs['=packet-loss'])

    const candidateLatency = parseLatency(attrs['=time']) ?? parseLatency(attrs['=status'])
    if (candidateLatency != null) latencyMs = candidateLatency

    if (attrs['=status']) rawStatus = attrs['=status']
  }

  const isUp = received > 0 || (packetLoss != null && packetLoss < 100)

  return {
    transmitted,
    received,
    packetLoss,
    latencyMs,
    rawStatus,
    isUp,
  }
}
