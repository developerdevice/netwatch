'use client'

import { useEffect, useRef } from 'react'

import { useStore } from '@/lib/store'

interface DeviceStatusSnapshot {
  deviceId: string
  mapId: string
  status: 'online' | 'offline' | 'warning' | 'unknown'
  latency?: number
}

export function useLiveDeviceStatus(enabled: boolean) {
  const { state, dispatch } = useStore()
  const mapsRef = useRef(state.maps)

  useEffect(() => {
    mapsRef.current = state.maps
  }, [state.maps])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const tick = async () => {
      try {
        const response = await fetch('/api/devices/status', {
          cache: 'no-store',
        })

        if (!response.ok) {
          return
        }

        const payload = await response.json()
        const snapshots = (payload.data?.devices ?? []) as DeviceStatusSnapshot[]
        if (cancelled) return

        const previousMaps = mapsRef.current

        for (const snapshot of snapshots) {
          const previousDevice = previousMaps
            .find(map => map.id === snapshot.mapId)
            ?.devices.find(device => device.id === snapshot.deviceId)

          if (
            previousDevice &&
            previousDevice.status === snapshot.status &&
            previousDevice.latency === snapshot.latency
          ) {
            continue
          }

          dispatch({
            type: 'UPDATE_DEVICE_STATUS',
            deviceId: snapshot.deviceId,
            mapId: snapshot.mapId,
            status: snapshot.status,
            latency: snapshot.latency,
          })

          if (previousDevice && previousDevice.status !== snapshot.status) {
            dispatch({
              type: 'ADD_HISTORY_ENTRY',
              deviceId: snapshot.deviceId,
              entry: {
                timestamp: new Date(),
                status: snapshot.status,
                latency: snapshot.latency,
              },
            })
          }
        }
      } catch {
        /* erros transitorios: mantem o intervalo */
      }
    }

    void tick()
    const intervalId = window.setInterval(() => {
      void tick()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [dispatch, enabled])
}
