import type { CanvasPoint, Device, Link, SubMapNode } from '@/lib/types'

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

function quadBezierPoint(p0: CanvasPoint, p1: CanvasPoint, p2: CanvasPoint, t: number): CanvasPoint {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

function quadBezierDerivative(p0: CanvasPoint, p1: CanvasPoint, p2: CanvasPoint, t: number): CanvasPoint {
  return {
    x: -2 * (1 - t) * p0.x + 2 * (1 - 2 * t) * p1.x + 2 * t * p2.x,
    y: -2 * (1 - t) * p0.y + 2 * (1 - 2 * t) * p1.y + 2 * t * p2.y,
  }
}

function unitVector(v: CanvasPoint): CanvasPoint {
  const len = Math.hypot(v.x, v.y) || 1
  return { x: v.x / len, y: v.y / len }
}

/** Rótulo de porta junto ao traço Q, acompanha o ponto de controlo ao arrastar a curva. */
function linkEndpointLabelOnQuad(
  p0: CanvasPoint,
  p1: CanvasPoint,
  p2: CanvasPoint,
  fromStart: boolean,
  chordNormal: CanvasPoint,
  halfNode: number,
  chordLength: number,
): CanvasPoint {
  const tAlong = Math.min(
    0.4,
    Math.max(0.045, (halfNode + 28) / Math.max(chordLength * 0.82, 48)),
  )
  const t = fromStart ? tAlong : 1 - tAlong
  const pt = quadBezierPoint(p0, p1, p2, t)
  const deriv = quadBezierDerivative(p0, p1, p2, t)
  const tan = unitVector(deriv)
  let side = { x: -tan.y, y: tan.x }
  const sideLen = Math.hypot(side.x, side.y) || 1
  side = { x: side.x / sideLen, y: side.y / sideLen }
  if (side.x * chordNormal.x + side.y * chordNormal.y < 0) {
    side = { x: -side.x, y: -side.y }
  }
  const approxAlongCurve = chordLength * tAlong * 1.05
  const shortfall = Math.max(0, halfNode + 26 - approxAlongCurve)
  const outMag = 12 + shortfall * 0.72

  return {
    x: roundPathCoord(pt.x + side.x * outMag),
    y: roundPathCoord(pt.y + side.y * outMag),
  }
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
    const bump = MAP_NODE_SIZE / 2 + 26
    return {
      pathD: `M ${sx} ${sy} L ${tx} ${ty}`,
      labelPoint: { x: sx, y: roundPathCoord(sy - 8) },
      controlPoint: { x: sx, y: sy },
      sourceEndpointLabelPoint: { x: sx, y: roundPathCoord(sy - bump) },
      targetEndpointLabelPoint: { x: tx, y: roundPathCoord(ty - bump) },
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

  const ux = dx / distance
  const uy = dy / distance
  const nx = -uy
  const ny = ux
  const chordNormal = { x: nx, y: ny }

  const halfNode = MAP_NODE_SIZE / 2
  const p0 = { x: sx, y: sy }
  const p1 = { x: controlX, y: controlY }
  const p2 = { x: tx, y: ty }

  const sourceEndpointLabelPoint = linkEndpointLabelOnQuad(p0, p1, p2, true, chordNormal, halfNode, distance)
  const targetEndpointLabelPoint = linkEndpointLabelOnQuad(p0, p1, p2, false, chordNormal, halfNode, distance)

  return {
    pathD: `M ${sx} ${sy} Q ${controlX} ${controlY} ${tx} ${ty}`,
    labelPoint: { x: controlX, y: roundPathCoord(controlY - 8) },
    controlPoint: { x: controlX, y: controlY },
    sourceEndpointLabelPoint,
    targetEndpointLabelPoint,
  }
}
