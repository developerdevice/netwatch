'use client'

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useIsMdUp } from '@/hooks/use-is-md-up'
import { clearSelection } from '@/lib/netwatch/commands'
import { useStore } from '@/lib/store'
import { ActiveServerSessionSummary } from '@/lib/types'
import { MobileSidebarSheet, Sidebar } from './Sidebar'
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
import { useCallback, useEffect, useRef, useState, startTransition } from 'react'

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
  const isMdUp = useIsMdUp()
  const { state, dispatch } = useStore()
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

  const hasPanelSelection = Boolean(
    state.selectedDeviceId ||
      state.selectedLinkId ||
      state.selectedSubmapId ||
      state.selectedBadgeId
  )
  const showMobileDetailSheet = !isMdUp && hasPanelSelection

  const zoomIn = useCallback(() => setZoom(z => Math.min(3, z * 1.2)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.2, z / 1.2)), [])
  const fitView = useCallback(() => {
    if (fitViewRef.current) fitViewRef.current()
  }, [])

  return (
    <>
      <SimulationRunner liveMonitoring={liveMonitoring} />
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar />

        <MobileSidebarSheet open={!isMdUp && mobileNavOpen} onOpenChange={setMobileNavOpen} />

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

          {/* Canvas + panel (painel lateral só em md+) */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <NetworkCanvas
              zoom={zoom}
              isCanvasLocked={canvasLocked}
              onZoomChange={setZoom}
              onFitViewReady={fn => { fitViewRef.current = fn }}
            />
            <DevicePanel liveMonitoring={liveMonitoring} placement="dock" />
          </div>
        </div>
      </div>

      <Sheet
        open={showMobileDetailSheet}
        onOpenChange={open => {
          if (!open) clearSelection(dispatch)
        }}
      >
        <SheetContent
          side="bottom"
          className="flex max-h-[min(88dvh,720px)] w-full max-w-none min-h-0 flex-col gap-0 rounded-t-2xl border-t p-0 sm:max-w-none"
        >
          <DevicePanel liveMonitoring={liveMonitoring} placement="sheet" />
        </SheetContent>
      </Sheet>

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
