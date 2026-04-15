'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(min-width: 768px)'

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** SSR / prerender: assume desktop para evitar layout "mobile" no servidor. */
function getServerSnapshot() {
  return true
}

/** True quando viewport ≥ 768px (breakpoint Tailwind `md`). */
export function useIsMdUp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
