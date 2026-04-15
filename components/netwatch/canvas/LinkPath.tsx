'use client'

import { Link } from '@/lib/types'
import { buildCurvedLinkPath, getNodePosition } from '@/lib/netwatch/map-geometry'
import { MouseEvent, TouchEvent } from 'react'
import { getLinkCapacity, getLinkCapacityLabel, getLinkStrokeWidth } from '@/lib/netwatch/links'

interface LinkPathProps {
  link: Link
  isSelected: boolean
  showControlHandle: boolean
  nodeResolver: (nodeId: string) => ReturnType<typeof getNodePosition>
  onClick: () => void
  onContextMenu: (event: MouseEvent<SVGPathElement>) => void
  onControlHandleMouseDown: (event: MouseEvent<SVGCircleElement>) => void
  onHitTouchStart?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchMove?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchEnd?: (event: TouchEvent<SVGPathElement>) => void
  onHitTouchCancel?: (event: TouchEvent<SVGPathElement>) => void
}

export function LinkPath({
  link,
  isSelected,
  showControlHandle,
  nodeResolver,
  onClick,
  onContextMenu,
  onControlHandleMouseDown,
  onHitTouchStart,
  onHitTouchMove,
  onHitTouchEnd,
  onHitTouchCancel,
}: LinkPathProps) {
  const source = nodeResolver(link.sourceId)
  const target = nodeResolver(link.targetId)

  if (!source || !target) return null

  const { pathD, labelPoint, controlPoint } = buildCurvedLinkPath(source, target, {
    dx: link.controlDx,
    dy: link.controlDy,
  })
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

      {showControlHandle && (
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
      )}
    </g>
  )
}
