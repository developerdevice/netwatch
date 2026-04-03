import { openRouterOsClient } from './routeros-api.mjs'

function getRequiredEnv(name) {
  const value = process.env[name]
  if (value == null || value === '') {
    throw new Error(`Defina ${name} antes de rodar o script.`)
  }

  return value
}

function toPositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function buildSummary(replies) {
  const result = {
    transmitted: 0,
    received: 0,
    packetLoss: null,
    minRtt: null,
    avgRtt: null,
    maxRtt: null,
    statusSamples: [],
  }

  for (const sentence of replies) {
    if (sentence.reply !== '!re') continue

    const attrs = sentence.attrs
    const packetLoss = attrs['=packet-loss']
    const sent = attrs['=sent']
    const received = attrs['=received']

    if (sent) result.transmitted = Number(sent)
    if (received) result.received = Number(received)
    if (packetLoss) result.packetLoss = packetLoss
    if (attrs['=min-rtt']) result.minRtt = attrs['=min-rtt']
    if (attrs['=avg-rtt']) result.avgRtt = attrs['=avg-rtt']
    if (attrs['=max-rtt']) result.maxRtt = attrs['=max-rtt']

    if (attrs['=status']) {
      result.statusSamples.push({
        host: attrs['=host'],
        seq: attrs['=seq'],
        status: attrs['=status'],
        time: attrs['=time'],
      })
    }
  }

  return result
}

function getConfig() {
  const secure = ['1', 'true', 'yes'].includes((process.env.MIKROTIK_SECURE || 'false').toLowerCase())
  const port = process.env.MIKROTIK_PORT ? Number(process.env.MIKROTIK_PORT) : secure ? 8729 : 8728

  return {
    host: getRequiredEnv('MIKROTIK_HOST'),
    username: getRequiredEnv('MIKROTIK_USER'),
    password: getRequiredEnv('MIKROTIK_PASSWORD'),
    target: process.env.MIKROTIK_PING_TARGET || '8.8.8.8',
    count: toPositiveInteger(process.env.MIKROTIK_PING_COUNT, 3),
    secure,
    port,
  }
}

async function main() {
  const config = getConfig()
  const client = await openRouterOsClient({
    host: config.host,
    port: config.port,
    secure: config.secure,
  })

  try {
    await client.login({
      username: config.username,
      password: config.password,
    })

    const replies = await client.talk([
      '/ping',
      `=address=${config.target}`,
      `=count=${config.count}`,
    ])

    console.log('Resumo do ping:')
    console.log(JSON.stringify(buildSummary(replies), null, 2))
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(`Falha no ping debug: ${error.message}`)
  process.exit(1)
})
