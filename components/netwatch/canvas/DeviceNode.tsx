'use client'

import { Device, DeviceIcon } from '@/lib/types'
import { truncateNodeLabel } from '@/lib/netwatch/map-geometry'
import { statusColorHex } from '@/lib/utils-net'
import { MouseEvent, TouchEvent } from 'react'

function DeviceIconSvg({ icon, color }: { icon: DeviceIcon; color: string }) {
  const props = { fill: color, fillOpacity: 0.9 }

  switch (icon) {
    case 'router':
      return (
        <g transform="translate(-10, -10) scale(0.8)">
          <rect x="2" y="8" width="20" height="10" rx="2" {...props} />
          <circle cx="6" cy="13" r="1.5" fill="currentColor" fillOpacity={0.3} />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" fillOpacity={0.3} />
          <path d="M12 4 L12 8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M8 6 L12 4 L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )
    case 'router-antenna':
      return (
        <g transform="translate(-10, -10) scale(0.8)">
          <rect x="2" y="10" width="20" height="8" rx="2" {...props} />
          <circle cx="6" cy="14" r="1.5" fill="currentColor" fillOpacity={0.3} />
          <path d="M18 10 L18 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M14 4 L18 2 L22 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M15 6 L18 4 L21 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'switch':
      return (
        <g transform="translate(-10, -8) scale(0.8)">
          <rect x="1" y="8" width="22" height="8" rx="1.5" {...props} />
          <rect x="4" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.4} />
          <rect x="8" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.4} />
          <rect x="12" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.4} />
          <rect x="16" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.4} />
          <rect x="20" y="11" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.4} />
        </g>
      )
    case 'server':
      return (
        <g transform="translate(-10, -12) scale(0.8)">
          <rect x="4" y="2" width="16" height="6" rx="1" {...props} />
          <rect x="4" y="10" width="16" height="6" rx="1" {...props} />
          <rect x="4" y="18" width="16" height="6" rx="1" {...props} />
          <circle cx="7" cy="5" r="1" fill="currentColor" fillOpacity={0.4} />
          <circle cx="7" cy="13" r="1" fill="currentColor" fillOpacity={0.4} />
          <circle cx="7" cy="21" r="1" fill="currentColor" fillOpacity={0.4} />
        </g>
      )
    case 'tower':
      return (
        <g transform="translate(-10, -12) scale(0.8)">
          <path d="M12 2 L12 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M6 5 L12 2 L18 5" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M8 8 L12 5 L16 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M6 10 L12 8 L18 10" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M8 22 L10 10 L12 10 L14 10 L16 22" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
          <path d="M6 22 L18 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    case 'access-point':
      return (
        <g transform="translate(-10, -10) scale(0.8)">
          <ellipse cx="12" cy="16" rx="8" ry="4" {...props} />
          <path d="M12 12 L12 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 8 C8 4 16 4 18 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M8 6 C10 3 14 3 16 6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      )
    default:
      return (
        <g transform="translate(-10, -10) scale(0.8)">
          <rect x="2" y="2" width="20" height="20" rx="3" {...props} />
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity={0.3} />
        </g>
      )
  }
}

interface DeviceNodeProps {
  device: Device
  isSelected: boolean
  isLinkSource: boolean
  onMouseDown: (event: MouseEvent<SVGGElement>) => void
  onContextMenu: (event: MouseEvent<SVGGElement>) => void
  onTouchStart?: (event: TouchEvent<SVGGElement>) => void
  onTouchMove?: (event: TouchEvent<SVGGElement>) => void
  onTouchEnd?: (event: TouchEvent<SVGGElement>) => void
  onTouchCancel?: (event: TouchEvent<SVGGElement>) => void
}

export function DeviceNode({
  device,
  isSelected,
  isLinkSource,
  onMouseDown,
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}: DeviceNodeProps) {
  const color = statusColorHex(device.status)
  const width = 148
  const height = 60
  const halfWidth = width / 2
  const halfHeight = height / 2

  return (
    <g
      transform={`translate(${device.x}, ${device.y})`}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ cursor: isLinkSource ? 'crosshair' : 'grab' }}
      className="group"
    >
      {isSelected && (
        <rect
          x={-halfWidth - 3}
          y={-halfHeight - 3}
          width={width + 6}
          height={height + 6}
          rx={18}
          fill="none"
          stroke="var(--canvas-node-selection-ring)"
          strokeWidth="1.5"
        />
      )}

      {isLinkSource && (
        <rect
          x={-halfWidth - 6}
          y={-halfHeight - 6}
          width={width + 12}
          height={height + 12}
          rx={20}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          strokeOpacity="0.75"
        />
      )}

      <rect
        x={-halfWidth}
        y={-halfHeight}
        width={width}
        height={height}
        rx={16}
        fill="var(--card)"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={1}
      />

      <rect
        x={-halfWidth}
        y={-halfHeight}
        width={width}
        height={6}
        rx={16}
        fill={color}
        fillOpacity={0.88}
      />

      <circle
        cx={-halfWidth + 22}
        cy={0}
        r={14}
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeOpacity={0.28}
      />

      <g transform={`translate(${-halfWidth + 22}, 0)`}>
        <DeviceIconSvg icon={device.icon} color={color} />
      </g>

      <text
        x={-halfWidth + 42}
        y={-4}
        textAnchor="start"
        fill="var(--foreground)"
        fontSize="10"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {truncateNodeLabel(device.label)}
      </text>

      <text
        x={-halfWidth + 42}
        y={12}
        textAnchor="start"
        fill="var(--muted-foreground)"
        fontSize="7.5"
        fontFamily="var(--font-mono)"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {device.ip}
      </text>

      {(device.latency != null || device.uptime != null) && (
        <g transform={`translate(${halfWidth - 10}, 22)`}>
          <text
            textAnchor="end"
            fill="var(--muted-foreground)"
            fontSize="7"
            fontFamily="var(--font-mono)"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {device.latency != null ? `${device.latency}ms` : '--'}
          </text>
        </g>
      )}

      <circle
        cx={-halfWidth + 16}
        cy={halfHeight - 12}
        r={3}
        fill={color}
      />

      <text
        x={-halfWidth + 24}
        y={halfHeight - 9}
        textAnchor="start"
        fill={color}
        fontSize="7"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {device.status.toUpperCase()}
      </text>
    </g>
  )
}
