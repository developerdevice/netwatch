'use client'

import { MouseEvent, TouchEvent } from 'react'
import { useTheme } from 'next-themes'

import { MapBadge } from '@/lib/types'
import { getBadgeStyle, type BadgeTheme } from '@/lib/netwatch/badges'

interface BadgeNodeProps {
  badge: MapBadge
  isSelected: boolean
  onMouseDown: (event: MouseEvent<SVGGElement>) => void
  onContextMenu: (event: MouseEvent<SVGGElement>) => void
  onTouchStart?: (event: TouchEvent<SVGGElement>) => void
  onTouchMove?: (event: TouchEvent<SVGGElement>) => void
  onTouchEnd?: (event: TouchEvent<SVGGElement>) => void
  onTouchCancel?: (event: TouchEvent<SVGGElement>) => void
}

export function BadgeNode({
  badge,
  isSelected,
  onMouseDown,
  onContextMenu,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}: BadgeNodeProps) {
  const { resolvedTheme } = useTheme()
  const badgeTheme: BadgeTheme = resolvedTheme === 'light' ? 'light' : 'dark'
  const style = getBadgeStyle(badge.color, badgeTheme)
  const width = Math.max(56, badge.text.length * 7 + 20)
  const halfWidth = width / 2

  return (
    <g
      transform={`translate(${badge.x}, ${badge.y})`}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ cursor: 'grab' }}
    >
      {isSelected && (
        <rect
          x={-halfWidth - 3}
          y={-15}
          width={width + 6}
          height={30}
          rx={10}
          fill="none"
          stroke="var(--canvas-node-selection-ring)"
          strokeWidth="1.5"
        />
      )}

      <rect
        x={-halfWidth}
        y={-12}
        width={width}
        height={24}
        rx={8}
        fill={style.fill}
        stroke={style.stroke}
      />

      <text
        y={4}
        textAnchor="middle"
        fill={style.text}
        fontSize="10"
        fontFamily="var(--font-sans)"
        fontWeight="700"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {badge.text}
      </text>
    </g>
  )
}
