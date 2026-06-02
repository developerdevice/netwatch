import { describe, expect, it } from 'vitest'

import { collectMapsToRemove, pruneOrphanChildMaps, removeMapsFromTopology } from './map-removal'
import type { NetworkMap } from '@/lib/types'

function minimalMap(
  id: string,
  overrides: Partial<NetworkMap> = {},
): NetworkMap {
  return {
    id,
    name: id,
    devices: [],
    submapNodes: [],
    badges: [],
    links: [],
    ...overrides,
  }
}

describe('map-removal', () => {
  it('collectMapsToRemove inclui descendentes por parentId', () => {
    const maps = [
      minimalMap('local'),
      minimalMap('child', { parentId: 'local' }),
      minimalMap('grandchild', { parentId: 'child' }),
    ]
    expect(collectMapsToRemove(maps, 'child').sort()).toEqual(['child', 'grandchild'])
  })

  it('removeMapsFromTopology remove nós que apontam para mapas removidos', () => {
    const maps = [
      minimalMap('local', {
        submapNodes: [
          { id: 'sn1', label: 'Filial', x: 0, y: 0, mapId: 'local', targetMapId: 'child' },
        ],
      }),
      minimalMap('child', { parentId: 'local' }),
    ]
    const result = removeMapsFromTopology(maps, ['child'])
    expect(result.map(m => m.id)).toEqual(['local'])
    expect(result[0].submapNodes).toHaveLength(0)
  })

  it('pruneOrphanChildMaps remove mapa filho sem submapNode referenciando', () => {
    const maps = [
      minimalMap('local'),
      minimalMap('orphan', { parentId: 'local' }),
    ]
    expect(pruneOrphanChildMaps(maps).map(m => m.id)).toEqual(['local'])
  })

  it('pruneOrphanChildMaps mantém filho referenciado por submapNode', () => {
    const maps = [
      minimalMap('local', {
        submapNodes: [
          { id: 'sn1', label: 'Norte', x: 0, y: 0, mapId: 'local', targetMapId: 'norte' },
        ],
      }),
      minimalMap('norte', { parentId: 'local' }),
    ]
    expect(pruneOrphanChildMaps(maps).map(m => m.id).sort()).toEqual(['local', 'norte'])
  })
})
