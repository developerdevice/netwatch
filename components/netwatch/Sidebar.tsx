'use client'

import { useStore, useActiveMap } from '@/lib/store'
import { NetworkMap, DeviceStatus } from '@/lib/types'
import { ChevronRight, ChevronDown, Layers, ChevronLeft, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { getMapStatuses } from '@/lib/netwatch/status'

function useSubmapStatuses() {
  const { state } = useStore()
  return getMapStatuses(state.maps)
}

function StatusDot({ status }: { status: DeviceStatus }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        status === 'online' && 'bg-emerald-400',
        status === 'offline' && 'bg-rose-400',
        status === 'warning' && 'bg-amber-400',
        status === 'unknown' && 'bg-slate-500'
      )}
    />
  )
}

function mapMatchesSearch(map: NetworkMap, query: string, allMaps: NetworkMap[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (map.name.toLowerCase().includes(q)) return true
  const children = allMaps.filter(m => m.parentId === map.id)
  return children.some(child => mapMatchesSearch(child, query, allMaps))
}

interface MapTreeItemProps {
  map: NetworkMap
  allMaps: NetworkMap[]
  level: number
  activeMapId: string
  searchQuery: string
  onSelect: (mapId: string) => void
  statuses: Record<string, DeviceStatus>
}

function MapTreeItem({ map, allMaps, level, activeMapId, searchQuery, onSelect, statuses }: MapTreeItemProps) {
  const children = allMaps.filter(m => m.parentId === map.id)
  const filteredChildren = children.filter(c => mapMatchesSearch(c, searchQuery, allMaps))
  const [open, setOpen] = useState(true)
  const isActive = map.id === activeMapId
  const status = statuses[map.id] || 'unknown'
  const searchActive = searchQuery.trim().length > 0
  const expanded = searchActive || open

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-md text-sm transition-all cursor-pointer',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-accent/50 hover:text-sidebar-foreground'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={() => onSelect(map.id)}
        onDoubleClick={() => onSelect(map.id)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(map.id) }}
        role="button"
        tabIndex={0}
      >
        {children.length > 0 ? (
          <span
            onClick={e => { e.stopPropagation(); setOpen(!open) }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setOpen(!open) } }}
            className="shrink-0 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
            role="button"
            tabIndex={0}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <StatusDot status={status} />
        <span className="truncate">{map.name}</span>
        <span className="ml-auto text-xs text-muted-foreground opacity-60">
          {map.devices.length}
        </span>
      </div>
      {expanded && filteredChildren.map(child => (
        <MapTreeItem
          key={child.id}
          map={child}
          allMaps={allMaps}
          level={level + 1}
          activeMapId={activeMapId}
          searchQuery={searchQuery}
          onSelect={onSelect}
          statuses={statuses}
        />
      ))}
    </div>
  )
}

interface SidebarNavProps {
  /** Chamado após escolher mapa ou dispositivo (ex.: fechar sheet mobile). */
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const searchFieldId = useId()
  const { state, dispatch } = useStore()
  const activeMap = useActiveMap()
  const statuses = useSubmapStatuses()

  const rootMaps = state.maps.filter(m => !m.parentId)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDevices, setShowDevices] = useState(true)

  const filteredRootMaps = useMemo(
    () => rootMaps.filter(m => mapMatchesSearch(m, searchQuery, state.maps)),
    [rootMaps, searchQuery, state.maps]
  )

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return activeMap.devices
    return activeMap.devices.filter(
      d => d.label.toLowerCase().includes(q) || d.ip.toLowerCase().includes(q)
    )
  }, [activeMap.devices, searchQuery])

  const getBreadcrumb = () => {
    const path: NetworkMap[] = []
    let current = activeMap
    while (current) {
      path.unshift(current)
      current = state.maps.find(m => m.id === current.parentId) as NetworkMap
    }
    return path
  }
  const breadcrumb = getBreadcrumb()

  return (
    <div className="panel-surface flex h-full min-h-0 w-full flex-col overflow-hidden border-sidebar-border md:border-r">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
          <Layers size={16} className="text-background" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-[0.08em] text-sidebar-foreground">NetWatch</h1>
          <p className="mt-1 text-xs text-muted-foreground">Visualização operacional da rede</p>
        </div>
      </div>

      {breadcrumb.length > 1 && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <button
            onClick={() => {
              const parent = state.maps.find(m => m.id === activeMap.parentId)
              if (parent) {
                dispatch({ type: 'SET_ACTIVE_MAP', mapId: parent.id })
                onNavigate?.()
              }
            }}
            className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-sidebar-foreground"
          >
            <ChevronLeft size={14} />
            <span>Voltar para {breadcrumb[breadcrumb.length - 2].name}</span>
          </button>
        </div>
      )}

      <div className="border-b border-sidebar-border px-4 py-3">
        <label className="sr-only" htmlFor={searchFieldId}>
          Buscar mapas e dispositivos
        </label>
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id={searchFieldId}
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar mapas e dispositivos..."
            className="w-full rounded-xl border border-sidebar-border bg-background/40 py-2 pl-9 pr-3 text-sm text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="py-4">
          <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Mapas
          </div>
          <div className="px-2">
            {filteredRootMaps.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum mapa corresponde à busca</p>
            ) : (
              filteredRootMaps.map(map => (
                <MapTreeItem
                  key={map.id}
                  map={map}
                  allMaps={state.maps}
                  level={0}
                  activeMapId={state.activeMapId}
                  searchQuery={searchQuery}
                  onSelect={mapId => {
                    dispatch({ type: 'SET_ACTIVE_MAP', mapId })
                    onNavigate?.()
                  }}
                  statuses={statuses}
                />
              ))
            )}
          </div>
        </div>

        <div className="border-t border-sidebar-border py-4">
          <div
            onClick={() => setShowDevices(!showDevices)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowDevices(!showDevices) }}
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-sidebar-foreground"
          >
            {showDevices ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Dispositivos
            <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-muted-foreground/80">
              {activeMap.name}
            </span>
          </div>
          {showDevices && (
            <div className="px-2 mt-1 space-y-0.5">
              {activeMap.devices.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum dispositivo</p>
              ) : filteredDevices.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum dispositivo corresponde à busca</p>
              ) : (
                filteredDevices.map(device => (
                  <button
                    key={device.id}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-all',
                      state.selectedDeviceId === device.id
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-accent/50'
                    )}
                    onClick={() => {
                      dispatch({ type: 'SELECT_DEVICE', deviceId: device.id })
                      onNavigate?.()
                    }}
                  >
                    <StatusDot status={device.status} />
                    <span className="truncate flex-1">{device.label}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">{device.ip}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-sidebar-border px-4 py-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{activeMap.links.length} conexões</span>
          <span>{activeMap.submapNodes.length} submaps</span>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-72 shrink-0 md:flex">
      <SidebarNav />
    </aside>
  )
}

interface MobileSidebarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebarSheet({ open, onOpenChange }: MobileSidebarSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="h-[100dvh] w-[min(100vw-1rem,22rem)] max-w-none gap-0 border-r p-0 sm:max-w-none"
      >
        <SidebarNav onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}
