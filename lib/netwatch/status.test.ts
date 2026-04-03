import { describe, expect, it } from 'vitest'

import { getAggregateStatus, getMapStatuses, getSubmapNodeStatuses } from './status'
import { NetworkMap } from '@/lib/types'

describe('status helpers', () => {
  it('calcula o status agregado do conjunto de dispositivos', () => {
    expect(getAggregateStatus([])).toBe('unknown')
    expect(getAggregateStatus([{ status: 'online' }, { status: 'warning' }])).toBe('warning')
    expect(getAggregateStatus([{ status: 'offline' }, { status: 'offline' }])).toBe('offline')
    expect(getAggregateStatus([{ status: 'online' }, { status: 'online' }])).toBe('online')
  })

  it('gera status agregado por mapa e por submap node', () => {
    const maps: NetworkMap[] = [
      {
        id: 'root',
        name: 'Root',
        devices: [{ id: 'd1', label: 'A', ip: '1.1.1.1', icon: 'router', status: 'online', x: 0, y: 0, mapId: 'root' }],
        submapNodes: [{ id: 'sn1', label: 'Filial', x: 100, y: 100, mapId: 'root', targetMapId: 'child' }],
        badges: [],
        links: [],
      },
      {
        id: 'child',
        name: 'Child',
        parentId: 'root',
        devices: [
          { id: 'd2', label: 'B', ip: '2.2.2.2', icon: 'switch', status: 'offline', x: 0, y: 0, mapId: 'child' },
          { id: 'd3', label: 'C', ip: '2.2.2.3', icon: 'switch', status: 'warning', x: 0, y: 0, mapId: 'child' },
        ],
        submapNodes: [],
        badges: [],
        links: [],
      },
    ]

    expect(getMapStatuses(maps)).toEqual({
      root: 'online',
      child: 'warning',
    })

    expect(getSubmapNodeStatuses(maps)).toEqual({
      sn1: 'warning',
    })
  })
})
