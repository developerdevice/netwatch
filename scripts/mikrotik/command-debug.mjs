import { openRouterOsClient } from './routeros-api.mjs'

function getRequiredEnv(name) {
  const value = process.env[name]
  if (value == null || value === '') {
    throw new Error(`Defina ${name} antes de rodar o script.`)
  }

  return value
}

function getConfig() {
  const secure = ['1', 'true', 'yes'].includes((process.env.MIKROTIK_SECURE || 'false').toLowerCase())
  const port = process.env.MIKROTIK_PORT ? Number(process.env.MIKROTIK_PORT) : secure ? 8729 : 8728
  const words = process.argv.slice(2)

  if (words.length === 0) {
    throw new Error('Informe as palavras da sentenca API. Ex: npm run mikrotik:command -- /system/resource/print')
  }

  return {
    host: getRequiredEnv('MIKROTIK_HOST'),
    username: getRequiredEnv('MIKROTIK_USER'),
    password: getRequiredEnv('MIKROTIK_PASSWORD'),
    secure,
    port,
    words,
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

    const replies = await client.talk(config.words)
    console.log(JSON.stringify(replies, null, 2))
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(`Falha no command debug: ${error.message}`)
  process.exit(1)
})
