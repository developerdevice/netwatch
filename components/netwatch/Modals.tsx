'use client'

import { useStore } from '@/lib/store'
import { AppState, BadgeColor, DeviceIcon, LinkCapacity, MapBadge } from '@/lib/types'
import { X, Router, Radio, Server, Wifi, Antenna, Box } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { generateId } from '@/lib/utils-net'
import { BADGE_COLOR_OPTIONS, getBadgeColorLabel, getBadgeStyle } from '@/lib/netwatch/badges'
import { LINK_CAPACITY_OPTIONS, getLinkCapacityLabel } from '@/lib/netwatch/links'

const DEVICE_ICONS: { value: DeviceIcon; label: string; Icon: React.ElementType }[] = [
  { value: 'router', label: 'Router', Icon: Router },
  { value: 'router-antenna', label: 'Router c/ Antena', Icon: Antenna },
  { value: 'switch', label: 'Switch', Icon: Box },
  { value: 'server', label: 'Servidor', Icon: Server },
  { value: 'tower', label: 'Torre', Icon: Radio },
  { value: 'access-point', label: 'Access Point', Icon: Wifi },
  { value: 'generic', label: 'Genérico', Icon: Box },
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-medium text-card-foreground">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground mb-1.5">{children}</label>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
    />
  )
}

function Button({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        variant === 'primary'
          ? 'bg-foreground text-background hover:bg-foreground/90'
          : 'bg-secondary text-secondary-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  )
}

function DeviceIconPicker({
  icon,
  onChange,
}: {
  icon: DeviceIcon
  onChange: (value: DeviceIcon) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {DEVICE_ICONS.map(({ value, label: iconLabel, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors ${
            icon === value
              ? 'border-foreground bg-accent'
              : 'border-border hover:bg-accent/50'
          }`}
        >
          <Icon size={18} className="text-foreground" />
          <span className="text-[10px] text-muted-foreground">{iconLabel}</span>
        </button>
      ))}
    </div>
  )
}

function DeviceFormContent({
  initialLabel,
  initialIp,
  initialIcon,
  initialComment,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialLabel: string
  initialIp: string
  initialIcon: DeviceIcon
  initialComment: string
  submitLabel: string
  onSubmit: (values: { label: string; ip: string; icon: DeviceIcon; comment: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initialLabel)
  const [ip, setIp] = useState(initialIp)
  const [icon, setIcon] = useState<DeviceIcon>(initialIcon)
  const [comment, setComment] = useState(initialComment)

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input value={label} onChange={setLabel} placeholder="Nome do dispositivo" />
      </div>
      <div>
        <Label>Endereço IP</Label>
        <Input value={ip} onChange={setIp} placeholder="192.168.1.1" />
      </div>
      <div>
        <Label>Ícone</Label>
        <DeviceIconPicker icon={icon} onChange={setIcon} />
      </div>
      <div>
        <Label>Comentário</Label>
        <Input value={comment} onChange={setComment} placeholder="Notas opcionais" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit({ label, ip, icon, comment })}>{submitLabel}</Button>
      </div>
    </div>
  )
}

function SingleFieldFormContent({
  initialLabel,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialLabel: string
  placeholder: string
  submitLabel: string
  onSubmit: (label: string) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initialLabel)

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input value={label} onChange={setLabel} placeholder={placeholder} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit(label)}>{submitLabel}</Button>
      </div>
    </div>
  )
}

function LinkCapacityPicker({
  value,
  onChange,
}: {
  value: LinkCapacity
  onChange: (value: LinkCapacity) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LINK_CAPACITY_OPTIONS.map(option => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
            option === value
              ? 'border-foreground bg-accent text-foreground'
              : 'border-border text-muted-foreground hover:bg-accent/50'
          }`}
        >
          {getLinkCapacityLabel(option)}
        </button>
      ))}
    </div>
  )
}

function BadgeColorPicker({
  value,
  onChange,
}: {
  value: BadgeColor
  onChange: (value: BadgeColor) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {BADGE_COLOR_OPTIONS.map(option => {
        const style = getBadgeStyle(option)

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
              option === value
                ? 'border-foreground bg-accent text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent/50'
            }`}
          >
            <span
              className="mx-auto mb-1 block h-3 w-3 rounded-full border"
              style={{ background: style.fill, borderColor: style.stroke }}
            />
            {getBadgeColorLabel(option)}
          </button>
        )
      })}
    </div>
  )
}

function BadgeFormContent({
  initialText,
  initialColor,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialText: string
  initialColor: BadgeColor
  submitLabel: string
  onSubmit: (values: { text: string; color: BadgeColor }) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialText)
  const [color, setColor] = useState<BadgeColor>(initialColor)

  return (
    <div className="space-y-4">
      <div>
        <Label>Texto</Label>
        <Input value={text} onChange={setText} placeholder="ether1, VLAN 200, uplink..." />
      </div>
      <div>
        <Label>Cor</Label>
        <BadgeColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit({ text, color })}>{submitLabel}</Button>
      </div>
    </div>
  )
}

export function EditDeviceModal() {
  const { state, dispatch } = useStore()
  const device = state.editingDevice

  if (!device) return null

  return (
    <Modal title="Editar Dispositivo" onClose={() => dispatch({ type: 'SET_EDITING_DEVICE', device: null })}>
      <DeviceFormContent
        key={device.id}
        initialLabel={device.label}
        initialIp={device.ip}
        initialIcon={device.icon}
        initialComment={device.comment || ''}
        submitLabel="Salvar"
        onCancel={() => dispatch({ type: 'SET_EDITING_DEVICE', device: null })}
        onSubmit={({ label, ip, icon, comment }) => {
          dispatch({
            type: 'UPDATE_DEVICE',
            device: {
              id: device.id,
              label: label.trim() || device.label,
              ip: ip.trim() || device.ip,
              icon,
              comment: comment.trim() || undefined,
            },
          })
        }}
      />
    </Modal>
  )
}

export function EditSubmapModal() {
  const { state, dispatch } = useStore()
  const submap = state.editingSubmap

  if (!submap) return null

  return (
    <Modal title="Editar Submap" onClose={() => dispatch({ type: 'SET_EDITING_SUBMAP', submap: null })}>
      <SingleFieldFormContent
        key={submap.id}
        initialLabel={submap.label}
        placeholder="Nome do submap"
        submitLabel="Salvar"
        onCancel={() => dispatch({ type: 'SET_EDITING_SUBMAP', submap: null })}
        onSubmit={label => {
          const nextLabel = label.trim() || submap.label
          dispatch({ type: 'UPDATE_SUBMAP_NODE', node: { id: submap.id, label: nextLabel } })
          dispatch({ type: 'UPDATE_MAP', mapId: submap.targetMapId, name: nextLabel })
        }}
      />
    </Modal>
  )
}

export function EditLinkModal() {
  const { state, dispatch } = useStore()
  const link = state.editingLink

  if (!link) return null

  return (
    <Modal title="Editar Conexão" onClose={() => dispatch({ type: 'SET_EDITING_LINK', link: null })}>
      <EditLinkContent
        key={link.id}
        link={link}
        onCancel={() => dispatch({ type: 'SET_EDITING_LINK', link: null })}
        onSave={(label, capacity) =>
          dispatch({
            type: 'UPDATE_LINK',
            link: {
              id: link.id,
              mapId: link.mapId,
              capacity,
              label: label.trim() || undefined,
            },
          })
        }
      />
    </Modal>
  )
}

export function EditBadgeModal() {
  const { state, dispatch } = useStore()
  const badge = state.editingBadge

  if (!badge) return null

  return (
    <Modal title="Editar Badge" onClose={() => dispatch({ type: 'SET_EDITING_BADGE', badge: null })}>
      <BadgeFormContent
        key={badge.id}
        initialText={badge.text}
        initialColor={badge.color}
        submitLabel="Salvar"
        onCancel={() => dispatch({ type: 'SET_EDITING_BADGE', badge: null })}
        onSubmit={({ text, color }) =>
          dispatch({
            type: 'UPDATE_BADGE',
            badge: {
              id: badge.id,
              mapId: badge.mapId,
              text: text.trim() || badge.text,
              color,
            },
          })
        }
      />
    </Modal>
  )
}

function EditLinkContent({
  link,
  onCancel,
  onSave,
}: {
  link: { label?: string; capacity?: LinkCapacity }
  onCancel: () => void
  onSave: (label: string, capacity: LinkCapacity) => void
}) {
  const [label, setLabel] = useState(link.label ?? '')
  const [capacity, setCapacity] = useState<LinkCapacity>(link.capacity ?? '1g')

  return (
    <div className="space-y-4">
      <div>
        <Label>Rótulo</Label>
        <Input value={label} onChange={setLabel} placeholder="Link backbone, uplink, acesso..." />
      </div>
      <div>
        <Label>Capacidade</Label>
        <LinkCapacityPicker value={capacity} onChange={setCapacity} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(label, capacity)}>Salvar</Button>
      </div>
    </div>
  )
}

export function CreateDeviceModal() {
  const { state, dispatch } = useStore()
  const draft = state.creatingDevice

  if (!draft) return null

  return (
    <Modal title="Adicionar Dispositivo" onClose={() => dispatch({ type: 'CLOSE_CREATE_DEVICE' })}>
      <DeviceFormContent
        key={`${draft.mapId}-${draft.point.x}-${draft.point.y}`}
        initialLabel=""
        initialIp=""
        initialIcon="router"
        initialComment=""
        submitLabel="Criar"
        onCancel={() => dispatch({ type: 'CLOSE_CREATE_DEVICE' })}
        onSubmit={({ label, ip, icon, comment }) => {
          const trimmedLabel = label.trim()
          if (!trimmedLabel) return

          dispatch({
            type: 'ADD_DEVICE',
            device: {
              id: generateId(),
              label: trimmedLabel,
              ip: ip.trim() || '0.0.0.0',
              icon,
              status: 'unknown',
              x: draft.point.x,
              y: draft.point.y,
              mapId: draft.mapId,
              comment: comment.trim() || undefined,
            },
          })
        }}
      />
    </Modal>
  )
}

export function CreateSubmapModal() {
  const { state, dispatch } = useStore()
  const draft = state.creatingSubmap

  if (!draft) return null

  return (
    <Modal title="Adicionar Submap" onClose={() => dispatch({ type: 'CLOSE_CREATE_SUBMAP' })}>
      <SingleFieldFormContent
        key={`${draft.mapId}-${draft.point.x}-${draft.point.y}`}
        initialLabel=""
        placeholder="Nome do submap"
        submitLabel="Criar"
        onCancel={() => dispatch({ type: 'CLOSE_CREATE_SUBMAP' })}
        onSubmit={label => {
          const trimmedLabel = label.trim()
          if (!trimmedLabel) return

          const newMapId = generateId()

          dispatch({
            type: 'ADD_MAP',
            map: {
              id: newMapId,
              name: trimmedLabel,
              parentId: draft.mapId,
              devices: [],
              submapNodes: [],
              badges: [],
              links: [],
            },
          })

          dispatch({
            type: 'ADD_SUBMAP_NODE',
            node: {
              id: generateId(),
              label: trimmedLabel,
              x: draft.point.x,
              y: draft.point.y,
              mapId: draft.mapId,
              targetMapId: newMapId,
            },
          })
        }}
      />
    </Modal>
  )
}

export function CreateBadgeModal() {
  const { state, dispatch } = useStore()
  const draft = state.creatingBadge

  if (!draft) return null

  return (
    <Modal title="Adicionar Badge" onClose={() => dispatch({ type: 'CLOSE_CREATE_BADGE' })}>
      <BadgeFormContent
        key={`${draft.mapId}-${draft.point.x}-${draft.point.y}`}
        initialText=""
        initialColor="blue"
        submitLabel="Criar"
        onCancel={() => dispatch({ type: 'CLOSE_CREATE_BADGE' })}
        onSubmit={({ text, color }) => {
          const trimmedText = text.trim()
          if (!trimmedText) return

          const badge: MapBadge = {
            id: generateId(),
            mapId: draft.mapId,
            text: trimmedText,
            color,
            x: draft.point.x,
            y: draft.point.y,
          }

          dispatch({ type: 'ADD_BADGE', badge })
        }}
      />
    </Modal>
  )
}

function findDeviceById(maps: AppState['maps'], deviceId: string) {
  for (const map of maps) {
    const device = map.devices.find(entry => entry.id === deviceId)
    if (device) return device
  }

  return null
}

function DeviceCommandStream({
  deviceId,
  endpoint,
}: {
  deviceId: string
  endpoint: 'ping' | 'traceroute'
}) {
  const [output, setOutput] = useState('Abrindo sessao dedicada...\n')
  const [status, setStatus] = useState<'running' | 'done' | 'error' | 'cancelled'>('running')
  const outputRef = useRef<HTMLPreElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const cancelRequestedRef = useRef(false)

  useEffect(() => {
    const element = outputRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [output])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    abortControllerRef.current = controller
    cancelRequestedRef.current = false

    setOutput('Abrindo sessao dedicada...\n')
    setStatus('running')

    async function run() {
      try {
        const response = await fetch(`/api/devices/${endpoint}?deviceId=${encodeURIComponent(deviceId)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error?.message || `Falha ao executar ${endpoint}.`)
        }

        if (!response.body) {
          throw new Error('O servidor nao retornou um stream valido.')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let nextOutput = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          nextOutput += decoder.decode(value, { stream: true })
          if (active) setOutput(nextOutput)
        }

        nextOutput += decoder.decode()

        if (!active) return
        setOutput(nextOutput || 'Nenhuma saida retornada.\n')
        setStatus('done')
      } catch (error) {
        if (!active) return

        if (controller.signal.aborted && cancelRequestedRef.current) {
          setOutput(current => `${current.trimEnd()}\n\nExecucao cancelada pelo usuario.\n`)
          setStatus('cancelled')
          return
        }

        if (controller.signal.aborted) return

        const message = error instanceof Error ? error.message : `Falha ao executar ${endpoint}.`
        setOutput(current => `${current.trimEnd()}\n\n${message}\n`)
        setStatus('error')
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    }

    void run()

    return () => {
      active = false
      controller.abort()
    }
  }, [deviceId, endpoint])

  const handleCancel = () => {
    if (!abortControllerRef.current || status !== 'running') return
    cancelRequestedRef.current = true
    abortControllerRef.current.abort()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          {status === 'running'
            ? 'Stream em tempo real'
            : status === 'done'
              ? 'Execucao concluida'
              : status === 'cancelled'
                ? 'Execucao cancelada'
                : 'Execucao encerrada com erro'}
        </span>
        <div className="flex items-center gap-3">
          <span
            className={
              status === 'running'
                ? 'text-emerald-400'
                : status === 'done'
                  ? 'text-foreground'
                  : status === 'cancelled'
                    ? 'text-amber-400'
                    : 'text-rose-400'
            }
          >
            {status === 'running'
              ? 'ativo'
              : status === 'done'
                ? 'finalizado'
                : status === 'cancelled'
                  ? 'cancelado'
                  : 'falhou'}
          </span>
          {status === 'running' && (
            <button
              onClick={handleCancel}
              className="rounded-md border border-amber-500/30 px-2 py-1 text-[11px] font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <pre
        ref={outputRef}
        className="bg-background rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap max-h-[360px] overflow-y-auto"
      >
        {output}
      </pre>
    </div>
  )
}

export function HistoryModal() {
  const { state, dispatch } = useStore()
  const deviceId = state.showHistory
  
  if (!deviceId) return null

  const device = findDeviceById(state.maps, deviceId)

  const history = state.deviceHistory[deviceId] || []

  return (
    <Modal title={`Histórico - ${device?.label || deviceId}`} onClose={() => dispatch({ type: 'SET_SHOW_HISTORY', deviceId: null })}>
      <div className="max-h-[300px] overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum histórico disponível</p>
        ) : (
          <div className="space-y-1">
            {history.slice().reverse().map((entry, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded bg-secondary/50 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    entry.status === 'online' ? 'bg-emerald-500' :
                    entry.status === 'offline' ? 'bg-rose-500' :
                    entry.status === 'warning' ? 'bg-amber-500' : 'bg-slate-500'
                  }`}
                />
                <span className="text-muted-foreground text-xs">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span className="text-foreground capitalize">{entry.status}</span>
                {entry.latency != null && (
                  <span className="text-muted-foreground ml-auto">{entry.latency}ms</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function PingResultModal() {
  const { state, dispatch } = useStore()
  const result = state.showPingResult

  if (!result) return null

  const device = findDeviceById(state.maps, result.deviceId)

  return (
    <Modal title={`Ping - ${device?.label || result.deviceId}`} onClose={() => dispatch({ type: 'SET_PING_RESULT', result: null })}>
      <DeviceCommandStream deviceId={result.deviceId} endpoint="ping" />
    </Modal>
  )
}

export function TracertResultModal() {
  const { state, dispatch } = useStore()
  const result = state.showTracertResult

  if (!result) return null

  const device = findDeviceById(state.maps, result.deviceId)

  return (
    <Modal title={`Traceroute - ${device?.label || result.deviceId}`} onClose={() => dispatch({ type: 'SET_TRACERT_RESULT', result: null })}>
      <DeviceCommandStream deviceId={result.deviceId} endpoint="traceroute" />
    </Modal>
  )
}
