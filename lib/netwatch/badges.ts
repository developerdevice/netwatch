import { BadgeColor } from '@/lib/types'

export const BADGE_COLOR_OPTIONS: BadgeColor[] = ['slate', 'blue', 'green', 'amber', 'rose']

export type BadgeTheme = 'light' | 'dark'

const BADGE_LABELS: Record<BadgeColor, string> = {
  slate: 'Slate',
  blue: 'Blue',
  green: 'Green',
  amber: 'Amber',
  rose: 'Rose',
}

/** Estilo para fundo escuro (mapa / UI dark): texto claro sobre fill translúcido. */
const BADGE_STYLES_DARK: Record<BadgeColor, { fill: string; stroke: string; text: string }> = {
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

/** Estilo para tema claro: texto escuro com contraste sobre fill suave. */
const BADGE_STYLES_LIGHT: Record<BadgeColor, { fill: string; stroke: string; text: string }> = {
  slate: {
    fill: 'rgba(51, 65, 85, 0.14)',
    stroke: 'rgba(71, 85, 105, 0.45)',
    text: '#0f172a',
  },
  blue: {
    fill: 'rgba(37, 99, 235, 0.14)',
    stroke: 'rgba(59, 130, 246, 0.5)',
    text: '#1e40af',
  },
  green: {
    fill: 'rgba(5, 150, 105, 0.14)',
    stroke: 'rgba(16, 185, 129, 0.5)',
    text: '#047857',
  },
  amber: {
    fill: 'rgba(217, 119, 6, 0.16)',
    stroke: 'rgba(245, 158, 11, 0.55)',
    text: '#92400e',
  },
  rose: {
    fill: 'rgba(225, 29, 72, 0.14)',
    stroke: 'rgba(244, 63, 94, 0.5)',
    text: '#9f1239',
  },
}

export function getBadgeColorLabel(color: BadgeColor): string {
  return BADGE_LABELS[color]
}

export function getBadgeStyle(color: BadgeColor, theme: BadgeTheme = 'dark') {
  return theme === 'light' ? BADGE_STYLES_LIGHT[color] : BADGE_STYLES_DARK[color]
}
