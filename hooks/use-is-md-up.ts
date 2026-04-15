'use client'

import { useSyncExternalStore } from 'react'

const MD_QUERY = '(min-width: 768px)'

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(MD_QUERY)
  mq.addEventListener('change', onStoreChange)
  return () => mq.removeEventListener('change', onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MD_QUERY).matches
}

/** Mobile-first no SSR: evita desenconto de hidratação em breakpoints típicos. */
function getServerSnapshot() {
  return false
}

export function useIsMdUp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
