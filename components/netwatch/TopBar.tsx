'use client'

import { useStore, useActiveMap } from '@/lib/store'
import { ActiveServerSessionSummary } from '@/lib/types'
import { ChevronRight, Lock, LockOpen, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusSummary } from '@/lib/netwatch/status'
import { ThemeToggle } from '@/components/netwatch/ThemeToggle'

interface TopBarProps {
  session?: ActiveServerSessionSummary
  canvasLocked: boolean
  onToggleCanvasLocked: () => void
}

export function TopBar({ session, canvasLocked, onToggleCanvasLocked }: TopBarProps) {
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
    <header className="panel-surface flex h-[64px] items-center gap-4 border-b border-border px-6">
      <div className="min-w-0 space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Mapa Ativo
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
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

      <div className="h-10 w-px bg-border/80" />

      <nav className="min-w-0 flex items-center gap-1 text-sm">
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

      <div className="flex-1" />

      <div className="hidden items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground lg:flex">
        <span className="truncate">
          {session ? `${session.serverLabel} • ${session.host}:${session.port}` : 'Sessao em resolucao'}
        </span>
        {session && <span className="text-foreground/70">{session.username}</span>}
      </div>


      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={onToggleCanvasLocked}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
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
        onClick={handleLogout}
        disabled={!session}
        className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut size={12} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </header>
  )
}
