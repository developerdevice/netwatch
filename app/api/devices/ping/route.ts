import { NextResponse } from 'next/server'

import {
  connectAuthenticatedRouterOsClient,
  summarizePingReplies,
  type RouterOsReplySentence,
} from '@/lib/server/routeros/client'
import { normalizePingTargetIpv4 } from '@/lib/server/security/safe-ipv4'
import { getDeviceActionContext } from '@/lib/server/routeros/device-action-context'

export const runtime = 'nodejs'

function formatPingSentence(sentence: RouterOsReplySentence, targetIp: string) {
  if (sentence.reply === '!trap' || sentence.reply === '!fatal') {
    return `\nErro do RouterOS: ${sentence.attrs['=message'] || sentence.reply}\n`
  }

  if (sentence.reply !== '!re') {
    return ''
  }

  const sequence = Number(sentence.attrs['=seq'])
  const index = Number.isFinite(sequence) ? sequence + 1 : '?'
  const host = sentence.attrs['=host'] || targetIp
  const time = sentence.attrs['=time']
  const status = sentence.attrs['=status']

  if (time) {
    return `[${index}] resposta de ${host}: tempo=${time}\n`
  }

  if (status) {
    return `[${index}] ${host}: ${status}\n`
  }

  const received = sentence.attrs['=received'] ?? '?'
  const loss = sentence.attrs['=packet-loss'] ?? '?'
  return `[${index}] resposta parcial: recebidos=${received} perda=${loss}%\n`
}

function formatPingSummary(replies: RouterOsReplySentence[]) {
  const summary = summarizePingReplies(replies)

  return [
    '',
    'Resumo:',
    `  enviados=${summary.transmitted}`,
    `  recebidos=${summary.received}`,
    `  perda=${summary.packetLoss ?? '?'}%`,
    `  latencia=${summary.latencyMs != null ? `${Math.round(summary.latencyMs)} ms` : 'n/d'}`,
    `  status=${summary.rawStatus || (summary.isUp ? 'up' : 'down')}`,
    '',
  ].join('\n')
}

export async function GET(request: Request) {
  const deviceId = new URL(request.url).searchParams.get('deviceId')?.trim()
  if (!deviceId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DEVICE_ID',
          message: 'deviceId nao informado.',
        },
      },
      { status: 400 }
    )
  }

  const context = await getDeviceActionContext(deviceId)
  if (!context.ok) {
    return NextResponse.json({ ok: false, error: context.error }, { status: context.status })
  }

  const pingAddr = normalizePingTargetIpv4(context.device.ip ?? '')
  if (!pingAddr) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DEVICE_IP',
          message: 'O dispositivo nao possui um IPv4 valido para ping.',
        },
      },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()
  let client: Awaited<ReturnType<typeof connectAuthenticatedRouterOsClient>> | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (content: string) => {
        if (closed) return
        controller.enqueue(encoder.encode(content))
      }

      const close = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      const handleAbort = () => {
        void client?.close()
        close()
      }

      request.signal.addEventListener('abort', handleAbort)

      try {
        write(`Ping ${context.device.label} (${pingAddr})\n`)
        write(`Servidor: ${context.session.serverLabel} (${context.session.host}:${context.session.port})\n\n`)

        client = await connectAuthenticatedRouterOsClient(
          {
            host: context.session.host,
            port: context.session.port,
            secure: context.session.secure,
          },
          context.session.username,
          context.session.password
        )

        const replies: RouterOsReplySentence[] = []

        await client.stream(
          ['/ping', `=address=${pingAddr}`, '=count=4'],
          {
            onSentence(sentence) {
              replies.push(sentence)
              const line = formatPingSentence(sentence, pingAddr)
              if (line) write(line)
            },
          }
        )

        write(formatPingSummary(replies))
      } catch (error) {
        write(`\nFalha ao executar ping: ${error instanceof Error ? error.message : 'erro desconhecido'}\n`)
      } finally {
        request.signal.removeEventListener('abort', handleAbort)
        await client?.close().catch(() => undefined)
        close()
      }
    },
    cancel() {
      closed = true
      return client?.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
