'use client'

import { Device, Link, MapBadge, SubMapNode } from '@/lib/types'
import {
  buildCurvedLinkPath,
  getAutomaticLinkControlPoint,
  getNodePosition,
  hasLinkBetweenNodes,
  MAP_GRID_SIZE,
  MAP_NODE_SIZE,
  screenToCanvasPoint,
  snapToGrid,
} from '@/lib/netwatch/map-geometry'

const DUPLICATE_PASTE_OFFSET = MAP_GRID_SIZE * 2

type CanvasClipboard =
  | { kind: 'device'; device: Device }
  | { kind: 'badge'; badge: MapBadge }
  | { kind: 'submap'; node: SubMapNode }
import { clearSelection, deleteCurrentSelection } from '@/lib/netwatch/commands'
import { getStatusSummary, getSubmapNodeStatuses } from '@/lib/netwatch/status'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore, useActiveMap } from '@/lib/store'
import { generateId } from '@/lib/utils-net'
import { LinkPath } from './canvas/LinkPath'
import { DeviceNode } from './canvas/DeviceNode'
import { SubmapNode } from './canvas/SubmapNode'
import { BadgeNode } from './canvas/BadgeNode'

const CANVAS_ORIGIN = { x: 224, y: 176 }
const DEFAULT_WORKSPACE_SIZE = { width: 2200, height: 1400 }
const BACKGROUND_PAN_THRESHOLD_PX = 5

interface NetworkCanvasProps {
  zoom: number
  isCanvasLocked: boolean
  onZoomChange: (zoom: number) => void
  onFitViewReady: (fn: () => void) => void
}

export function NetworkCanvas({ zoom, isCanvasLocked, onZoomChange, onFitViewReady }: NetworkCanvasProps) {
  const { state, dispatch } = useStore()
  const activeMap = useActiveMap()
  const viewportRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingType, setDraggingType] = useState<'device' | 'submap' | 'badge' | null>(null)
  const [draggingLinkControlId, setDraggingLinkControlId] = useState<string | null>(null)
  const draggingLinkControlRef = useRef<string | null>(null)

  useEffect(() => {
    draggingLinkControlRef.current = draggingLinkControlId
  }, [draggingLinkControlId])
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [pointerCanvasPoint, setPointerCanvasPoint] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const canvasClipboardRef = useRef<CanvasClipboard | null>(null)
  const backgroundPanCandidateRef = useRef<{ sx: number; sy: number } | null>(null)

  const submapStatuses = useMemo(() => getSubmapNodeStatuses(state.maps), [state.maps])
  const submapSummaries = useMemo(() => {
    const mapById = new Map(state.maps.map(map => [map.id, map]))

    return Object.fromEntries(
      activeMap.submapNodes.map(node => [
        node.id,
        getStatusSummary(mapById.get(node.targetMapId)?.devices ?? []),
      ])
    )
  }, [activeMap.submapNodes, state.maps])

  useEffect(() => {
    const container = viewportRef.current
    if (!container) return

    const updateViewportSize = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    }

    updateViewportSize()

    const observer = new ResizeObserver(updateViewportSize)
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const workspaceSize = useMemo(() => {
    const allNodes = [...activeMap.devices, ...activeMap.submapNodes, ...activeMap.badges]

    if (allNodes.length === 0) {
      return DEFAULT_WORKSPACE_SIZE
    }

    const maxX = Math.max(...allNodes.map(node => node.x))
    const maxY = Math.max(...allNodes.map(node => node.y))

    return {
      width: Math.max(DEFAULT_WORKSPACE_SIZE.width, maxX + 640),
      height: Math.max(DEFAULT_WORKSPACE_SIZE.height, maxY + 480),
    }
  }, [activeMap.badges, activeMap.devices, activeMap.submapNodes])

  const canvasSize = useMemo(() => ({
    width: Math.max(
      viewportSize.width,
      workspaceSize.width * zoom + CANVAS_ORIGIN.x * 2 + Math.abs(pan.x) * 2
    ),
    height: Math.max(
      viewportSize.height,
      workspaceSize.height * zoom + CANVAS_ORIGIN.y * 2 + Math.abs(pan.y) * 2
    ),
  }), [pan.x, pan.y, viewportSize.height, viewportSize.width, workspaceSize.height, workspaceSize.width, zoom])

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const svg = svgRef.current

    if (!svg) return { x: 0, y: 0 }

    return screenToCanvasPoint(
      { x: sx, y: sy },
      svg.getBoundingClientRect(),
      { x: CANVAS_ORIGIN.x + pan.x, y: CANVAS_ORIGIN.y + pan.y },
      zoom
    )
  }, [pan, zoom])

  const getCanvasNodePosition = useCallback((nodeId: string) => {
    return getNodePosition(nodeId, activeMap.devices, activeMap.submapNodes)
  }, [activeMap.devices, activeMap.submapNodes])

  const linksRenderOrder = useMemo(() => {
    const links = [...activeMap.links]
    const sel = state.selectedLinkId
    if (!sel) return links
    const ix = links.findIndex(l => l.id === sel)
    if (ix === -1) return links
    const [picked] = links.splice(ix, 1)
    links.push(picked)
    return links
  }, [activeMap.links, state.selectedLinkId])

  const selectedLinkSource = state.pendingLinkSourceId
    ? getCanvasNodePosition(state.pendingLinkSourceId)
    : null

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()

    const delta = event.deltaY > 0 ? 0.9 : 1.1
    onZoomChange(Math.min(3, Math.max(0.2, zoom * delta)))
  }, [zoom, onZoomChange])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    svg.addEventListener('wheel', handleWheel, { passive: false })

    return () => svg.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const fitView = useCallback(() => {
    const allNodes = [...activeMap.devices, ...activeMap.submapNodes, ...activeMap.badges]

    if (!viewportRef.current || allNodes.length === 0) {
      onZoomChange(1)
      setPan({ x: 0, y: 0 })
      return
    }

    const rect = viewportRef.current.getBoundingClientRect()
    const xs = allNodes.map(node => node.x)
    const ys = allNodes.map(node => node.y)
    const minX = Math.min(...xs) - MAP_NODE_SIZE - 80
    const maxX = Math.max(...xs) + MAP_NODE_SIZE + 80
    const minY = Math.min(...ys) - MAP_NODE_SIZE - 80
    const maxY = Math.max(...ys) + MAP_NODE_SIZE + 80
    const scaleX = rect.width / (maxX - minX)
    const scaleY = rect.height / (maxY - minY)
    const newZoom = Math.min(scaleX, scaleY, 1.5)

    onZoomChange(newZoom)
    setPan({
      x: (rect.width - (maxX + minX) * newZoom) / 2 - CANVAS_ORIGIN.x,
      y: (rect.height - (maxY + minY) * newZoom) / 2 - CANVAS_ORIGIN.y,
    })
  }, [activeMap.badges, activeMap.devices, activeMap.submapNodes, onZoomChange])

  useEffect(() => {
    onFitViewReady(fitView)
  }, [fitView, onFitViewReady])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (target instanceof HTMLElement && target.isContentEditable) return

      const mod = event.ctrlKey || event.metaKey

      if (mod && (event.key === 'c' || event.key === 'C')) {
        if (isCanvasLocked) return
        if (state.selectedDeviceId) {
          const device = activeMap.devices.find(d => d.id === state.selectedDeviceId)
          if (device) {
            canvasClipboardRef.current = { kind: 'device', device: { ...device } }
            event.preventDefault()
          }
          return
        }
        if (state.selectedBadgeId) {
          const badge = activeMap.badges.find(b => b.id === state.selectedBadgeId)
          if (badge) {
            canvasClipboardRef.current = { kind: 'badge', badge: { ...badge } }
            event.preventDefault()
          }
          return
        }
        if (state.selectedSubmapId) {
          const node = activeMap.submapNodes.find(n => n.id === state.selectedSubmapId)
          if (node) {
            canvasClipboardRef.current = { kind: 'submap', node: { ...node } }
            event.preventDefault()
          }
        }
        return
      }

      if (mod && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault()
        if (event.shiftKey) {
          dispatch({ type: 'REDO_MAP_HISTORY' })
        } else {
          dispatch({ type: 'UNDO_MAP_HISTORY' })
        }
        return
      }

      if (mod && (event.key === 'y' || event.key === 'Y')) {
        event.preventDefault()
        dispatch({ type: 'REDO_MAP_HISTORY' })
        return
      }

      if (mod && (event.key === 'v' || event.key === 'V')) {
        if (isCanvasLocked) return
        const clip = canvasClipboardRef.current
        if (!clip) return
        event.preventDefault()

        if (clip.kind === 'device') {
          const d = clip.device
          const newId = generateId()
          const newDevice: Device = {
            ...d,
            id: newId,
            mapId: state.activeMapId,
            x: snapToGrid(d.x + DUPLICATE_PASTE_OFFSET),
            y: snapToGrid(d.y + DUPLICATE_PASTE_OFFSET),
          }
          dispatch({ type: 'ADD_DEVICE', device: newDevice })
          dispatch({ type: 'SELECT_DEVICE', deviceId: newId })
          return
        }

        if (clip.kind === 'badge') {
          const b = clip.badge
          const newId = generateId()
          const newBadge: MapBadge = {
            ...b,
            id: newId,
            mapId: state.activeMapId,
            x: snapToGrid(b.x + DUPLICATE_PASTE_OFFSET),
            y: snapToGrid(b.y + DUPLICATE_PASTE_OFFSET),
          }
          dispatch({ type: 'ADD_BADGE', badge: newBadge })
          dispatch({ type: 'SELECT_BADGE', badgeId: newId })
          return
        }

        const n = clip.node
        const newId = generateId()
        const newNode: SubMapNode = {
          ...n,
          id: newId,
          mapId: state.activeMapId,
          x: snapToGrid(n.x + DUPLICATE_PASTE_OFFSET),
          y: snapToGrid(n.y + DUPLICATE_PASTE_OFFSET),
        }
        dispatch({ type: 'ADD_SUBMAP_NODE', node: newNode })
        dispatch({ type: 'SELECT_SUBMAP', submapId: newId })
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (mod) return
        deleteCurrentSelection(state, dispatch)
      }

      if (event.key === 'Escape') {
        backgroundPanCandidateRef.current = null
        if (draggingLinkControlRef.current) {
          dispatch({ type: 'END_MAP_HISTORY_TRANSACTION' })
          setDraggingLinkControlId(null)
        }
        clearSelection(dispatch)
        dispatch({ type: 'CLOSE_CONTEXT_MENU' })
        dispatch({ type: 'CANCEL_LINK_CREATION' })
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeMap.badges, activeMap.devices, activeMap.submapNodes, dispatch, isCanvasLocked, state])

  const handleContextMenu = (event: React.MouseEvent<SVGSVGElement>) => {
    event.preventDefault()

    dispatch({
      type: 'OPEN_CONTEXT_MENU',
      menu: {
        type: 'canvas',
        x: event.clientX,
        y: event.clientY,
        canvasPoint: screenToCanvas(event.clientX, event.clientY),
      },
    })
  }

  const handleSvgMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (state.contextMenu) {
      dispatch({ type: 'CLOSE_CONTEXT_MENU' })
    }

    if (!isCanvasLocked && (event.button === 1 || (event.button === 0 && event.altKey))) {
      setIsPanning(true)
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
      return
    }

    if (event.button !== 0) return

    const target = event.target as SVGElement
    if (target.tagName === 'svg' || target.id === 'canvas-bg') {
      if (!isCanvasLocked) {
        backgroundPanCandidateRef.current = { sx: event.clientX, sy: event.clientY }
        setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })
        return
      }
      clearSelection(dispatch)
      dispatch({ type: 'CANCEL_LINK_CREATION' })
    }
  }

  const handleSvgMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const canvasPoint = screenToCanvas(event.clientX, event.clientY)
    setPointerCanvasPoint(canvasPoint)

    if (isCanvasLocked) {
      if (isPanning || draggingId || draggingType || draggingLinkControlId) {
        setIsPanning(false)
        setDraggingId(null)
        setDraggingType(null)
        setDraggingLinkControlId(null)
      }
      backgroundPanCandidateRef.current = null
      return
    }

    const bg = backgroundPanCandidateRef.current
    if (bg && !isPanning && !draggingId && !draggingLinkControlId) {
      const dx = event.clientX - bg.sx
      const dy = event.clientY - bg.sy
      if (Math.hypot(dx, dy) > BACKGROUND_PAN_THRESHOLD_PX) {
        backgroundPanCandidateRef.current = null
        setIsPanning(true)
        clearSelection(dispatch)
        dispatch({ type: 'CANCEL_LINK_CREATION' })
      }
    }

    if (isPanning) {
      setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y })
      return
    }

    if (draggingLinkControlId) {
      const link = activeMap.links.find(l => l.id === draggingLinkControlId)
      if (!link) {
        setDraggingLinkControlId(null)
        return
      }
      const source = getCanvasNodePosition(link.sourceId)
      const target = getCanvasNodePosition(link.targetId)
      if (!source || !target) return

      const auto = getAutomaticLinkControlPoint(source, target)
      const dx = snapToGrid(canvasPoint.x - auto.x)
      const dy = snapToGrid(canvasPoint.y - auto.y)

      dispatch({
        type: 'UPDATE_LINK',
        link: {
          id: link.id,
          mapId: link.mapId,
          controlDx: dx,
          controlDy: dy,
        },
      })
      return
    }

    if (!draggingId || !draggingType) return

    const x = snapToGrid(canvasPoint.x - dragOffset.x)
    const y = snapToGrid(canvasPoint.y - dragOffset.y)

    if (draggingType === 'device') {
      dispatch({ type: 'MOVE_DEVICE', deviceId: draggingId, mapId: state.activeMapId, x, y })
      return
    }

    if (draggingType === 'submap') {
      dispatch({ type: 'MOVE_SUBMAP_NODE', nodeId: draggingId, mapId: state.activeMapId, x, y })
      return
    }

    dispatch({ type: 'MOVE_BADGE', badgeId: draggingId, mapId: state.activeMapId, x, y })
  }

  const handleSvgMouseUp = () => {
    const bg = backgroundPanCandidateRef.current
    if (bg) {
      if (!isPanning) {
        clearSelection(dispatch)
        dispatch({ type: 'CANCEL_LINK_CREATION' })
      }
      backgroundPanCandidateRef.current = null
    }

    if (draggingId || draggingLinkControlId) {
      dispatch({ type: 'END_MAP_HISTORY_TRANSACTION' })
    }
    setIsPanning(false)
    setDraggingId(null)
    setDraggingType(null)
    setDraggingLinkControlId(null)
  }

  const handleDeviceMouseDown = (event: React.MouseEvent<SVGGElement>, device: Device) => {
    if (event.button !== 0) return

    event.stopPropagation()

    if (state.pendingLinkSourceId) {
      if (state.pendingLinkSourceId === device.id) {
        dispatch({ type: 'CANCEL_LINK_CREATION' })
        return
      }

      if (!hasLinkBetweenNodes(activeMap.links, state.pendingLinkSourceId, device.id)) {
        dispatch({
          type: 'ADD_LINK',
          link: {
            id: generateId(),
            sourceId: state.pendingLinkSourceId,
            targetId: device.id,
            mapId: state.activeMapId,
            capacity: '1g',
            rxBps: 0,
            txBps: 0,
          },
        })
      } else {
        dispatch({ type: 'CANCEL_LINK_CREATION' })
      }

      return
    }

    dispatch({ type: 'SELECT_DEVICE', deviceId: device.id })

    if (isCanvasLocked) {
      return
    }

    const canvasPoint = screenToCanvas(event.clientX, event.clientY)
    setDragOffset({ x: canvasPoint.x - device.x, y: canvasPoint.y - device.y })
    dispatch({ type: 'BEGIN_MAP_HISTORY_TRANSACTION' })
    setDraggingId(device.id)
    setDraggingType('device')
  }

  const handleDeviceContextMenu = (event: React.MouseEvent<SVGGElement>, device: Device) => {
    event.preventDefault()
    event.stopPropagation()

    dispatch({ type: 'SELECT_DEVICE', deviceId: device.id })
    dispatch({
      type: 'OPEN_CONTEXT_MENU',
      menu: { type: 'device', x: event.clientX, y: event.clientY, targetId: device.id },
    })
  }

  const handleSubmapMouseDown = (event: React.MouseEvent<SVGGElement>, node: SubMapNode) => {
    if (event.button !== 0) return

    event.stopPropagation()

    if (state.pendingLinkSourceId) {
      if (state.pendingLinkSourceId === node.id) {
        dispatch({ type: 'CANCEL_LINK_CREATION' })
        return
      }

      if (!hasLinkBetweenNodes(activeMap.links, state.pendingLinkSourceId, node.id)) {
        dispatch({
          type: 'ADD_LINK',
          link: {
            id: generateId(),
            sourceId: state.pendingLinkSourceId,
            targetId: node.id,
            mapId: state.activeMapId,
            capacity: '1g',
          },
        })
      } else {
        dispatch({ type: 'CANCEL_LINK_CREATION' })
      }

      return
    }

    dispatch({ type: 'SELECT_SUBMAP', submapId: node.id })

    if (isCanvasLocked) {
      return
    }

    const canvasPoint = screenToCanvas(event.clientX, event.clientY)
    setDragOffset({ x: canvasPoint.x - node.x, y: canvasPoint.y - node.y })
    dispatch({ type: 'BEGIN_MAP_HISTORY_TRANSACTION' })
    setDraggingId(node.id)
    setDraggingType('submap')
  }

  const handleSubmapDoubleClick = (event: React.MouseEvent<SVGGElement>, node: SubMapNode) => {
    event.stopPropagation()
    dispatch({ type: 'SET_ACTIVE_MAP', mapId: node.targetMapId })
  }

  const handleSubmapContextMenu = (event: React.MouseEvent<SVGGElement>, node: SubMapNode) => {
    event.preventDefault()
    event.stopPropagation()

    dispatch({ type: 'SELECT_SUBMAP', submapId: node.id })
    dispatch({
      type: 'OPEN_CONTEXT_MENU',
      menu: { type: 'submap', x: event.clientX, y: event.clientY, targetId: node.id },
    })
  }

  const handleBadgeMouseDown = (event: React.MouseEvent<SVGGElement>, badge: MapBadge) => {
    if (event.button !== 0) return

    event.stopPropagation()
    dispatch({ type: 'SELECT_BADGE', badgeId: badge.id })

    if (isCanvasLocked) {
      return
    }

    const canvasPoint = screenToCanvas(event.clientX, event.clientY)
    setDragOffset({ x: canvasPoint.x - badge.x, y: canvasPoint.y - badge.y })
    dispatch({ type: 'BEGIN_MAP_HISTORY_TRANSACTION' })
    setDraggingId(badge.id)
    setDraggingType('badge')
  }

  const handleBadgeContextMenu = (event: React.MouseEvent<SVGGElement>, badge: MapBadge) => {
    event.preventDefault()
    event.stopPropagation()

    dispatch({ type: 'SELECT_BADGE', badgeId: badge.id })
    dispatch({
      type: 'OPEN_CONTEXT_MENU',
      menu: { type: 'badge', x: event.clientX, y: event.clientY, targetId: badge.id },
    })
  }

  const handleLinkControlMouseDown = (event: React.MouseEvent<SVGCircleElement>, link: Link) => {
    if (event.button !== 0) return
    if (isCanvasLocked) return

    event.preventDefault()
    event.stopPropagation()

    dispatch({ type: 'SELECT_LINK', linkId: link.id })
    dispatch({ type: 'BEGIN_MAP_HISTORY_TRANSACTION' })
    setDraggingLinkControlId(link.id)
  }

  const handleLinkContextMenu = (event: React.MouseEvent<SVGPathElement>, link: Link) => {
    event.preventDefault()
    event.stopPropagation()

    dispatch({ type: 'SELECT_LINK', linkId: link.id })
    dispatch({
      type: 'OPEN_CONTEXT_MENU',
      menu: { type: 'link', x: event.clientX, y: event.clientY, targetId: link.id },
    })
  }

  const temporaryLinkPath = selectedLinkSource
    ? buildCurvedLinkPath(selectedLinkSource, pointerCanvasPoint)
    : null

  const svgCursor = isPanning || draggingLinkControlId
    ? 'grabbing'
    : state.pendingLinkSourceId
      ? 'crosshair'
      : isCanvasLocked
        ? 'default'
        : 'grab'

  return (
    <div ref={viewportRef} className="relative flex-1 overflow-auto bg-canvas-bg">
      <div
        className="relative min-h-full min-w-full"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      >
        <svg
          ref={svgRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="block select-none"
          style={{ cursor: svgCursor, background: 'var(--canvas-bg)' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onContextMenu={handleContextMenu}
        >
          <defs>
            <pattern
              id="grid"
              width={MAP_GRID_SIZE * zoom}
              height={MAP_GRID_SIZE * zoom}
              patternUnits="userSpaceOnUse"
              x={(CANVAS_ORIGIN.x + pan.x) % (MAP_GRID_SIZE * zoom)}
              y={(CANVAS_ORIGIN.y + pan.y) % (MAP_GRID_SIZE * zoom)}
            >
              <circle
                cx={MAP_GRID_SIZE * zoom / 2}
                cy={MAP_GRID_SIZE * zoom / 2}
                r={0.7}
                fill="var(--canvas-grid)"
              />
            </pattern>
          </defs>

          <rect id="canvas-bg" width={canvasSize.width} height={canvasSize.height} fill="url(#grid)" />

          <g transform={`translate(${CANVAS_ORIGIN.x + pan.x}, ${CANVAS_ORIGIN.y + pan.y}) scale(${zoom})`}>
            {linksRenderOrder.map(link => (
              <LinkPath
                key={link.id}
                link={link}
                isSelected={state.selectedLinkId === link.id}
                showControlHandle={!isCanvasLocked && state.selectedLinkId === link.id}
                nodeResolver={getCanvasNodePosition}
                onClick={() => {
                  if (state.selectedLinkId === link.id) {
                    dispatch({ type: 'SET_EDITING_LINK', link })
                    return
                  }

                  dispatch({ type: 'SELECT_LINK', linkId: link.id })
                }}
                onContextMenu={event => handleLinkContextMenu(event, link)}
                onControlHandleMouseDown={event => handleLinkControlMouseDown(event, link)}
              />
            ))}

            {temporaryLinkPath && (
              <path
                d={temporaryLinkPath.pathD}
                stroke="rgba(251,191,36,0.8)"
                strokeWidth="3"
                strokeDasharray="6 4"
                fill="none"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {activeMap.submapNodes.map(node => (
              <SubmapNode
                key={node.id}
                node={node}
                status={submapStatuses[node.id] ?? 'unknown'}
                summary={submapSummaries[node.id] ?? { total: 0, up: 0, down: 0, warning: 0 }}
                isSelected={state.selectedSubmapId === node.id}
                isLinkSource={state.pendingLinkSourceId === node.id}
                onMouseDown={event => handleSubmapMouseDown(event, node)}
                onDoubleClick={event => handleSubmapDoubleClick(event, node)}
                onContextMenu={event => handleSubmapContextMenu(event, node)}
              />
            ))}

            {activeMap.badges.map(badge => (
              <BadgeNode
                key={badge.id}
                badge={badge}
                isSelected={state.selectedBadgeId === badge.id}
                onMouseDown={event => handleBadgeMouseDown(event, badge)}
                onContextMenu={event => handleBadgeContextMenu(event, badge)}
              />
            ))}

            {activeMap.devices.map(device => (
              <DeviceNode
                key={device.id}
                device={device}
                isSelected={state.selectedDeviceId === device.id}
                isLinkSource={state.pendingLinkSourceId === device.id}
                onMouseDown={event => handleDeviceMouseDown(event, device)}
                onContextMenu={event => handleDeviceContextMenu(event, device)}
              />
            ))}
          </g>
        </svg>

        {activeMap.devices.length === 0 && activeMap.submapNodes.length === 0 && activeMap.badges.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhum item neste mapa</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Clique com o botão direito para adicionar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
