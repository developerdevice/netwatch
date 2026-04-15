'use client'

import { useStore, useSelectedDevice } from '@/lib/store'
import { statusColorHex, statusLabel } from '@/lib/utils-net'
import { X, Activity, Route, History, Edit, Link2 } from 'lucide-react'
import { DeviceStatus, DeviceIcon } from '@/lib/types'
import { getBadgeColorLabel, getBadgeStyle } from '@/lib/netwatch/badges'
import { clearSelection, openDeviceHistory, openDevicePing, openDeviceTracert } from '@/lib/netwatch/commands'
import { getLinkCapacity, getLinkCapacityLabel } from '@/lib/netwatch/links'
import { getStatusSummary } from '@/lib/netwatch/status'

const iconLabels: Record<DeviceIcon, string> = {
  router: 'Router',
  'router-antenna': 'Router c/ Antena',
  switch: 'Switch',
  server: 'Servidor',
  tower: 'Torre',
  'access-point': 'Access Point',
  generic: 'Genérico',
}

export function DevicePanel({ liveMonitoring }: { liveMonitoring: boolean }) {
  const { state, dispatch } = useStore()
  const device = useSelectedDevice()
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
      <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-card h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Submap</span>
          <button onClick={close} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
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
      </aside>
    )
  }

  if (selectedLink && linkSrc && linkTgt) {
    const capacity = getLinkCapacity(selectedLink)
    return (
      <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-card h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Conexão</span>
          <button onClick={close} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Origem</p>
              <p className="text-sm font-medium text-foreground">{linkSrc}</p>
              {selectedLink.sourcePortLabel ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{selectedLink.sourcePortLabel}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destino</p>
              <p className="text-sm font-medium text-foreground">{linkTgt}</p>
              {selectedLink.targetPortLabel ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{selectedLink.targetPortLabel}</p>
              ) : null}
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
            No mapa, identifique cada porta nas etiquetas junto à linha (duplo clique ou toque longo). Arraste o ponto na curva para o traçado; clique direito para o menu.
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
      </aside>
    )
  }

  if (selectedBadge) {
    const badgeStyle = getBadgeStyle(selectedBadge.color)

    return (
      <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-card h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">Badge</span>
          <button onClick={close} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
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
      </aside>
    )
  }

  if (!device) return null
  const color = statusColorHex(device.status)

  return (
    <aside className="w-64 shrink-0 flex flex-col border-l border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium text-foreground truncate">{device.label}</span>
        </div>
        <button onClick={close} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
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
    </aside>
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
