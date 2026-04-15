'use client'

import { Link } from '@/lib/types'
import { buildCurvedLinkPath, getNodePosition } from '@/lib/netwatch/map-geometry'
import { MouseEvent, TouchEvent, useCallback, useEffect, useRef } from 'react'
import { getLinkCapacity, getLinkCapacityLabel, getLinkStrokeWidth } from '@/lib/netwatch/links'

const LONG_PRESS_MS = 480
const LONG_PRESS_MOVE_CANCEL = 14

interface LinkPathProps {
  link: Link
  isSelected: boolean
  showControlHandle: boolean
  nodeResolver: (nodeId: string) => ReturnType<typeof getNodePosition>
  onClick: () => void
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void
  onControlHandleMouseDown: (event: MouseEvent<SVGCircleElement>) => void
  onEndpointSelect: (end: 'source' | 'target') => void
  onEndpointEditRequest: (end: 'source' | 'target') => void
  onHitTouchStart?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchMove?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchEnd?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchCancel?: (event: TouchEvent<SVGPathElement>) => void
}

function LinkPortEndpoint({
  cx,
  cy,
  label,
  end,
  onSelect,
  onEditRequest,
}: {
  cx: number
  cy: number
  label?: string
  end: 'source' | 'target'
  onSelect: () => void
  onEditRequest: () => void
}) {
  const timerRef = useRef<number | null>(null)
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null)
  const longPressFiredRef = useRef(false)

  const clearLongPress = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    touchOriginRef.current = null
  }, [])

  useEffect(() => () => clearLongPress(), [clearLongPress])

  const raw = (label ?? '').trim()
  const display = raw.length > 10 ? `${raw.slice(0, 9)}…` : raw || '—'
  const isPlaceholder = !raw
  const w = Math.min(76, Math.max(28, 12 + Math.min(raw.length || 1, 10) * 5.4))
  const h = 20

  const handleMouseDown = (e: MouseEvent<SVGRectElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    onSelect()
  }

  const handleDoubleClick = (e: MouseEvent<SVGRectElement>) => {
    e.stopPropagation()
    e.preventDefault()
    onEditRequest()
  }

  const handleTouchStart = (e: TouchEvent<SVGRectElement>) => {
    e.stopPropagation()
    if (e.touches.length !== 1) return
    longPressFiredRef.current = false
    const t = e.touches[0]
    touchOriginRef.current = { x: t.clientX, y: t.clientY }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      touchOriginRef.current = null
      longPressFiredRef.current = true
      onEditRequest()
    }, LONG_PRESS_MS)
  }

  const handleTouchMove = (e: TouchEvent<SVGRectElement>) => {
    if (timerRef.current == null || !touchOriginRef.current || e.touches.length !== 1) return
    const t = e.touches[0]
    const d = Math.hypot(t.clientX - touchOriginRef.current.x, t.clientY - touchOriginRef.current.y)
    if (d > LONG_PRESS_MOVE_CANCEL) clearLongPress()
  }

  const handleTouchEnd = (e: TouchEvent<SVGRectElement>) => {
    e.stopPropagation()
    const pendingLongPress = timerRef.current != null
    clearLongPress()
    if (!longPressFiredRef.current && pendingLongPress) {
      onSelect()
    }
  }

  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ cursor: 'pointer' }}>
      <title>
        {`${end === 'source' ? 'Porta na origem' : 'Porta no destino'} — duplo clique ou toque longo para editar`}
      </title>
      <rect
        x={-w / 2 - 4}
        y={-h / 2 - 4}
        width={w + 8}
        height={h + 8}
        rx={8}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={5}
        fill="var(--link-endpoint-surface)"
        stroke="var(--link-endpoint-border)"
        strokeWidth={1}
        strokeDasharray="3 2"
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isPlaceholder ? 'var(--link-endpoint-placeholder)' : 'var(--link-endpoint-text)'}
        fontSize="8.5"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {display}
      </text>
    </g>
  )
}

export function LinkPath({
  link,
  isSelected,
  showControlHandle,
  nodeResolver,
  onClick,
  onContextMenu,
  onControlHandleMouseDown,
  onEndpointSelect,
  onEndpointEditRequest,
  onHitTouchStart,
  onHitTouchMove,
  onHitTouchEnd,
  onHitTouchCancel,
}: LinkPathProps) {
  const source = nodeResolver(link.sourceId)
  const target = nodeResolver(link.targetId)

  if (!source || !target) return null

  const { pathD, labelPoint, controlPoint, sourceEndpointLabelPoint, targetEndpointLabelPoint } = buildCurvedLinkPath(
    source,
    target,
    {
      dx: link.controlDx,
      dy: link.controlDy,
    },
  )
  const capacity = getLinkCapacity(link)
  const strokeWidth = getLinkStrokeWidth(capacity, isSelected)

  const stroke = isSelected ? 'var(--link-path-stroke-selected)' : 'var(--link-path-stroke)'

  return (
    <g>
      <path
        d={pathD}
        stroke="transparent"
        strokeWidth={Math.max(18, strokeWidth + 10)}
        fill="none"
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onTouchStart={onHitTouchStart}
        onTouchMove={onHitTouchMove}
        onTouchEnd={onHitTouchEnd}
        onTouchCancel={onHitTouchCancel}
      />

      <path
        d={pathD}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeOpacity={1}
        strokeLinecap="round"
        fill="none"
        style={{ pointerEvents: 'none' }}
      />

      <g transform={`translate(${labelPoint.x - 34}, ${labelPoint.y - 15})`} style={{ pointerEvents: 'none' }}>
        <rect
          width={68}
          height={link.label ? 32 : 20}
          rx={10}
          fill="var(--link-label-surface)"
          stroke="var(--link-label-border)"
        />
        <text
          x={34}
          y={13}
          textAnchor="middle"
          fill="var(--link-label-capacity-text)"
          fontSize="8"
          fontFamily="var(--font-mono)"
          fontWeight="700"
          style={{ userSelect: 'none' }}
        >
          {getLinkCapacityLabel(capacity)}
        </text>

        {link.label && (
          <text
            x={34}
            y={24}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="6.5"
            fontFamily="var(--font-sans)"
            style={{ userSelect: 'none' }}
          >
            {link.label}
          </text>
        )}
      </g>

      <LinkPortEndpoint
        cx={sourceEndpointLabelPoint.x}
        cy={sourceEndpointLabelPoint.y}
        label={link.sourcePortLabel}
        end="source"
        onSelect={() => onEndpointSelect('source')}
        onEditRequest={() => onEndpointEditRequest('source')}
      />
      <LinkPortEndpoint
        cx={targetEndpointLabelPoint.x}
        cy={targetEndpointLabelPoint.y}
        label={link.targetPortLabel}
        end="target"
        onSelect={() => onEndpointSelect('target')}
        onEditRequest={() => onEndpointEditRequest('target')}
      />

      {showControlHandle ? (
        <circle
          cx={controlPoint.x}
          cy={controlPoint.y}
          r={6}
          fill="var(--primary)"
          stroke="var(--background)"
          strokeWidth={1.5}
          style={{ cursor: 'grab' }}
          onMouseDown={onControlHandleMouseDown}
        />
      ) : null}
    </g>
  )
}
