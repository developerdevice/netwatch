import type { NetworkMap } from '@/lib/types'

/** IDs do mapa raiz e de todos os descendentes (via parentId). */
export function collectMapsToRemove(maps: Pick<NetworkMap, 'id' | 'parentId'>[], rootMapId: string): string[] {
  const toRemove = new Set<string>([rootMapId])
  let changed = true
  while (changed) {
    changed = false
    for (const map of maps) {
      if (map.parentId && toRemove.has(map.parentId) && !toRemove.has(map.id)) {
        toRemove.add(map.id)
        changed = true
      }
    }
  }
  return [...toRemove]
}

export function removeMapsFromTopology(maps: NetworkMap[], mapIdsToRemove: string[]): NetworkMap[] {
  if (mapIdsToRemove.length === 0) return maps
  const toRemove = new Set(mapIdsToRemove)

  return maps
    .filter(m => !toRemove.has(m.id))
    .map(m => ({
      ...m,
      submapNodes: m.submapNodes.filter(sn => !toRemove.has(sn.targetMapId)),
      links: m.links.filter(l => {
        const isSubmapLink = m.submapNodes.some(
          sn =>
            toRemove.has(sn.targetMapId) && (sn.id === l.sourceId || sn.id === l.targetId),
        )
        return !isSubmapLink
      }),
    }))
}

/** Mapas filho sem nó de submapa apontando para eles (ex.: após apagar só o nó no canvas). */
export function pruneOrphanChildMaps<T extends Pick<NetworkMap, 'id' | 'parentId' | 'submapNodes'>>(maps: T[]): T[] {
  const referenced = new Set<string>()
  for (const map of maps) {
    for (const node of map.submapNodes) {
      referenced.add(node.targetMapId)
    }
  }
  return maps.filter(map => !map.parentId || referenced.has(map.id))
}
