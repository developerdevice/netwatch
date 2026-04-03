'use client'

import { ActiveServerSessionSummary } from '@/lib/types'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import { NetworkCanvas } from './NetworkCanvas'
import { DevicePanel } from './DevicePanel'
import { TopBar } from './TopBar'
import { ContextMenu } from './ContextMenu'
import { CreateBadgeModal, CreateDeviceModal, CreateSubmapModal, EditBadgeModal, EditDeviceModal, EditLinkModal, EditSubmapModal, HistoryModal, PingResultModal, TracertResultModal } from './Modals'
import { useStatusSimulation } from '@/hooks/use-status-simulation'
import { useLiveDeviceStatus } from '@/hooks/use-live-device-status'
import { useRef, useState, useCallback } from 'react'

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
  const [zoom, setZoom] = useState(1)
  const [canvasLocked, setCanvasLocked] = useState(false)
  const fitViewRef = useRef<(() => void) | null>(null)

  const zoomIn = useCallback(() => setZoom(z => Math.min(3, z * 1.2)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.2, z / 1.2)), [])
  const fitView = useCallback(() => {
    if (fitViewRef.current) fitViewRef.current()
  }, [])

  return (
    <>
      <SimulationRunner liveMonitoring={liveMonitoring} />
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <Sidebar />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <TopBar
            session={session}
            canvasLocked={canvasLocked}
            onToggleCanvasLocked={() => setCanvasLocked(current => !current)}
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
