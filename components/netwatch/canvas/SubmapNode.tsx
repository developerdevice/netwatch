'use client'

import { DeviceStatus, SubMapNode as SubMapNodeType } from '@/lib/types'
import { truncateNodeLabel } from '@/lib/netwatch/map-geometry'
import { statusColorHex } from '@/lib/utils-net'
import { MouseEvent } from 'react'
import { StatusSummary } from '@/lib/netwatch/status'

interface SubmapNodeProps {
  node: SubMapNodeType
  status: DeviceStatus
  summary: StatusSummary
  isSelected: boolean
  isLinkSource: boolean
  onMouseDown: (event: MouseEvent<SVGGElement>) => void
  onDoubleClick: (event: MouseEvent<SVGGElement>) => void
  onContextMenu: (event: MouseEvent<SVGGElement>) => void
}

export function SubmapNode({
  node,
  status,
  summary,
  isSelected,
  isLinkSource,
  onMouseDown,
  onDoubleClick,
  onContextMenu,
}: SubmapNodeProps) {
  const color = statusColorHex(status)
  const radiusX = 72
  const radiusY = 54

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{ cursor: isLinkSource ? 'crosshair' : 'pointer' }}
    >
      {isSelected && (
        <ellipse
          rx={radiusX + 5}
          ry={radiusY + 5}
          fill="none"
          stroke="var(--canvas-node-selection-ring)"
          strokeWidth="1.5"
        />
      )}

      {isLinkSource && (
        <ellipse
          rx={radiusX + 10}
          ry={radiusY + 10}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeOpacity={0.75}
        />
      )}

      <ellipse
        rx={radiusX}
        ry={radiusY}
        fill="var(--card)"
        stroke={color}
        strokeWidth={1.25}
        strokeOpacity={0.45}
      />

      <ellipse
        rx={radiusX - 6}
        ry={radiusY - 6}
        fill={color}
        fillOpacity={0.08}
      />

      <text
        y={-12}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize="11"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {truncateNodeLabel(node.label)}
      </text>

      <text
        y={4}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize="7.5"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        MAPA
      </text>

      <text
        y={24}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize="8.5"
        fontFamily="var(--font-mono)"
        fontWeight="600"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {summary.total}
        <tspan fill="var(--muted-foreground)"> / </tspan>
        <tspan fill="var(--status-online)">{summary.up}</tspan>
        <tspan fill="var(--muted-foreground)"> / </tspan>
        <tspan fill="var(--status-offline)">{summary.down}</tspan>
      </text>
    </g>
  )
}
