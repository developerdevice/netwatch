import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('applyDeviceStatusSnapshot', () => {
  let tempDir = ''

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'netwatch-monitor-'))
    process.env.NETWATCH_SQLITE_PATH = path.join(tempDir, 'netwatch.sqlite')
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NETWATCH_SQLITE_PATH
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.resetModules()
  })

  it('grava evento apenas quando o status muda', async () => {
    const { applyDeviceStatusSnapshot } = await import('./status-transition')
    const { listDeviceStatusEvents } = await import('./monitor-repository')

    const device = { id: 'd1', label: 'CCR', mapId: 'local' }
    const snapshot = { deviceId: 'd1', mapId: 'local', status: 'online' as const, latency: 1 }

    const first = applyDeviceStatusSnapshot('srv', device, snapshot)
    expect(first.changed).toBe(true)

    const second = applyDeviceStatusSnapshot('srv', device, snapshot)
    expect(second.changed).toBe(false)

    const events = listDeviceStatusEvents('srv', 'd1')
    expect(events).toHaveLength(1)
    expect(events[0].newStatus).toBe('online')
  })
})
