import { openRouterOsClient } from './routeros-api.mjs'

function getConfig() {
  const host = process.env.MIKROTIK_HOST
  const username = process.env.MIKROTIK_USER
  const password = process.env.MIKROTIK_PASSWORD
  const secure = ['1', 'true', 'yes'].includes((process.env.MIKROTIK_SECURE || 'false').toLowerCase())
  const port = process.env.MIKROTIK_PORT ? Number(process.env.MIKROTIK_PORT) : secure ? 8729 : 8728

  if (!host || !username || password == null) {
    throw new Error('Defina MIKROTIK_HOST, MIKROTIK_USER e MIKROTIK_PASSWORD antes de rodar o script.')
  }

  return { host, username, password, secure, port }
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

    console.log(`Login OK em ${config.host}:${config.port}.`)

    const replies = await client.talk(['/system/resource/print', '=.proplist=identity,version,uptime,cpu-load,board-name'])
    const dataReply = replies.find(sentence => sentence.reply === '!re')

    console.log('Resumo do recurso:')
    console.log(JSON.stringify(dataReply?.attrs ?? {}, null, 2))
  } finally {
    await client.close()
  }
}

main().catch(error => {
  console.error(`Falha no login debug: ${error.message}`)
  process.exit(1)
})
