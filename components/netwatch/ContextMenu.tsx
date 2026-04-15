'use client'

import { useStore, useActiveMap } from '@/lib/store'
import { Trash2, Edit, History, Activity, Route, Plus, MapPin, Link2, FolderPlus, Tag, RotateCcw } from 'lucide-react'
import { ElementType, useEffect, useRef } from 'react'
import { openDeviceHistory, openDevicePing, openDeviceTracert } from '@/lib/netwatch/commands'

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: ElementType
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm transition-colors ${
        destructive
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-popover-foreground hover:bg-accent'
      }`}
    >
      <Icon size={14} className="opacity-70" />
      {label}
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-border my-1" />
}

export function ContextMenu() {
  const { state, dispatch } = useStore()
  const activeMap = useActiveMap()
  const menuRef = useRef<HTMLDivElement>(null)

  const { contextMenu } = state

  useEffect(() => {
    const handlePointerOrTouch = (e: MouseEvent | TouchEvent) => {
      const target = e instanceof TouchEvent ? e.target : e.target
      if (menuRef.current && target instanceof Node && !menuRef.current.contains(target)) {
        dispatch({ type: 'CLOSE_CONTEXT_MENU' })
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'CLOSE_CONTEXT_MENU' })
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handlePointerOrTouch)
      document.addEventListener('touchstart', handlePointerOrTouch, { capture: true })
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerOrTouch)
      document.removeEventListener('touchstart', handlePointerOrTouch, { capture: true })
      document.removeEventListener('keydown', handleEsc)
    }
  }, [contextMenu, dispatch])

  if (!contextMenu || !contextMenu.type) return null

  const { type, x, y, targetId } = contextMenu

  if (type === 'canvas') {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        <MenuItem
          icon={Plus}
          label="Adicionar Dispositivo"
          onClick={() => {
            if (!contextMenu.canvasPoint) return

            dispatch({
              type: 'OPEN_CREATE_DEVICE',
              draft: {
                mapId: state.activeMapId,
                point: contextMenu.canvasPoint,
              },
            })
          }}
        />
        <MenuItem
          icon={FolderPlus}
          label="Adicionar Submap"
          onClick={() => {
            if (!contextMenu.canvasPoint) return

            dispatch({
              type: 'OPEN_CREATE_SUBMAP',
              draft: {
                mapId: state.activeMapId,
                point: contextMenu.canvasPoint,
              },
            })
          }}
        />
        <MenuItem
          icon={Tag}
          label="Adicionar Badge"
          onClick={() => {
            if (!contextMenu.canvasPoint) return

            dispatch({
              type: 'OPEN_CREATE_BADGE',
              draft: {
                mapId: state.activeMapId,
                point: contextMenu.canvasPoint,
              },
            })
          }}
        />
      </div>
    )
  }

  if (type === 'device' && targetId) {
    const device = activeMap.devices.find(d => d.id === targetId)
    if (!device) return null

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        <MenuItem
          icon={Activity}
          label="Ping"
          onClick={() => {
            void openDevicePing(device, state, dispatch)
          }}
        />
        <MenuItem
          icon={Route}
          label="Traceroute"
          onClick={() => {
            void openDeviceTracert(device, state, dispatch)
          }}
        />
        <MenuItem
          icon={History}
          label="Histórico"
          onClick={() => openDeviceHistory(device.id, dispatch)}
        />
        <Divider />
        <MenuItem
          icon={Edit}
          label="Editar"
          onClick={() => dispatch({ type: 'SET_EDITING_DEVICE', device })}
        />
        <MenuItem
          icon={Link2}
          label="Criar Conexão"
          onClick={() => {
            dispatch({ type: 'START_LINK_CREATION', sourceNodeId: device.id, sourceNodeType: 'device' })
          }}
        />
        <Divider />
        <MenuItem
          icon={Trash2}
          label="Deletar"
          destructive
          onClick={() => dispatch({ type: 'REMOVE_DEVICE', deviceId: device.id, mapId: state.activeMapId })}
        />
      </div>
    )
  }

  if (type === 'submap' && targetId) {
    const submap = activeMap.submapNodes.find(s => s.id === targetId)
    if (!submap) return null

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        <MenuItem
          icon={MapPin}
          label="Abrir Mapa"
          onClick={() => {
            dispatch({ type: 'CLOSE_CONTEXT_MENU' })
            dispatch({ type: 'SET_ACTIVE_MAP', mapId: submap.targetMapId })
          }}
        />
        <MenuItem
          icon={Edit}
          label="Editar"
          onClick={() => dispatch({ type: 'SET_EDITING_SUBMAP', submap })}
        />
        <MenuItem
          icon={Link2}
          label="Criar Conexão"
          onClick={() => {
            dispatch({ type: 'START_LINK_CREATION', sourceNodeId: submap.id, sourceNodeType: 'submap' })
          }}
        />
        <Divider />
        <MenuItem
          icon={Trash2}
          label="Deletar Nó"
          destructive
          onClick={() => dispatch({ type: 'REMOVE_SUBMAP_NODE', nodeId: submap.id, mapId: state.activeMapId })}
        />
      </div>
    )
  }

  if (type === 'link' && targetId) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        <MenuItem
          icon={Edit}
          label="Editar Conexão"
          onClick={() => {
            const link = activeMap.links.find(item => item.id === targetId)
            if (!link) return
            dispatch({ type: 'SET_EDITING_LINK', link })
          }}
        />
        <MenuItem
          icon={RotateCcw}
          label="Redefinir formato da linha"
          onClick={() =>
            dispatch({
              type: 'UPDATE_LINK',
              link: {
                id: targetId,
                mapId: state.activeMapId,
                controlDx: undefined,
                controlDy: undefined,
              },
            })
          }
        />
        <Divider />
        <MenuItem
          icon={Trash2}
          label="Deletar Conexão"
          destructive
          onClick={() => dispatch({ type: 'REMOVE_LINK', linkId: targetId, mapId: state.activeMapId })}
        />
      </div>
    )
  }

  if (type === 'badge' && targetId) {
    const badge = activeMap.badges.find(item => item.id === targetId)
    if (!badge) return null

    return (
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        <MenuItem
          icon={Edit}
          label="Editar Badge"
          onClick={() => dispatch({ type: 'SET_EDITING_BADGE', badge })}
        />
        <Divider />
        <MenuItem
          icon={Trash2}
          label="Deletar Badge"
          destructive
          onClick={() => dispatch({ type: 'REMOVE_BADGE', badgeId: targetId, mapId: state.activeMapId })}
        />
      </div>
    )
  }

  return null
}
