import { AppState, Device } from '@/lib/types'
import { StoreDispatch } from '@/lib/store'

async function persistTopologySnapshot(maps: AppState['maps']) {
  const response = await fetch('/api/topology/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ maps }),
  })

  if (!response.ok) {
    throw new Error(`Falha ao persistir topologia antes da acao: ${response.status}`)
  }
}

export function clearSelection(dispatch: StoreDispatch) {
  dispatch({ type: 'SELECT_DEVICE', deviceId: null })
  dispatch({ type: 'SELECT_LINK', linkId: null })
  dispatch({ type: 'SELECT_SUBMAP', submapId: null })
  dispatch({ type: 'SELECT_BADGE', badgeId: null })
}

export function deleteCurrentSelection(state: AppState, dispatch: StoreDispatch) {
  if (state.selectedDeviceId) {
    dispatch({ type: 'REMOVE_DEVICE', deviceId: state.selectedDeviceId, mapId: state.activeMapId })
  }

  if (state.selectedLinkId) {
    dispatch({ type: 'REMOVE_LINK', linkId: state.selectedLinkId, mapId: state.activeMapId })
  }

  if (state.selectedSubmapId) {
    dispatch({ type: 'REMOVE_SUBMAP_NODE', nodeId: state.selectedSubmapId, mapId: state.activeMapId })
  }

  if (state.selectedBadgeId) {
    dispatch({ type: 'REMOVE_BADGE', badgeId: state.selectedBadgeId, mapId: state.activeMapId })
  }
}

export function openDeviceHistory(deviceId: string, dispatch: StoreDispatch) {
  dispatch({ type: 'SET_SHOW_HISTORY', deviceId })
}

export async function openDevicePing(device: Device, state: AppState, dispatch: StoreDispatch) {
  dispatch({ type: 'CLOSE_CONTEXT_MENU' })

  try {
    await persistTopologySnapshot(state.maps)
  } catch (error) {
    console.error('Nao foi possivel sincronizar a topologia antes do ping.', error)
  } finally {
    dispatch({
      type: 'SET_PING_RESULT',
      result: { deviceId: device.id },
    })
  }
}

export async function openDeviceTracert(device: Device, state: AppState, dispatch: StoreDispatch) {
  dispatch({ type: 'CLOSE_CONTEXT_MENU' })

  try {
    await persistTopologySnapshot(state.maps)
  } catch (error) {
    console.error('Nao foi possivel sincronizar a topologia antes do traceroute.', error)
  } finally {
    dispatch({
      type: 'SET_TRACERT_RESULT',
      result: { deviceId: device.id },
    })
  }
}
