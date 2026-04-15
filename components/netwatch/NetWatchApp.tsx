'use client'

import { ActiveServerSessionSummary } from '@/lib/types'
import { useStore } from '@/lib/store'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { NetworkCanvas } from './NetworkCanvas'
import { DevicePanel } from './DevicePanel'
import { TopBar } from './TopBar'
import { ContextMenu } from './ContextMenu'
import {
  CreateBadgeModal,
  CreateDeviceModal,
  CreateSubmapModal,
  EditBadgeModal,
  EditDeviceModal,
  EditLinkEndpointModal,
  EditLinkModal,
  EditSubmapModal,
  HistoryModal,
  PingResultModal,
  TracertResultModal,
} from './Modals'
import { useStatusSimulation } from '@/hooks/use-status-simulation'
import { useLiveDeviceStatus } from '@/hooks/use-live-device-status'
import { useRef, useState, useCallback, useEffect, startTransition } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useIsMdUp } from '@/hooks/use-is-md-up'

function SimulationRunner({ liveMonitoring }: { liveMonitoring: boolean }) {
  useStatusSimulation(!liveMonitoring)
  useLiveDeviceStatus(liveMonitoring)
  return null
}

interface NetWatchAppProps {
  session?: ActiveServerSessionSummary
  liveMonitoring: boolean
}

export function NetWatchApp({ session, liveMonitoring }: NetWatchAppProps) {
  const { state } = useStore()
  const isMdUp = useIsMdUp()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [canvasLocked, setCanvasLocked] = useState(false)
  const fitViewRef = useRef<(() => void) | null>(null)
  const prevActiveMapId = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevActiveMapId.current
    prevActiveMapId.current = state.activeMapId
    if (prev !== null && prev !== state.activeMapId) {
      startTransition(() => setMobileNavOpen(false))
    }
  }, [state.activeMapId])

  const zoomIn = useCallback(() => setZoom(z => Math.min(3, z * 1.2)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.2, z / 1.2)), [])
  const fitView = useCallback(() => {
    if (fitViewRef.current) fitViewRef.current()
  }, [])

  return (
    <>
      <SimulationRunner liveMonitoring={liveMonitoring} />
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {isMdUp ? (
          <div className="hidden h-full w-72 shrink-0 md:flex md:flex-col">
            <Sidebar />
          </div>
        ) : null}
        {!isMdUp ? (
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-[min(100vw,20rem)] border-r border-sidebar-border p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        ) : null}

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <TopBar
            session={session}
            canvasLocked={canvasLocked}
            onToggleCanvasLocked={() => setCanvasLocked(current => !current)}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />

          {/* Toolbar */}
          <Toolbar zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFitView={fitView} />

          {/* Canvas + panel */}
          <div className="flex-1 flex overflow-hidden">
            <NetworkCanvas
              zoom={zoom}
              isCanvasLocked={canvasLocked}
              onZoomChange={setZoom}
              onFitViewReady={fn => { fitViewRef.current = fn }}
            />
            <DevicePanel liveMonitoring={liveMonitoring} />
          </div>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu />

      {/* Modals */}
      <EditDeviceModal />
      <EditSubmapModal />
      <EditLinkModal />
      <EditLinkEndpointModal />
      <EditBadgeModal />
      <CreateDeviceModal />
      <CreateSubmapModal />
      <CreateBadgeModal />
      <HistoryModal />
      <PingResultModal />
      <TracertResultModal />
    </>
  )
}
