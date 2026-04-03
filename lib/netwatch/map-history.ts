import type { AppState, NetworkMap } from '@/lib/types'

export const MAP_HISTORY_LIMIT = 50

export function cloneTopologyMaps(maps: NetworkMap[]): NetworkMap[] {
  return structuredClone(maps)
}

export function snapshotBeforeMapMutation(
  state: AppState
): Pick<AppState, 'mapHistoryPast' | 'mapHistoryFuture' | 'mapHistoryTransactionDepth'> {
  return {
    mapHistoryPast: [...state.mapHistoryPast, cloneTopologyMaps(state.maps)].slice(-MAP_HISTORY_LIMIT),
    mapHistoryFuture: [],
    mapHistoryTransactionDepth: 0,
  }
}

export function pruneSelectionToActiveMap(state: AppState): AppState {
  const map = state.maps.find(m => m.id === state.activeMapId)
  if (!map) {
    return {
      ...state,
      selectedDeviceId: null,
      selectedLinkId: null,
      selectedSubmapId: null,
      selectedBadgeId: null,
    }
  }
  let { selectedDeviceId, selectedLinkId, selectedSubmapId, selectedBadgeId } = state
  if (selectedDeviceId && !map.devices.some(d => d.id === selectedDeviceId)) selectedDeviceId = null
  if (selectedLinkId && !map.links.some(l => l.id === selectedLinkId)) selectedLinkId = null
  if (selectedSubmapId && !map.submapNodes.some(s => s.id === selectedSubmapId)) selectedSubmapId = null
  if (selectedBadgeId && !map.badges.some(b => b.id === selectedBadgeId)) selectedBadgeId = null
  return { ...state, selectedDeviceId, selectedLinkId, selectedSubmapId, selectedBadgeId }
}

export function pruneAfterHistoryNavigation(state: AppState): AppState {
  let s = pruneSelectionToActiveMap(state)
  const map = s.maps.find(m => m.id === s.activeMapId)
  if (s.editingDevice && (!map || !map.devices.some(d => d.id === s.editingDevice!.id))) {
    s = { ...s, editingDevice: null }
  }
  if (s.editingSubmap && (!map || !map.submapNodes.some(n => n.id === s.editingSubmap!.id))) {
    s = { ...s, editingSubmap: null }
  }
  if (s.editingLink && (!map || !map.links.some(l => l.id === s.editingLink!.id))) {
    s = { ...s, editingLink: null }
  }
  if (s.editingBadge && (!map || !map.badges.some(b => b.id === s.editingBadge!.id))) {
    s = { ...s, editingBadge: null }
  }
  return s
}
