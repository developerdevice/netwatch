import { CanvasPoint, Device, Link, SubMapNode } from '@/lib/types'

export const MAP_NODE_SIZE = 56
export const MAP_GRID_SIZE = 20

interface BoundingRectLike {
  left: number
  top: number
}

export function screenToCanvasPoint(
  screenPoint: CanvasPoint,
  rect: BoundingRectLike,
  pan: CanvasPoint,
  zoom: number
): CanvasPoint {
  return {
    x: (screenPoint.x - rect.left - pan.x) / zoom,
    y: (screenPoint.y - rect.top - pan.y) / zoom,
  }
}

export function snapToGrid(value: number, gridSize = MAP_GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize
}

export function getNodePosition(
  nodeId: string,
  devices: Device[],
  submapNodes: SubMapNode[]
): CanvasPoint | null {
  const device = devices.find(item => item.id === nodeId)
  if (device) return { x: device.x, y: device.y }

  const submapNode = submapNodes.find(item => item.id === nodeId)
  if (submapNode) return { x: submapNode.x, y: submapNode.y }

  return null
}

export function truncateNodeLabel(label: string, maxLength = 16): string {
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label
}

function roundPathCoord(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function hasLinkBetweenNodes(links: Link[], firstNodeId: string, secondNodeId: string): boolean {
  return links.some(link => {
    const sameDirection = link.sourceId === firstNodeId && link.targetId === secondNodeId
    const inverseDirection = link.sourceId === secondNodeId && link.targetId === firstNodeId

    return sameDirection || inverseDirection
  })
}

export function getAutomaticLinkControlPoint(source: CanvasPoint, target: CanvasPoint): CanvasPoint {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy)

  if (distance === 0) {
    return { x: source.x, y: source.y }
  }

  const curveAmount = Math.min(distance * 0.15, 30)
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2
  const normalX = -dy / distance
  const normalY = dx / distance

  return {
    x: midX + normalX * curveAmount,
    y: midY + normalY * curveAmount,
  }
}

export interface LinkCurveControlOffset {
  dx?: number
  dy?: number
}

export function buildCurvedLinkPath(
  source: CanvasPoint,
  target: CanvasPoint,
  controlOffset?: LinkCurveControlOffset
) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy)

  if (distance === 0) {
    const sx = roundPathCoord(source.x)
    const sy = roundPathCoord(source.y)
    const tx = roundPathCoord(target.x)
    const ty = roundPathCoord(target.y)
    return {
      pathD: `M ${sx} ${sy} L ${tx} ${ty}`,
      labelPoint: { x: sx, y: roundPathCoord(sy - 8) },
      controlPoint: { x: sx, y: sy },
    }
  }

  const auto = getAutomaticLinkControlPoint(source, target)
  const odx = controlOffset?.dx ?? 0
  const ody = controlOffset?.dy ?? 0
  const sx = roundPathCoord(source.x)
  const sy = roundPathCoord(source.y)
  const tx = roundPathCoord(target.x)
  const ty = roundPathCoord(target.y)
  const controlX = roundPathCoord(auto.x + odx)
  const controlY = roundPathCoord(auto.y + ody)

  return {
    pathD: `M ${sx} ${sy} Q ${controlX} ${controlY} ${tx} ${ty}`,
    labelPoint: { x: controlX, y: roundPathCoord(controlY - 8) },
    controlPoint: { x: controlX, y: controlY },
  }
}
