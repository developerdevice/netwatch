import { describe, expect, it } from 'vitest'

import { createPersistedTopologyDocument, getPersistedTopologySignature, restorePersistedTopologyDocument } from './topology-state'
import { NetworkMap } from '@/lib/types'

const maps: NetworkMap[] = [
  {
    id: 'local',
    name: 'Local',
    devices: [
      {
        id: 'device-1',
        label: 'Core Router',
        ip: '10.0.0.1',
        icon: 'router',
        status: 'online',
        x: 120,
        y: 180,
        latency: 4,
        uptime: 99.9,
        mapId: 'local',
        comment: 'Backbone',
      },
    ],
    submapNodes: [
      {
        id: 'submap-1',
        label: 'Filial',
        x: 280,
        y: 200,
        mapId: 'local',
        targetMapId: 'branch',
      },
    ],
    badges: [
      {
        id: 'badge-1',
        mapId: 'local',
        text: 'VLAN 200',
        color: 'blue',
        x: 100,
        y: 80,
      },
    ],
    links: [
      {
        id: 'link-1',
        sourceId: 'device-1',
        targetId: 'submap-1',
        mapId: 'local',
        capacity: '10g',
        rxBps: 1000,
        txBps: 500,
        label: 'Backbone',
      },
    ],
  },
]

describe('topology persistence helpers', () => {
  it('remove campos transientes antes de persistir', () => {
    expect(createPersistedTopologyDocument(maps)).toEqual({
      version: 1,
      maps: [
        {
          id: 'local',
          name: 'Local',
          parentId: undefined,
          devices: [
            {
              id: 'device-1',
              label: 'Core Router',
              ip: '10.0.0.1',
              icon: 'router',
              x: 120,
              y: 180,
              mapId: 'local',
              comment: 'Backbone',
            },
          ],
          submapNodes: [
            {
              id: 'submap-1',
              label: 'Filial',
              x: 280,
              y: 200,
              mapId: 'local',
              targetMapId: 'branch',
            },
          ],
          badges: [
            {
              id: 'badge-1',
              mapId: 'local',
              text: 'VLAN 200',
              color: 'blue',
              x: 100,
              y: 80,
            },
          ],
          links: [
            {
              id: 'link-1',
              sourceId: 'device-1',
              targetId: 'submap-1',
              mapId: 'local',
              capacity: '10g',
              label: 'Backbone',
            },
          ],
        },
      ],
    })
  })

  it('restaura topologia com defaults operacionais neutros', () => {
    const restoredMaps = restorePersistedTopologyDocument(createPersistedTopologyDocument(maps))

    expect(restoredMaps[0].devices[0].status).toBe('unknown')
    expect(restoredMaps[0].devices[0].latency).toBeUndefined()
    expect(restoredMaps[0].devices[0].uptime).toBeUndefined()
    expect(restoredMaps[0].links[0].rxBps).toBeUndefined()
    expect(restoredMaps[0].links[0].txBps).toBeUndefined()
  })

  it('ignora mudanças apenas de telemetria no diff persistido', () => {
    const telemetryOnlyMaps: NetworkMap[] = [
      {
        ...maps[0],
        devices: [
          {
            ...maps[0].devices[0],
            status: 'offline',
            latency: undefined,
            uptime: 40,
          },
        ],
        links: [
          {
            ...maps[0].links[0],
            rxBps: 999999,
            txBps: 999999,
          },
        ],
      },
    ]

    expect(getPersistedTopologySignature(telemetryOnlyMaps)).toBe(getPersistedTopologySignature(maps))
  })
})
