export type DeviceStatus = 'online' | 'offline' | 'warning' | 'unknown'
export type LinkCapacity = '100m' | '1g' | '10g' | '25g' | '40g'
export type BadgeColor = 'slate' | 'blue' | 'green' | 'amber' | 'rose'

export type DeviceIcon = 'router' | 'router-antenna' | 'switch' | 'server' | 'tower' | 'access-point' | 'generic'

export interface Device {
  id: string
  label: string
  ip: string
  icon: DeviceIcon
  status: DeviceStatus
  x: number
  y: number
  latency?: number
  uptime?: number
  mapId: string
  comment?: string
}

export interface Link {
  id: string
  sourceId: string
  targetId: string
  mapId: string
  capacity?: LinkCapacity
  rxBps?: number
  txBps?: number
  label?: string
  /** Identificação da porta/interface no nó de origem (ex.: ether1). */
  sourcePortLabel?: string
  /** Identificação da porta/interface no nó de destino. */
  targetPortLabel?: string
  controlDx?: number
  controlDy?: number
}

/** Estado do diálogo de edição de rótulo de porta numa extremidade da ligação. */
export interface EditingLinkEndpointState {
  linkId: string
  mapId: string
  end: 'source' | 'target'
}

export interface SubMapNode {
  id: string
  label: string
  x: number
  y: number
  mapId: string
  targetMapId: string
}

export interface MapBadge {
  id: string
  mapId: string
  text: string
  color: BadgeColor
  x: number
  y: number
}

export interface NetworkMap {
  id: string
  name: string
  parentId?: string
  devices: Device[]
  submapNodes: SubMapNode[]
  badges: MapBadge[]
  links: Link[]
}

export interface RegisteredRouterServer {
  id: string
  label: string
  host: string
  port: number
  secure: boolean
}

export interface ActiveServerSessionSummary {
  serverId: string
  serverLabel: string
  host: string
  port: number
  secure: boolean
  username: string
}

export interface HistoryEntry {
  timestamp: Date
  status: DeviceStatus
  latency?: number
}

export interface CanvasPoint {
  x: number
  y: number
}

export interface ContextMenuState {
  type: 'canvas' | 'device' | 'submap' | 'link' | 'badge' | null
  x: number
  y: number
  targetId?: string
  canvasPoint?: CanvasPoint
}

export interface CreateNodeDraft {
  mapId: string
  point: CanvasPoint
}

export interface AppState {
  maps: NetworkMap[]
  mapHistoryPast: NetworkMap[][]
  mapHistoryFuture: NetworkMap[][]
  mapHistoryTransactionDepth: number
  activeMapId: string
  selectedDeviceId: string | null
  selectedLinkId: string | null
  selectedSubmapId: string | null
  selectedBadgeId: string | null
  contextMenu: ContextMenuState | null
  deviceHistory: Record<string, HistoryEntry[]>
  editingDevice: Device | null
  editingSubmap: SubMapNode | null
  editingLink: Link | null
  editingLinkEndpoint: EditingLinkEndpointState | null
  editingBadge: MapBadge | null
  creatingDevice: CreateNodeDraft | null
  creatingSubmap: CreateNodeDraft | null
  creatingBadge: CreateNodeDraft | null
  pendingLinkSourceId: string | null
  showHistory: string | null
  showPingResult: { deviceId: string } | null
  showTracertResult: { deviceId: string } | null
}
