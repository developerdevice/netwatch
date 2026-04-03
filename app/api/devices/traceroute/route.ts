import { NextResponse } from 'next/server'

import {
  connectAuthenticatedRouterOsClient,
  type RouterOsReplySentence,
} from '@/lib/server/routeros/client'
import { normalizePingTargetIpv4 } from '@/lib/server/security/safe-ipv4'
import { getDeviceActionContext } from '@/lib/server/routeros/device-action-context'

export const runtime = 'nodejs'

function formatTracerouteSentence(sentence: RouterOsReplySentence) {
  if (sentence.reply === '!trap' || sentence.reply === '!fatal') {
    return `\nErro do RouterOS: ${sentence.attrs['=message'] || sentence.reply}\n`
  }

  if (sentence.reply === '!done') {
    return '\nTraceroute finalizado.\n'
  }

  if (sentence.reply !== '!re') {
    return null
  }

  const section = Number(sentence.attrs['=.section'])
  const hop = Number.isFinite(section) ? section + 1 : '?'
  const address = sentence.attrs['=address'] || '*'
  const last = sentence.attrs['=last'] || sentence.attrs['=status'] || 'n/d'
  const loss = sentence.attrs['=loss']
  const sent = sentence.attrs['=sent']
  const avg = sentence.attrs['=avg']

  const details = [
    `hop=${hop}`,
    `destino=${address}`,
    `ultimo=${last}`,
    loss ? `perda=${loss}%` : null,
    sent ? `enviados=${sent}` : null,
    avg ? `media=${avg}` : null,
  ].filter(Boolean)

  return `${details.join(' | ')}\n`
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

  const traceAddr = normalizePingTargetIpv4(context.device.ip ?? '')
  if (!traceAddr) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_DEVICE_IP',
          message: 'O dispositivo nao possui um IPv4 valido para traceroute.',
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
      const signatures = new Map<string, string>()

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
        write(`Traceroute ${context.device.label} (${traceAddr})\n`)
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

        await client.stream(
          [
            '/tool/traceroute',
            `=address=${traceAddr}`,
            '=count=1',
            '=use-dns=no',
            '=max-hops=16',
          ],
          {
            onSentence(sentence) {
              const line = formatTracerouteSentence(sentence)
              if (!line) return

              if (sentence.reply === '!re') {
                const key = `${sentence.attrs['=.section'] || '?'}:${sentence.attrs['=address'] || '*'}`
                const signature = [
                  sentence.attrs['=last'] || '',
                  sentence.attrs['=loss'] || '',
                  sentence.attrs['=sent'] || '',
                  sentence.attrs['=avg'] || '',
                ].join('|')

                if (signatures.get(key) === signature) {
                  return
                }

                signatures.set(key, signature)
              }

              write(line)
            },
          }
        )
      } catch (error) {
        write(`\nFalha ao executar traceroute: ${error instanceof Error ? error.message : 'erro desconhecido'}\n`)
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
