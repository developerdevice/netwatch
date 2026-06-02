import 'server-only'

const TELEGRAM_TIMEOUT_MS = 8000

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[telegram] send failed', response.status, body.slice(0, 200))
      return false
    }

    return true
  } catch (error) {
    console.error('[telegram] send error', error instanceof Error ? error.message : error)
    return false
  } finally {
    clearTimeout(timeout)
  }
}
