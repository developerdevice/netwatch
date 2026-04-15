import { describe, expect, it } from 'vitest'

import { buildCurvedLinkPath, hasLinkBetweenNodes, screenToCanvasPoint, snapToGrid } from './map-geometry'
import { Link } from '@/lib/types'

describe('map-geometry', () => {
  it('converte coordenadas de tela em coordenadas do canvas', () => {
    expect(
      screenToCanvasPoint(
        { x: 260, y: 190 },
        { left: 20, top: 10 },
        { x: 40, y: 30 },
        2
      )
    ).toEqual({ x: 100, y: 75 })
  })

  it('aplica snap na grade configurada', () => {
    expect(snapToGrid(19)).toBe(20)
    expect(snapToGrid(31)).toBe(40)
  })

  it('detecta links duplicados em qualquer direcao', () => {
    const links: Link[] = [
      { id: 'l1', sourceId: 'a', targetId: 'b', mapId: 'local' },
    ]

    expect(hasLinkBetweenNodes(links, 'a', 'b')).toBe(true)
    expect(hasLinkBetweenNodes(links, 'b', 'a')).toBe(true)
    expect(hasLinkBetweenNodes(links, 'a', 'c')).toBe(false)
  })

  it('gera caminho curvo com ponto de label separado', () => {
    const result = buildCurvedLinkPath({ x: 0, y: 0 }, { x: 100, y: 0 })

    expect(result.pathD).toContain('Q')
    expect(result.labelPoint.x).not.toBeNaN()
    expect(result.labelPoint.y).not.toBeNaN()
    expect(result.controlPoint).toBeDefined()
    expect(result.sourceEndpointLabelPoint).toBeDefined()
    expect(result.targetEndpointLabelPoint).toBeDefined()
    expect(result.sourceEndpointLabelPoint.x).not.toBeNaN()
    expect(result.targetEndpointLabelPoint.x).not.toBeNaN()
  })

  it('aplica deslocamento manual ao ponto de controle', () => {
    const base = buildCurvedLinkPath({ x: 0, y: 0 }, { x: 100, y: 0 })
    const shifted = buildCurvedLinkPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { dx: 20, dy: -10 })

    expect(shifted.controlPoint.x).toBe(base.controlPoint.x + 20)
    expect(shifted.controlPoint.y).toBe(base.controlPoint.y - 10)
    expect(shifted.pathD).not.toBe(base.pathD)
  })
})
