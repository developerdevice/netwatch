'use client'

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  AppState,
  Device,
  EditingLinkEndpointState,
  Link,
  MapBadge,
  NetworkMap,
  DeviceStatus,
  SubMapNode,
  HistoryEntry,
} from '@/lib/types'
import { INITIAL_MAPS } from '@/lib/mock-data'
import { getAggregateStatus } from '@/lib/netwatch/status'
import { cloneTopologyMaps, MAP_HISTORY_LIMIT, pruneAfterHistoryNavigation, snapshotBeforeMapMutation } from '@/lib/netwatch/map-history'
import { getPersistedTopologySignature } from '@/lib/netwatch/topology-state'

type Action =
  | { type: 'HYDRATE_MAPS'; maps: NetworkMap[] }
  | { type: 'SET_ACTIVE_MAP'; mapId: string }
  | { type: 'SELECT_DEVICE'; deviceId: string | null }
  | { type: 'SELECT_LINK'; linkId: string | null }
  | { type: 'SELECT_SUBMAP'; submapId: string | null }
  | { type: 'SELECT_BADGE'; badgeId: string | null }
  | { type: 'ADD_DEVICE'; device: Device }
  | { type: 'UPDATE_DEVICE'; device: Partial<Device> & { id: string } }
  | { type: 'REMOVE_DEVICE'; deviceId: string; mapId: string }
  | { type: 'MOVE_DEVICE'; deviceId: string; mapId: string; x: number; y: number }
  | { type: 'ADD_LINK'; link: Link }
  | { type: 'REMOVE_LINK'; linkId: string; mapId: string }
  | { type: 'UPDATE_LINK'; link: Partial<Link> & { id: string; mapId: string } }
  | { type: 'ADD_MAP'; map: NetworkMap }
  | { type: 'UPDATE_MAP'; mapId: string; name: string }
  | { type: 'REMOVE_MAP'; mapId: string }
  | { type: 'ADD_SUBMAP_NODE'; node: SubMapNode }
  | { type: 'UPDATE_SUBMAP_NODE'; node: Partial<SubMapNode> & { id: string } }
  | { type: 'REMOVE_SUBMAP_NODE'; nodeId: string; mapId: string }
  | { type: 'MOVE_SUBMAP_NODE'; nodeId: string; mapId: string; x: number; y: number }
  | { type: 'ADD_BADGE'; badge: MapBadge }
  | { type: 'UPDATE_BADGE'; badge: Partial<MapBadge> & { id: string; mapId: string } }
  | { type: 'REMOVE_BADGE'; badgeId: string; mapId: string }
  | { type: 'MOVE_BADGE'; badgeId: string; mapId: string; x: number; y: number }
  | { type: 'UPDATE_DEVICE_STATUS'; deviceId: string; mapId: string; status: DeviceStatus; latency?: number }
  | { type: 'OPEN_CONTEXT_MENU'; menu: AppState['contextMenu'] }
  | { type: 'CLOSE_CONTEXT_MENU' }
  | { type: 'SET_EDITING_DEVICE'; device: Device | null }
  | { type: 'SET_EDITING_SUBMAP'; submap: SubMapNode | null }
  | { type: 'SET_EDITING_LINK'; link: Link | null }
  | { type: 'SET_EDITING_LINK_ENDPOINT'; payload: EditingLinkEndpointState | null }
  | { type: 'SET_EDITING_BADGE'; badge: MapBadge | null }
  | { type: 'OPEN_CREATE_DEVICE'; draft: NonNullable<AppState['creatingDevice']> }
  | { type: 'CLOSE_CREATE_DEVICE' }
  | { type: 'OPEN_CREATE_SUBMAP'; draft: NonNullable<AppState['creatingSubmap']> }
  | { type: 'CLOSE_CREATE_SUBMAP' }
  | { type: 'OPEN_CREATE_BADGE'; draft: NonNullable<AppState['creatingBadge']> }
  | { type: 'CLOSE_CREATE_BADGE' }
  | { type: 'START_LINK_CREATION'; sourceNodeId: string; sourceNodeType: 'device' | 'submap' }
  | { type: 'CANCEL_LINK_CREATION' }
  | { type: 'SET_SHOW_HISTORY'; deviceId: string | null }
  | { type: 'ADD_HISTORY_ENTRY'; deviceId: string; entry: HistoryEntry }
  | { type: 'SET_PING_RESULT'; result: { deviceId: string } | null }
  | { type: 'SET_TRACERT_RESULT'; result: { deviceId: string } | null }
  | { type: 'BEGIN_MAP_HISTORY_TRANSACTION' }
  | { type: 'END_MAP_HISTORY_TRANSACTION' }
  | { type: 'UNDO_MAP_HISTORY' }
  | { type: 'REDO_MAP_HISTORY' }

function resolveActiveMapId(maps: NetworkMap[], currentActiveMapId?: string) {
  if (currentActiveMapId && maps.some(map => map.id === currentActiveMapId)) {
    return currentActiveMapId
  }

  return maps.find(map => map.id === 'local')?.id ?? maps[0]?.id ?? 'local'
}

function createInitialState(maps: NetworkMap[] = INITIAL_MAPS): AppState {
  return {
    maps,
    mapHistoryPast: [],
    mapHistoryFuture: [],
    mapHistoryTransactionDepth: 0,
    activeMapId: resolveActiveMapId(maps),
    selectedDeviceId: null,
    selectedLinkId: null,
    selectedSubmapId: null,
    selectedBadgeId: null,
    contextMenu: null,
    deviceHistory: {},
    editingDevice: null,
    editingSubmap: null,
    editingLink: null,
    editingLinkEndpoint: null,
    editingBadge: null,
    creatingDevice: null,
    creatingSubmap: null,
    creatingBadge: null,
    pendingLinkSourceId: null,
    showHistory: null,
    showPingResult: null,
    showTracertResult: null,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE_MAPS':
      return {
        ...createInitialState(action.maps),
        activeMapId: resolveActiveMapId(action.maps, state.activeMapId),
      }

    case 'BEGIN_MAP_HISTORY_TRANSACTION': {
      if (state.mapHistoryTransactionDepth === 0) {
        return {
          ...state,
          mapHistoryPast: [...state.mapHistoryPast, cloneTopologyMaps(state.maps)].slice(-MAP_HISTORY_LIMIT),
          mapHistoryFuture: [],
          mapHistoryTransactionDepth: 1,
        }
      }
      return { ...state, mapHistoryTransactionDepth: state.mapHistoryTransactionDepth + 1 }
    }

    case 'END_MAP_HISTORY_TRANSACTION':
      return {
        ...state,
        mapHistoryTransactionDepth: Math.max(0, state.mapHistoryTransactionDepth - 1),
      }

    case 'UNDO_MAP_HISTORY': {
      if (state.mapHistoryPast.length === 0) return state
      const previous = state.mapHistoryPast[state.mapHistoryPast.length - 1]
      const newPast = state.mapHistoryPast.slice(0, -1)
      const newFuture = [cloneTopologyMaps(state.maps), ...state.mapHistoryFuture].slice(0, MAP_HISTORY_LIMIT)
      return pruneAfterHistoryNavigation({
        ...state,
        maps: cloneTopologyMaps(previous),
        mapHistoryPast: newPast,
        mapHistoryFuture: newFuture,
        mapHistoryTransactionDepth: 0,
      })
    }

    case 'REDO_MAP_HISTORY': {
      if (state.mapHistoryFuture.length === 0) return state
      const next = state.mapHistoryFuture[0]
      const newFuture = state.mapHistoryFuture.slice(1)
      const newPast = [...state.mapHistoryPast, cloneTopologyMaps(state.maps)].slice(-MAP_HISTORY_LIMIT)
      return pruneAfterHistoryNavigation({
        ...state,
        maps: cloneTopologyMaps(next),
        mapHistoryPast: newPast,
        mapHistoryFuture: newFuture,
        mapHistoryTransactionDepth: 0,
      })
    }

    case 'SET_ACTIVE_MAP':
      return { 
        ...state, 
        activeMapId: action.mapId, 
        selectedDeviceId: null, 
        selectedLinkId: null,
        selectedSubmapId: null,
        selectedBadgeId: null,
        contextMenu: null,
        pendingLinkSourceId: null,
        editingLinkEndpoint: null,
      }

    case 'SELECT_DEVICE':
      return {
        ...state,
        selectedDeviceId: action.deviceId,
        selectedLinkId: null,
        selectedSubmapId: null,
        selectedBadgeId: null,
        editingLinkEndpoint: null,
      }

    case 'SELECT_LINK':
      return {
        ...state,
        selectedLinkId: action.linkId,
        selectedDeviceId: null,
        selectedSubmapId: null,
        selectedBadgeId: null,
        editingLinkEndpoint: null,
      }

    case 'SELECT_SUBMAP':
      return {
        ...state,
        selectedSubmapId: action.submapId,
        selectedDeviceId: null,
        selectedLinkId: null,
        selectedBadgeId: null,
        editingLinkEndpoint: null,
      }

    case 'SELECT_BADGE':
      return {
        ...state,
        selectedBadgeId: action.badgeId,
        selectedDeviceId: null,
        selectedLinkId: null,
        selectedSubmapId: null,
        editingLinkEndpoint: null,
      }

    case 'ADD_DEVICE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.device.mapId
            ? { ...m, devices: [...m.devices, action.device] }
            : m
        ),
        creatingDevice: null,
      }
    }

    case 'UPDATE_DEVICE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m => ({
          ...m,
          devices: m.devices.map(d =>
            d.id === action.device.id ? { ...d, ...action.device } : d
          ),
        })),
        editingDevice: null,
      }
    }

    case 'REMOVE_DEVICE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? {
                ...m,
                devices: m.devices.filter(d => d.id !== action.deviceId),
                links: m.links.filter(
                  l => l.sourceId !== action.deviceId && l.targetId !== action.deviceId
                ),
              }
            : m
        ),
        selectedDeviceId: state.selectedDeviceId === action.deviceId ? null : state.selectedDeviceId,
        contextMenu: null,
      }
    }

    case 'MOVE_DEVICE':
      return {
        ...state,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? {
                ...m,
                devices: m.devices.map(d =>
                  d.id === action.deviceId ? { ...d, x: action.x, y: action.y } : d
                ),
              }
            : m
        ),
      }

    case 'ADD_LINK': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.link.mapId
            ? { ...m, links: [...m.links, action.link] }
            : m
        ),
        pendingLinkSourceId: null,
        selectedLinkId: action.link.id,
        selectedDeviceId: null,
        selectedSubmapId: null,
        selectedBadgeId: null,
      }
    }

    case 'UPDATE_LINK': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(map =>
          map.id === action.link.mapId
            ? {
                ...map,
                links: map.links.map(link =>
                  link.id === action.link.id ? { ...link, ...action.link } : link
                ),
              }
            : map
        ),
        editingLink: null,
        editingLinkEndpoint: null,
      }
    }

    case 'REMOVE_LINK': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? { ...m, links: m.links.filter(l => l.id !== action.linkId) }
            : m
        ),
        selectedLinkId: state.selectedLinkId === action.linkId ? null : state.selectedLinkId,
        editingLinkEndpoint:
          state.editingLinkEndpoint?.linkId === action.linkId ? null : state.editingLinkEndpoint,
        contextMenu: null,
      }
    }

    case 'ADD_MAP': {
      const h = snapshotBeforeMapMutation(state)
      return { ...state, ...h, maps: [...state.maps, action.map] }
    }

    case 'UPDATE_MAP': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.mapId ? { ...m, name: action.name } : m
        ),
      }
    }

    case 'REMOVE_MAP': {
      const h = snapshotBeforeMapMutation(state)
      const childMaps = state.maps.filter(m => m.parentId === action.mapId).map(m => m.id)
      const toRemove = [action.mapId, ...childMaps]
      const remainingMaps = state.maps
        .filter(m => !toRemove.includes(m.id))
        .map(m => ({
          ...m,
          submapNodes: m.submapNodes.filter(sn => !toRemove.includes(sn.targetMapId)),
          links: m.links.filter(l => {
            const isSubmapLink = m.submapNodes.some(sn => toRemove.includes(sn.targetMapId) && (sn.id === l.sourceId || sn.id === l.targetId))
            return !isSubmapLink
          }),
        }))

      return {
        ...state,
        ...h,
        maps: remainingMaps,
        activeMapId: toRemove.includes(state.activeMapId)
          ? resolveActiveMapId(remainingMaps)
          : state.activeMapId,
        contextMenu: null,
      }
    }

    case 'ADD_SUBMAP_NODE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.node.mapId
            ? { ...m, submapNodes: [...m.submapNodes, action.node] }
            : m
        ),
        creatingSubmap: null,
      }
    }

    case 'ADD_BADGE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(map =>
          map.id === action.badge.mapId
            ? { ...map, badges: [...map.badges, action.badge] }
            : map
        ),
        creatingBadge: null,
      }
    }

    case 'UPDATE_SUBMAP_NODE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m => ({
          ...m,
          submapNodes: m.submapNodes.map(sn =>
            sn.id === action.node.id ? { ...sn, ...action.node } : sn
          ),
        })),
        editingSubmap: null,
      }
    }

    case 'REMOVE_SUBMAP_NODE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? {
                ...m,
                submapNodes: m.submapNodes.filter(sn => sn.id !== action.nodeId),
                links: m.links.filter(l => l.sourceId !== action.nodeId && l.targetId !== action.nodeId),
              }
            : m
        ),
        selectedSubmapId: state.selectedSubmapId === action.nodeId ? null : state.selectedSubmapId,
        contextMenu: null,
      }
    }

    case 'MOVE_SUBMAP_NODE':
      return {
        ...state,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? {
                ...m,
                submapNodes: m.submapNodes.map(sn =>
                  sn.id === action.nodeId ? { ...sn, x: action.x, y: action.y } : sn
                ),
              }
            : m
        ),
      }

    case 'UPDATE_BADGE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(map =>
          map.id === action.badge.mapId
            ? {
                ...map,
                badges: map.badges.map(badge =>
                  badge.id === action.badge.id ? { ...badge, ...action.badge } : badge
                ),
              }
            : map
        ),
        editingBadge: null,
      }
    }

    case 'REMOVE_BADGE': {
      const h = snapshotBeforeMapMutation(state)
      return {
        ...state,
        ...h,
        maps: state.maps.map(map =>
          map.id === action.mapId
            ? { ...map, badges: map.badges.filter(badge => badge.id !== action.badgeId) }
            : map
        ),
        selectedBadgeId: state.selectedBadgeId === action.badgeId ? null : state.selectedBadgeId,
        contextMenu: null,
      }
    }

    case 'MOVE_BADGE':
      return {
        ...state,
        maps: state.maps.map(map =>
          map.id === action.mapId
            ? {
                ...map,
                badges: map.badges.map(badge =>
                  badge.id === action.badgeId ? { ...badge, x: action.x, y: action.y } : badge
                ),
              }
            : map
        ),
      }

    case 'UPDATE_DEVICE_STATUS':
      return {
        ...state,
        maps: state.maps.map(m =>
          m.id === action.mapId
            ? {
                ...m,
                devices: m.devices.map(d =>
                  d.id === action.deviceId
                    ? { ...d, status: action.status, latency: action.latency }
                    : d
                ),
              }
            : m
        ),
      }

    case 'OPEN_CONTEXT_MENU':
      return { ...state, contextMenu: action.menu }

    case 'CLOSE_CONTEXT_MENU':
      return { ...state, contextMenu: null }

    case 'SET_EDITING_DEVICE':
      return { ...state, editingDevice: action.device, contextMenu: null }

    case 'SET_EDITING_SUBMAP':
      return { ...state, editingSubmap: action.submap, contextMenu: null }

    case 'SET_EDITING_LINK':
      return { ...state, editingLink: action.link, editingLinkEndpoint: null, contextMenu: null }

    case 'SET_EDITING_LINK_ENDPOINT':
      return { ...state, editingLinkEndpoint: action.payload, contextMenu: null }

    case 'SET_EDITING_BADGE':
      return { ...state, editingBadge: action.badge, contextMenu: null }

    case 'OPEN_CREATE_DEVICE':
      return {
        ...state,
        creatingDevice: action.draft,
        contextMenu: null,
      }

    case 'CLOSE_CREATE_DEVICE':
      return { ...state, creatingDevice: null }

    case 'OPEN_CREATE_SUBMAP':
      return {
        ...state,
        creatingSubmap: action.draft,
        contextMenu: null,
      }

    case 'CLOSE_CREATE_SUBMAP':
      return { ...state, creatingSubmap: null }

    case 'OPEN_CREATE_BADGE':
      return {
        ...state,
        creatingBadge: action.draft,
        contextMenu: null,
      }

    case 'CLOSE_CREATE_BADGE':
      return { ...state, creatingBadge: null }

    case 'START_LINK_CREATION':
      return {
        ...state,
        pendingLinkSourceId: action.sourceNodeId,
        selectedDeviceId: action.sourceNodeType === 'device' ? action.sourceNodeId : null,
        selectedLinkId: null,
        selectedSubmapId: action.sourceNodeType === 'submap' ? action.sourceNodeId : null,
        selectedBadgeId: null,
        contextMenu: null,
      }

    case 'CANCEL_LINK_CREATION':
      return { ...state, pendingLinkSourceId: null }

    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.deviceId, contextMenu: null }

    case 'ADD_HISTORY_ENTRY':
      return {
        ...state,
        deviceHistory: {
          ...state.deviceHistory,
          [action.deviceId]: [
            ...(state.deviceHistory[action.deviceId] || []).slice(-99),
            action.entry,
          ],
        },
      }

    case 'SET_PING_RESULT':
      return { ...state, showPingResult: action.result, contextMenu: null }

    case 'SET_TRACERT_RESULT':
      return { ...state, showTracertResult: action.result, contextMenu: null }

    default:
      return state
  }
}

interface StoreContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export type StoreAction = Action
export type StoreDispatch = React.Dispatch<Action>

const StoreContext = createContext<StoreContextValue | null>(null)

interface StoreProviderProps {
  children: React.ReactNode
  initialMaps?: NetworkMap[]
}

export function StoreProvider({ children, initialMaps = INITIAL_MAPS }: StoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialMaps, createInitialState)
  const initialSignature = useMemo(() => getPersistedTopologySignature(initialMaps), [initialMaps])
  const persistedSignature = useMemo(() => getPersistedTopologySignature(state.maps), [state.maps])
  const lastSavedSignatureRef = useRef(initialSignature)
  const skipFirstPersistRef = useRef(true)

  useEffect(() => {
    dispatch({ type: 'HYDRATE_MAPS', maps: initialMaps })
    lastSavedSignatureRef.current = initialSignature
  }, [initialMaps, initialSignature])

  useEffect(() => {
    if (skipFirstPersistRef.current) {
      skipFirstPersistRef.current = false
      return
    }

    if (persistedSignature === lastSavedSignatureRef.current) {
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/topology/state', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ maps: state.maps }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Falha ao persistir topologia: ${response.status}`)
        }

        lastSavedSignatureRef.current = persistedSignature
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        console.error('Nao foi possivel persistir a topologia local.', error)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [persistedSignature, state.maps])

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function useActiveMap() {
  const { state } = useStore()
  return state.maps.find(m => m.id === state.activeMapId) ?? state.maps[0]
}

export function useSelectedDevice() {
  const { state } = useStore()
  if (!state.selectedDeviceId) return null
  for (const map of state.maps) {
    const d = map.devices.find(d => d.id === state.selectedDeviceId)
    if (d) return d
  }
  return null
}

export function useSubmapStatus(targetMapId: string): DeviceStatus {
  const { state } = useStore()
  const targetMap = state.maps.find(m => m.id === targetMapId)
  return getAggregateStatus(targetMap?.devices ?? [])
}
