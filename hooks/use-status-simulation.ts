'use client'

import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

/** Atualizacao sintetica de status quando o monitoramento ao vivo esta desligado. */
export function useStatusSimulation(enabled = true) {
  const { state, dispatch } = useStore()
  const mapsRef = useRef(state.maps)

  useEffect(() => {
    mapsRef.current = state.maps
  }, [state.maps])

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      const maps = mapsRef.current

      for (const map of maps) {
        for (const device of map.devices) {
          const roll = Math.random()
          let newStatus = device.status
          let newLatency = device.latency

          if (device.status === 'online') {
            if (roll < 0.006) {
              newStatus = 'offline'
              newLatency = undefined
            } else if (roll < 0.025) {
              newStatus = 'warning'
              newLatency = Math.floor(Math.random() * 400 + 150)
            } else {
              const base = device.latency ?? 10
              const jitter = (Math.random() - 0.5) * 3
              newLatency = Math.max(1, Math.min(100, Math.round(base + jitter)))
            }
          } else if (device.status === 'offline') {
            if (roll < 0.03) {
              newStatus = 'online'
              newLatency = Math.floor(Math.random() * 20 + 2)
            }
          } else if (device.status === 'warning') {
            if (roll < 0.2) {
              newStatus = 'online'
              newLatency = Math.floor(Math.random() * 30 + 5)
            } else if (roll < 0.25) {
              newStatus = 'offline'
              newLatency = undefined
            } else {
              newLatency = Math.floor(Math.random() * 200 + 100)
            }
          } else if (device.status === 'unknown') {
            if (roll < 0.06) {
              newStatus = 'online'
              newLatency = Math.floor(Math.random() * 20 + 2)
            }
          }

          if (newStatus !== device.status || newLatency !== device.latency) {
            dispatch({
              type: 'UPDATE_DEVICE_STATUS',
              deviceId: device.id,
              mapId: map.id,
              status: newStatus,
              latency: newLatency,
            })

            if (newStatus !== device.status) {
              dispatch({
                type: 'ADD_HISTORY_ENTRY',
                deviceId: device.id,
                entry: {
                  timestamp: new Date(),
                  status: newStatus,
                  latency: newLatency,
                },
              })
            }
          }
        }
      }
    }

    const interval = setInterval(tick, 3000)
    return () => clearInterval(interval)
  }, [dispatch, enabled])
}
