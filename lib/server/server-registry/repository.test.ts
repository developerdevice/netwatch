import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('server registry repository', () => {
  let tempDir = ''

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'netwatch-server-registry-'))
    process.env.NETWATCH_SQLITE_PATH = path.join(tempDir, 'netwatch.sqlite')
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NETWATCH_SQLITE_PATH
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.resetModules()
  })

  it('salva e lista servidores cadastrados', async () => {
    const { addRegisteredServer, listRegisteredServers } = await import('./repository')

    const server = addRegisteredServer({
      label: 'Router demo',
      host: '198.51.100.10',
      port: 8728,
    })

    const servers = listRegisteredServers()

    expect(servers).toHaveLength(1)
    expect(servers[0].id).toBe(server.id)
    expect(servers[0].host).toBe('198.51.100.10')
  })

  it('nao duplica o mesmo host e porta', async () => {
    const { addRegisteredServer, listRegisteredServers } = await import('./repository')

    addRegisteredServer({
      label: 'Server A',
      host: '198.51.100.10',
      port: 8728,
    })
    addRegisteredServer({
      label: 'Server B',
      host: '198.51.100.10',
      port: 8728,
    })

    expect(listRegisteredServers()).toHaveLength(1)
  })

  it('atualiza servidor cadastrado', async () => {
    const { addRegisteredServer, listRegisteredServers, updateRegisteredServer } = await import('./repository')

    const created = addRegisteredServer({
      label: 'Old',
      host: '10.0.0.1',
      port: 8728,
    })

    const updated = updateRegisteredServer(created.id, {
      label: 'New',
      host: '10.0.0.2',
      port: 8729,
      secure: true,
    })

    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(updated.server.label).toBe('New')
    expect(updated.server.host).toBe('10.0.0.2')
    expect(listRegisteredServers()).toHaveLength(1)
  })

  it('remove servidor cadastrado', async () => {
    const { addRegisteredServer, listRegisteredServers, removeRegisteredServer } = await import('./repository')

    const created = addRegisteredServer({
      label: 'X',
      host: '10.0.0.5',
      port: 8728,
    })

    expect(removeRegisteredServer(created.id)).toBe(true)
    expect(listRegisteredServers()).toHaveLength(0)
    expect(removeRegisteredServer(created.id)).toBe(false)
  })
})
