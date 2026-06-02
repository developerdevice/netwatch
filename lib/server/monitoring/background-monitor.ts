import 'server-only'

import { getRegisteredServer } from '@/lib/server/server-registry/repository'
import {
  getMonitorCredentials,
  listServerIdsWithMonitorCredentials,
} from '@/lib/server/server-registry/credentials-repository'
import { loadStoredTopology } from '@/lib/server/map-repository/topology-repository'
import { pingDevicesForServer } from '@/lib/server/monitoring/ping-devices'
import { applyDeviceStatusSnapshot } from '@/lib/server/monitoring/status-transition'
import { OutageNotifier } from '@/lib/server/monitoring/outage-notifier'

let started = false
let intervalId: ReturnType<typeof setInterval> | null = null
let outageNotifier: OutageNotifier | null = null

function getOutageNotifier() {
  if (!outageNotifier) {
    outageNotifier = new OutageNotifier(getOutageMinNotifyMs())
  }
  return outageNotifier
}

function isBackgroundMonitorEnabled() {
  return process.env.NETWATCH_BACKGROUND_MONITOR_ENABLED === '1'
}

function getMonitorIntervalMs() {
  const raw = Number(process.env.NETWATCH_MONITOR_INTERVAL_MS)
  return Number.isFinite(raw) && raw >= 5000 ? Math.floor(raw) : 15_000
}

function getOutageMinNotifyMs() {
  const raw = Number(process.env.NETWATCH_OUTAGE_MIN_NOTIFY_MS)
  return Number.isFinite(raw) && raw >= 1000 ? Math.floor(raw) : 10_000
}

async function runMonitorTick() {
  const serverIds = listServerIdsWithMonitorCredentials()

  for (const serverId of serverIds) {
    const server = getRegisteredServer(serverId)
    const credentials = getMonitorCredentials(serverId)
    if (!server || !credentials) continue

    const { maps } = loadStoredTopology(serverId)
    const devices = maps.flatMap(map => map.devices)

    const telegram =
      credentials.telegramBotToken && credentials.telegramChatId
        ? { botToken: credentials.telegramBotToken, chatId: credentials.telegramChatId }
        : null

    try {
      const snapshots = await pingDevicesForServer(devices, {
        host: server.host,
        port: server.port,
        secure: server.secure,
        username: credentials.monitorUsername,
        password: credentials.monitorPassword,
      })

      const deviceById = new Map(devices.map(device => [device.id, device]))

      for (const snapshot of snapshots) {
        const device = deviceById.get(snapshot.deviceId)
        if (!device) continue

        const transition = applyDeviceStatusSnapshot(serverId, device, snapshot)

        if (transition.changed) {
          getOutageNotifier().handleStatusChange(
            serverId,
            device.id,
            {
              serverLabel: server.label,
              deviceLabel: device.label,
              deviceIp: device.ip,
            },
            transition.previousStatus,
            transition.newStatus,
            telegram
          )
        }
      }
    } catch (error) {
      console.error(
        `[background-monitor] server ${serverId}`,
        error instanceof Error ? error.message : error
      )
    }
  }
}

export function startBackgroundMonitor() {
  if (started) return
  if (!isBackgroundMonitorEnabled()) return

  started = true
  const intervalMs = getMonitorIntervalMs()

  void runMonitorTick()
  intervalId = setInterval(() => {
    void runMonitorTick()
  }, intervalMs)

  console.info(`[background-monitor] started (interval ${intervalMs}ms)`)
}

export function stopBackgroundMonitor() {
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = null
  }
  started = false
}
