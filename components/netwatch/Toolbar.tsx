'use client'

import { useStore } from '@/lib/store'
import { ZoomIn, ZoomOut, Maximize2, Trash2, X } from 'lucide-react'
import { deleteCurrentSelection } from '@/lib/netwatch/commands'

interface ToolbarProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
}

export function Toolbar({ zoom, onZoomIn, onZoomOut, onFitView }: ToolbarProps) {
  const { state, dispatch } = useStore()

  const hasSelection = state.selectedDeviceId || state.selectedLinkId || state.selectedSubmapId || state.selectedBadgeId

  return (
    <div className="flex min-w-0 items-center gap-2 border-b border-border bg-card/70 px-2 py-2 sm:px-4 sm:py-3">
      {state.pendingLinkSourceId ? (
        <>
          <span className="min-w-0 truncate rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-1.5 text-[11px] text-amber-300 sm:px-3 sm:text-xs">
            Selecione outro dispositivo ou submap para concluir a conexão
          </span>
          <button
            title="Cancelar criação da conexão"
            onClick={() => dispatch({ type: 'CANCEL_LINK_CREATION' })}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={12} />
            <span>Cancelar</span>
          </button>
        </>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground sm:text-xs">
          Clique direito no fundo para adicionar dispositivo, submap ou badge
        </span>
      )}

      {hasSelection && (
        <>
          <div className="w-px h-4 bg-border" />
          <button
            title="Remover selecionado (Delete)"
            onClick={() => deleteCurrentSelection(state, dispatch)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
          >
            <Trash2 size={12} />
            <span>Remover</span>
          </button>
        </>
      )}

      <div className="min-w-0 flex-1" />

      {/* Zoom controls */}
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-secondary/50 p-1">
        <button
          onClick={onZoomOut}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title="Diminuir zoom"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-14 text-center font-mono text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title="Aumentar zoom"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={onFitView}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title="Ajustar à tela"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  )
}
