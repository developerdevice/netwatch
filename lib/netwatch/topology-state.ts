import { Device, Link, MapBadge, NetworkMap, SubMapNode } from '@/lib/types'

export type PersistedDevice = Pick<Device, 'id' | 'label' | 'ip' | 'icon' | 'x' | 'y' | 'mapId' | 'comment'>

export type PersistedLink = Pick<Link, 'id' | 'sourceId' | 'targetId' | 'mapId' | 'capacity' | 'label' | 'controlDx' | 'controlDy'>

export type PersistedSubMapNode = Pick<SubMapNode, 'id' | 'label' | 'x' | 'y' | 'mapId' | 'targetMapId'>

export type PersistedMapBadge = Pick<MapBadge, 'id' | 'mapId' | 'text' | 'color' | 'x' | 'y'>

export interface PersistedNetworkMap {
  id: string
  name: string
  parentId?: string
  devices: PersistedDevice[]
  submapNodes: PersistedSubMapNode[]
  badges: PersistedMapBadge[]
  links: PersistedLink[]
}

export interface PersistedTopologyDocument {
  version: 1
  maps: PersistedNetworkMap[]
}

function sanitizeDevice(device: Device): PersistedDevice {
  return {
    id: device.id,
    label: device.label,
    ip: device.ip,
    icon: device.icon,
    x: device.x,
    y: device.y,
    mapId: device.mapId,
    comment: device.comment,
  }
}

function sanitizeLink(link: Link): PersistedLink {
  const base: PersistedLink = {
    id: link.id,
    sourceId: link.sourceId,
    targetId: link.targetId,
    mapId: link.mapId,
    capacity: link.capacity,
    label: link.label,
  }
  if (link.controlDx != null && link.controlDx !== 0) {
    base.controlDx = link.controlDx
  }
  if (link.controlDy != null && link.controlDy !== 0) {
    base.controlDy = link.controlDy
  }
  return base
}

function sanitizeSubmapNode(node: SubMapNode): PersistedSubMapNode {
  return {
    id: node.id,
    label: node.label,
    x: node.x,
    y: node.y,
    mapId: node.mapId,
    targetMapId: node.targetMapId,
  }
}

function sanitizeBadge(badge: MapBadge): PersistedMapBadge {
  return {
    id: badge.id,
    mapId: badge.mapId,
    text: badge.text,
    color: badge.color,
    x: badge.x,
    y: badge.y,
  }
}

export function createPersistedTopologyDocument(maps: NetworkMap[]): PersistedTopologyDocument {
  return {
    version: 1,
    maps: maps.map(map => ({
      id: map.id,
      name: map.name,
      parentId: map.parentId,
      devices: map.devices.map(sanitizeDevice),
      submapNodes: map.submapNodes.map(sanitizeSubmapNode),
      badges: map.badges.map(sanitizeBadge),
      links: map.links.map(sanitizeLink),
    })),
  }
}

export function restorePersistedTopologyDocument(document: PersistedTopologyDocument): NetworkMap[] {
  return document.maps.map(map => ({
    id: map.id,
    name: map.name,
    parentId: map.parentId,
    devices: map.devices.map(device => ({
      ...device,
      status: 'unknown',
      latency: undefined,
      uptime: undefined,
    })),
    submapNodes: map.submapNodes.map(node => ({ ...node })),
    badges: map.badges.map(badge => ({ ...badge })),
    links: map.links.map(link => ({
      ...link,
      rxBps: undefined,
      txBps: undefined,
    })),
  }))
}

export function getPersistedTopologySignature(maps: NetworkMap[]): string {
  return JSON.stringify(createPersistedTopologyDocument(maps))
}
