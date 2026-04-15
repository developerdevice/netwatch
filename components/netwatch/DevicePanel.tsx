'use client'

import type { ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { useIsMdUp } from '@/hooks/use-is-md-up'
import { useStore, useSelectedDevice } from '@/lib/store'
import { statusColorHex, statusLabel } from '@/lib/utils-net'
import { X, Activity, Route, History, Edit, Link2 } from 'lucide-react'
import { DeviceStatus, DeviceIcon } from '@/lib/types'
import { getBadgeColorLabel, getBadgeStyle, type BadgeTheme } from '@/lib/netwatch/badges'
import { clearSelection, openDeviceHistory, openDevicePing, openDeviceTracert } from '@/lib/netwatch/commands'
import { getLinkCapacity, getLinkCapacityLabel } from '@/lib/netwatch/links'
import { getStatusSummary } from '@/lib/netwatch/status'

const dockAsideClass =
  'hidden h-full w-full max-w-none shrink-0 flex flex-col border-l border-border bg-card overflow-y-auto md:flex md:w-64'

const sheetBodyClass =
  'flex w-full max-w-full min-h-0 flex-1 flex-col overflow-y-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]'

function PanelSurface({
  placement,
  children,
}: {
  placement: 'dock' | 'sheet'
  children: ReactNode
}) {
  if (placement === 'dock') {
    return <aside className={dockAsideClass}>{children}</aside>
  }
  return <div className={sheetBodyClass}>{children}</div>
}

const iconLabels: Record<DeviceIcon, string> = {
  router: 'Router',
  'router-antenna': 'Router c/ Antena',
  switch: 'Switch',
  server: 'Servidor',
  tower: 'Torre',
  'access-point': 'Access Point',
  generic: 'Genérico',
}

export function DevicePanel({
  liveMonitoring,
  placement = 'dock',
}: {
  liveMonitoring: boolean
  placement?: 'dock' | 'sheet'
}) {
  const isMdUp = useIsMdUp()
  const { resolvedTheme } = useTheme()
  const badgeTheme: BadgeTheme = resolvedTheme === 'light' ? 'light' : 'dark'
  const { state, dispatch } = useStore()
  const device = useSelectedDevice()

  const placementVisible =
    (placement === 'dock' && isMdUp) || (placement === 'sheet' && !isMdUp)
  if (!placementVisible) return null

  const activeMap = state.maps.find(m => m.id === state.activeMapId)

  const selectedLink = state.selectedLinkId
    ? activeMap?.links.find(l => l.id === state.selectedLinkId)
    : null
  
  const getNodeLabel = (id: string) => {
    const dev = activeMap?.devices.find(d => d.id === id)
    if (dev) return dev.label
    const sub = activeMap?.submapNodes.find(s => s.id === id)
    if (sub) return sub.label
    return id
  }

  const linkSrc = selectedLink ? getNodeLabel(selectedLink.sourceId) : null
  const linkTgt = selectedLink ? getNodeLabel(selectedLink.targetId) : null

  const selectedSubmap = state.selectedSubmapId
    ? activeMap?.submapNodes.find(s => s.id === state.selectedSubmapId)
    : null

  const selectedBadge = state.selectedBadgeId
    ? activeMap?.badges.find(b => b.id === state.selectedBadgeId)
    : null

  if (!device && !selectedLink && !selectedSubmap && !selectedBadge) return null

  const close = () => {
    clearSelection(dispatch)
  }

  if (selectedSubmap) {
    const targetMap = state.maps.find(m => m.id === selectedSubmap.targetMapId)
    const summary = getStatusSummary(targetMap?.devices ?? [])
    
    return (
      <PanelSurface placement={placement}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Submap</span>
          <button
            type="button"
            onClick={close}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} aria-hidden />
            <span className="sr-only">Fechar painel</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nome</p>
            <p className="text-sm font-medium text-foreground">{selectedSubmap.label}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Total / Up / Down</p>
            <div className="mt-2 flex items-center gap-2 font-mono text-lg font-semibold">
              <span className="text-foreground">{summary.total}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-emerald-400">{summary.up}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-rose-400">{summary.down}</span>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_MAP', mapId: selectedSubmap.targetMapId })}
            className="w-full py-2 text-sm rounded-lg bg-foreground text-background font-medium hover:bg-foreground/90 transition-colors"
          >
            Abrir Mapa
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_EDITING_SUBMAP', submap: selectedSubmap })}
            className="w-full py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Editar
          </button>
          <button
            onClick={() => dispatch({ type: 'START_LINK_CREATION', sourceNodeId: selectedSubmap.id, sourceNodeType: 'submap' })}
            className="w-full py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Criar Conexão
          </button>
          <button
            onClick={() => dispatch({ type: 'REMOVE_SUBMAP_NODE', nodeId: selectedSubmap.id, mapId: state.activeMapId })}
            className="w-full py-2 text-sm rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Remover Submap
          </button>
        </div>
      </PanelSurface>
    )
  }

  if (selectedLink && linkSrc && linkTgt) {
    const capacity = getLinkCapacity(selectedLink)
    return (
      <PanelSurface placement={placement}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Conexão</span>
          <button
            type="button"
            onClick={close}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} aria-hidden />
            <span className="sr-only">Fechar painel</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="text-sm font-medium text-foreground">{linkSrc}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium text-foreground">{linkTgt}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Capacidade</p>
              <p className="text-sm font-medium text-foreground">{getLinkCapacityLabel(capacity)}</p>
            </div>
            {selectedLink.label && (
              <div>
                <p className="text-xs text-muted-foreground">Rótulo</p>
                <p className="text-sm font-medium text-foreground">{selectedLink.label}</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            No mapa, arraste o ponto na curva para ajustar o traçado; clique direito na linha para redefinir.
          </p>
          <button
            onClick={() => dispatch({ type: 'SET_EDITING_LINK', link: selectedLink })}
            className="w-full py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Editar Conexão
          </button>
          <button
            onClick={() => dispatch({ type: 'REMOVE_LINK', linkId: selectedLink.id, mapId: state.activeMapId })}
            className="w-full py-2 text-sm rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Remover Conexão
          </button>
        </div>
      </PanelSurface>
    )
  }

  if (selectedBadge) {
    const badgeStyle = getBadgeStyle(selectedBadge.color, badgeTheme)

    return (
      <PanelSurface placement={placement}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Badge</span>
          <button
            type="button"
            onClick={close}
            className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={18} aria-hidden />
            <span className="sr-only">Fechar painel</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: badgeStyle.fill,
              borderColor: badgeStyle.stroke,
              color: badgeStyle.text,
            }}
          >
            {selectedBadge.text}
          </div>
          <div className="space-y-2 text-sm">
            <InfoRow label="Texto" value={selectedBadge.text} />
            <InfoRow label="Cor" value={getBadgeColorLabel(selectedBadge.color)} />
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_EDITING_BADGE', badge: selectedBadge })}
            className="w-full py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
          >
            Editar Badge
          </button>
          <button
            onClick={() => dispatch({ type: 'REMOVE_BADGE', badgeId: selectedBadge.id, mapId: selectedBadge.mapId })}
            className="w-full py-2 text-sm rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Remover Badge
          </button>
        </div>
      </PanelSurface>
    )
  }

  if (!device) return null
  const color = statusColorHex(device.status)

  return (
    <PanelSurface placement={placement}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-foreground truncate">{device.label}</span>
        </div>
        <button
          type="button"
          onClick={close}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X size={18} aria-hidden />
          <span className="sr-only">Fechar painel</span>
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {statusLabel(device.status)}
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          <InfoRow label="IP" value={device.ip} mono />
          <InfoRow label="Tipo" value={iconLabels[device.icon] || device.icon} />
          {device.latency != null && (
            <InfoRow label="Latência" value={`${device.latency} ms`} mono />
          )}
          {device.uptime != null && (
            <InfoRow
              label="Uptime"
              value={`${device.uptime.toFixed(1)}%`}
              mono
              valueColor={device.uptime > 90 ? '#34d399' : device.uptime > 70 ? '#fbbf24' : '#f87171'}
            />
          )}
        </div>

        {/* Comment */}
        {device.comment && (
          <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground leading-relaxed">
            {device.comment}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={Activity}
            label="Ping"
            onClick={() => {
              void openDevicePing(device, state, dispatch)
            }}
          />
          <ActionButton
            icon={Route}
            label="Tracert"
            onClick={() => {
              void openDeviceTracert(device, state, dispatch)
            }}
          />
          <ActionButton
            icon={History}
            label="Histórico"
            onClick={() => openDeviceHistory(device.id, dispatch)}
          />
          <ActionButton
            icon={Edit}
            label="Editar"
            onClick={() => dispatch({ type: 'SET_EDITING_DEVICE', device })}
          />
          <ActionButton
            icon={Link2}
            label="Conectar"
            onClick={() => dispatch({ type: 'START_LINK_CREATION', sourceNodeId: device.id, sourceNodeType: 'device' })}
          />
        </div>

        {!liveMonitoring && (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Simular Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['online', 'offline', 'warning', 'unknown'] as DeviceStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => dispatch({
                    type: 'UPDATE_DEVICE_STATUS',
                    deviceId: device.id,
                    mapId: device.mapId,
                    status: s,
                    latency: s === 'online' ? Math.floor(Math.random() * 30 + 1) :
                             s === 'warning' ? Math.floor(Math.random() * 300 + 100) :
                             undefined,
                  })}
                  className="py-1.5 text-xs rounded-md border transition-colors font-medium"
                  style={{
                    borderColor: device.status === s ? statusColorHex(s) : 'var(--border)',
                    color: device.status === s ? statusColorHex(s) : 'var(--muted-foreground)',
                    backgroundColor: device.status === s ? `${statusColorHex(s)}15` : 'transparent',
                  }}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={() => dispatch({ type: 'REMOVE_DEVICE', deviceId: device.id, mapId: device.mapId })}
          className="w-full py-2 text-sm rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          Remover Dispositivo
        </button>
      </div>
    </PanelSurface>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
  valueColor,
}: {
  label: string
  value: string
  mono?: boolean
  valueColor?: string
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={mono ? 'font-mono text-xs' : ''}
        style={valueColor ? { color: valueColor } : { color: 'var(--foreground)' }}
      >
        {value}
      </span>
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary/50 text-xs text-foreground hover:bg-secondary transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
