'use client'

import { useStore } from '@/lib/store'
import { ZoomIn, ZoomOut, Maximize2, Trash2, X } from 'lucide-react'
import { deleteCurrentSelection } from '@/lib/netwatch/commands'

export interface ToolbarClientProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
}

export function ToolbarClient({ zoom, onZoomIn, onZoomOut, onFitView }: ToolbarClientProps) {
  const { state, dispatch } = useStore()

  const hasSelection = state.selectedDeviceId || state.selectedLinkId || state.selectedSubmapId || state.selectedBadgeId

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card/70 px-2 py-2 md:px-4 md:py-3">
      {state.pendingLinkSourceId ? (
        <>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-1.5 text-[11px] text-amber-300 md:px-3 md:text-xs">
            Selecione outro dispositivo ou submap para concluir a conexão
          </span>
          <button
            type="button"
            title="Cancelar criação da conexão"
            onClick={() => dispatch({ type: 'CANCEL_LINK_CREATION' })}
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={14} />
            <span className="hidden sm:inline">Cancelar</span>
          </button>
        </>
      ) : null}

      <div className="min-w-0 flex-1" aria-hidden />

      {hasSelection && (
        <>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <button
            type="button"
            title="Remover selecionado (Delete)"
            onClick={() => deleteCurrentSelection(state, dispatch)}
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs text-rose-400 transition-colors hover:bg-rose-500/10 sm:px-3"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Remover</span>
          </button>
        </>
      )}

      <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-secondary/50 p-1 md:gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground md:min-h-0 md:min-w-0 md:p-2"
          title="Diminuir zoom"
        >
          <ZoomOut size={14} />
        </button>
        <span className="w-11 text-center font-mono text-[11px] text-muted-foreground md:w-14 md:text-xs">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground md:min-h-0 md:min-w-0 md:p-2"
          title="Aumentar zoom"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={onFitView}
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground md:min-h-0 md:min-w-0 md:p-2"
          title="Ajustar à tela"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  )
}
