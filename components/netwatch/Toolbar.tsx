'use client'

import dynamic from 'next/dynamic'
import type { ToolbarClientProps } from './ToolbarClient'

function ToolbarSkeleton() {
  return (
    <div
      className="flex min-h-[52px] items-center gap-2 border-b border-border bg-card/70 px-2 py-2 md:min-h-[60px] md:px-4 md:py-3"
      aria-hidden
    />
  )
}

const ToolbarDynamic = dynamic<ToolbarClientProps>(
  () => import('./ToolbarClient').then(m => ({ default: m.ToolbarClient })),
  { ssr: false, loading: () => <ToolbarSkeleton /> },
)

export function Toolbar(props: ToolbarClientProps) {
  return <ToolbarDynamic {...props} />
}
