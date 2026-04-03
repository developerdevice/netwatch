'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
    })
  }, [])

  const isDark = resolvedTheme !== 'light'
  const a11yLabel = mounted
    ? isDark
      ? 'Usar tema claro'
      : 'Usar tema escuro'
    : 'Alternar tema'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      disabled={!mounted}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/40 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground disabled:opacity-60',
        className
      )}
      title={a11yLabel}
      aria-label={a11yLabel}
    >
      {!mounted ? (
        <Sun size={16} className="opacity-40" aria-hidden />
      ) : isDark ? (
        <Sun size={16} aria-hidden />
      ) : (
        <Moon size={16} aria-hidden />
      )}
    </button>
  )
}
