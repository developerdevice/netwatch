import { BadgeColor } from '@/lib/types'

export const BADGE_COLOR_OPTIONS: BadgeColor[] = ['slate', 'blue', 'green', 'amber', 'rose']

const BADGE_LABELS: Record<BadgeColor, string> = {
  slate: 'Slate',
  blue: 'Blue',
  green: 'Green',
  amber: 'Amber',
  rose: 'Rose',
}

const BADGE_STYLES: Record<BadgeColor, { fill: string; stroke: string; text: string }> = {
  slate: {
    fill: 'rgba(71, 85, 105, 0.18)',
    stroke: 'rgba(148, 163, 184, 0.48)',
    text: '#cbd5e1',
  },
  blue: {
    fill: 'rgba(59, 130, 246, 0.16)',
    stroke: 'rgba(96, 165, 250, 0.5)',
    text: '#bfdbfe',
  },
  green: {
    fill: 'rgba(16, 185, 129, 0.16)',
    stroke: 'rgba(74, 222, 128, 0.5)',
    text: '#bbf7d0',
  },
  amber: {
    fill: 'rgba(245, 158, 11, 0.16)',
    stroke: 'rgba(251, 191, 36, 0.5)',
    text: '#fde68a',
  },
  rose: {
    fill: 'rgba(244, 63, 94, 0.16)',
    stroke: 'rgba(251, 113, 133, 0.5)',
    text: '#fecdd3',
  },
}

export function getBadgeColorLabel(color: BadgeColor): string {
  return BADGE_LABELS[color]
}

export function getBadgeStyle(color: BadgeColor) {
  return BADGE_STYLES[color]
}
