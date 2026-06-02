import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/server/telegram/client', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
}))

describe('OutageNotifier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('nao notifica flap rapido offline->online', async () => {
    const { OutageNotifier } = await import('./outage-notifier')
    const { sendTelegramMessage } = await import('@/lib/server/telegram/client')

    const notifier = new OutageNotifier(10_000)
    const ctx = { serverLabel: 'Lab', deviceLabel: 'CCR', deviceIp: '10.0.0.1' }
    const tg = { botToken: 't', chatId: '1' }

    notifier.handleStatusChange('s', 'd', ctx, 'online', 'offline', tg)
    vi.advanceTimersByTime(5_000)
    notifier.handleStatusChange('s', 'd', ctx, 'offline', 'online', tg)
    await Promise.resolve()

    expect(sendTelegramMessage).not.toHaveBeenCalled()
  })

  it('notifica queda apos debounce e recuperacao com duracao', async () => {
    const { OutageNotifier } = await import('./outage-notifier')
    const { sendTelegramMessage } = await import('@/lib/server/telegram/client')

    const notifier = new OutageNotifier(10_000)
    const ctx = { serverLabel: 'Lab', deviceLabel: 'CCR', deviceIp: '10.0.0.1' }
    const tg = { botToken: 't', chatId: '1' }

    notifier.handleStatusChange('s', 'd', ctx, 'online', 'offline', tg)
    vi.advanceTimersByTime(10_000)
    await Promise.resolve()

    expect(sendTelegramMessage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendTelegramMessage).mock.calls[0][2]).toContain('indisponivel')

    vi.advanceTimersByTime(30_000)
    notifier.handleStatusChange('s', 'd', ctx, 'offline', 'online', tg)
    await Promise.resolve()

    expect(sendTelegramMessage).toHaveBeenCalledTimes(2)
    expect(vi.mocked(sendTelegramMessage).mock.calls[1][2]).toContain('recuperado')
  })
})
