import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NetworkMap } from '@/lib/types'

describe('topology repository', () => {
  let tempDir = ''
  const serverId = 'server-a'

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'netwatch-topology-'))
    process.env.NETWATCH_SQLITE_PATH = path.join(tempDir, 'netwatch.sqlite')
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.NETWATCH_SQLITE_PATH
    fs.rmSync(tempDir, { recursive: true, force: true })
    vi.resetModules()
  })

  it('faz seed automatico quando o banco esta vazio', async () => {
    const { loadStoredTopology } = await import('./topology-repository')

    const result = loadStoredTopology(serverId)

    expect(result.seeded).toBe(true)
    expect(result.maps.length).toBeGreaterThan(0)
    expect(fs.existsSync(process.env.NETWATCH_SQLITE_PATH!)).toBe(true)
  })

  it('salva e restaura a topologia persistida', async () => {
    const { loadStoredTopology, saveStoredTopology } = await import('./topology-repository')
    const maps: NetworkMap[] = [
      {
        id: 'custom',
        name: 'Custom Map',
        devices: [
          {
            id: 'device-1',
            label: 'Edge Router',
            ip: '10.10.10.1',
            icon: 'router',
            status: 'online',
            x: 100,
            y: 120,
            latency: 12,
            uptime: 99,
            mapId: 'custom',
            comment: 'Principal',
          },
        ],
        submapNodes: [],
        badges: [
          {
            id: 'badge-1',
            mapId: 'custom',
            text: 'VLAN 900',
            color: 'amber',
            x: 60,
            y: 40,
          },
        ],
        links: [],
      },
    ]

    saveStoredTopology(serverId, maps)

    const result = loadStoredTopology(serverId)

    expect(result.seeded).toBe(false)
    expect(result.maps[0].name).toBe('Custom Map')
    expect(result.maps[0].badges[0].text).toBe('VLAN 900')
    expect(result.maps[0].devices[0].status).toBe('unknown')
    expect(result.maps[0].devices[0].latency).toBeUndefined()
    expect(result.maps[0].devices[0].uptime).toBeUndefined()
  })

  it('mantem topologias isoladas por servidor cadastrado', async () => {
    const { loadStoredTopology, saveStoredTopology } = await import('./topology-repository')

    saveStoredTopology('server-a', [
      { id: 'map-a', name: 'Mapa A', devices: [], submapNodes: [], badges: [], links: [] },
    ])
    saveStoredTopology('server-b', [
      { id: 'map-b', name: 'Mapa B', devices: [], submapNodes: [], badges: [], links: [] },
    ])

    expect(loadStoredTopology('server-a').maps[0].name).toBe('Mapa A')
    expect(loadStoredTopology('server-b').maps[0].name).toBe('Mapa B')
  })
})
