'use client'

import { useStore, useActiveMap } from '@/lib/store'
import { ActiveServerSessionSummary } from '@/lib/types'
import { ChevronRight, Lock, LockOpen, LogOut, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusSummary } from '@/lib/netwatch/status'
import { ThemeToggle } from '@/components/netwatch/ThemeToggle'

interface TopBarProps {
  session?: ActiveServerSessionSummary
  canvasLocked: boolean
  onToggleCanvasLocked: () => void
  /** Abre navegação de mapas/dispositivos (sheet mobile). */
  onOpenMobileNav?: () => void
}

export function TopBar({ session, canvasLocked, onToggleCanvasLocked, onOpenMobileNav }: TopBarProps) {
  const { state, dispatch } = useStore()
  const activeMap = useActiveMap()

  const getBreadcrumb = () => {
    const crumbs: { id: string; name: string }[] = []
    let current = activeMap
    while (current) {
      crumbs.unshift({ id: current.id, name: current.name })
      const parent = current.parentId ? state.maps.find(m => m.id === current.parentId) : null
      if (!parent) break
      current = parent
    }
    return crumbs
  }

  const breadcrumb = getBreadcrumb()
  const summary = getStatusSummary(activeMap.devices)

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    window.location.reload()
  }

  return (
    <header className="panel-surface flex h-[56px] items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] md:h-[64px] md:gap-4 md:px-6 md:pt-0">
      {onOpenMobileNav && (
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background/50 text-foreground transition-colors hover:bg-accent md:hidden"
          aria-label="Abrir mapas e dispositivos"
        >
          <PanelLeft size={20} aria-hidden />
        </button>
      )}

      <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1 md:flex-initial">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Mapa Ativo
        </div>
        <div className="flex items-center gap-2">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
            {activeMap.name}
          </h1>
          <div className="hidden items-center gap-1 text-[11px] font-mono md:flex">
            <span className="text-muted-foreground">{summary.total}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-emerald-400">{summary.up}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-rose-400">{summary.down}</span>
          </div>
        </div>
      </div>

      <div className="hidden h-10 w-px bg-border/80 md:block" />

      <nav className="hidden min-w-0 items-center gap-1 text-sm md:flex">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-muted-foreground/50" />}
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_MAP', mapId: crumb.id })}
              className={cn(
                'transition-colors px-1 rounded',
                crumb.id === state.activeMapId
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="hidden flex-1 md:block" />

      <div className="hidden items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
        <span className="truncate">
          {session ? `${session.serverLabel} • ${session.host}:${session.port}` : 'Sessao em resolucao'}
        </span>
        {session && <span className="text-foreground/70">{session.username}</span>}
      </div>


      <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={onToggleCanvasLocked}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-xs transition-colors md:h-9 md:w-9',
            canvasLocked
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-300'
              : 'border-border bg-background/40 text-muted-foreground hover:bg-accent/50 hover:text-foreground'
          )}
          title={
            canvasLocked
              ? 'Destravar: editar nos, arrastar e mover a vista do mapa'
              : 'Travar: apenas visualizar (sem editar nem arrastar o mapa)'
          }
        >
          {canvasLocked ? <Lock size={16} aria-hidden /> : <LockOpen size={16} aria-hidden />}
        </button>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={!session}
        className="flex h-10 min-w-10 items-center justify-center rounded-full border border-border bg-background/40 px-2 text-muted-foreground transition-colors hover:text-foreground md:h-auto md:min-w-0 md:gap-2 md:px-3 md:py-1.5 md:text-xs"
        aria-label="Sair"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </header>
  )
}
