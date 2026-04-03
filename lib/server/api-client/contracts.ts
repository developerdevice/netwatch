import 'server-only'

import { Device, Link, NetworkMap } from '@/lib/types'

export interface ApiClientTopologySnapshot {
  maps: NetworkMap[]
  devices: Device[]
  links: Link[]
  fetchedAt: string
  source: 'routerboard' | 'stored'
}

export interface ApiClient {
  getTopologySnapshot(): Promise<ApiClientTopologySnapshot>
  listMaps(): Promise<NetworkMap[]>
  listDevices(): Promise<Device[]>
  listLinks(): Promise<Link[]>
}
