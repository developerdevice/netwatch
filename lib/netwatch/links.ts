import { Link, LinkCapacity } from '@/lib/types'

export const LINK_CAPACITY_OPTIONS: LinkCapacity[] = ['100m', '1g', '10g', '25g', '40g']

const LINK_CAPACITY_LABELS: Record<LinkCapacity, string> = {
  '100m': '100M',
  '1g': '1G',
  '10g': '10G',
  '25g': '25G',
  '40g': '40G',
}

const LINK_CAPACITY_STROKES: Record<LinkCapacity, number> = {
  '100m': 2,
  '1g': 3,
  '10g': 4.5,
  '25g': 6,
  '40g': 7.5,
}

export function getLinkCapacity(link: Link): LinkCapacity {
  return link.capacity ?? '1g'
}

export function getLinkCapacityLabel(capacity: LinkCapacity): string {
  return LINK_CAPACITY_LABELS[capacity]
}

export function getLinkStrokeWidth(capacity: LinkCapacity, isSelected: boolean): number {
  return isSelected ? LINK_CAPACITY_STROKES[capacity] + 1.5 : LINK_CAPACITY_STROKES[capacity]
}
