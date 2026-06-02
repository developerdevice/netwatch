import type { DeviceStatus } from '@/lib/types'
import { formatDurationMs, isOutageStatus } from '@/lib/server/monitoring/device-status'
import { sendTelegramMessage } from '@/lib/server/telegram/client'

export interface OutageDeviceContext {
  serverLabel: string
  deviceLabel: string
  deviceIp: string
}

interface DeviceTrack {
  pendingDownSince: number | null
  confirmedDown: boolean
  downSince: number | null
  timer: ReturnType<typeof setTimeout> | null
}

function trackKey(serverId: string, deviceId: string) {
  return `${serverId}:${deviceId}`
}

export class OutageNotifier {
  private tracks = new Map<string, DeviceTrack>()
  private minNotifyMs: number

  constructor(minNotifyMs = 10_000) {
    this.minNotifyMs = minNotifyMs
  }

  handleStatusChange(
    serverId: string,
    deviceId: string,
    context: OutageDeviceContext,
    previousStatus: DeviceStatus | null,
    newStatus: DeviceStatus,
    telegram: { botToken: string; chatId: string } | null
  ) {
    const key = trackKey(serverId, deviceId)
    let track = this.tracks.get(key)

    if (!track) {
      track = { pendingDownSince: null, confirmedDown: false, downSince: null, timer: null }
      this.tracks.set(key, track)
    }

    const wasOutage = previousStatus != null && isOutageStatus(previousStatus)
    const isOutage = isOutageStatus(newStatus)

    if (isOutage && !wasOutage) {
      this.beginPendingDown(track, serverId, deviceId, context, telegram)
      return
    }

    if (!isOutage && wasOutage) {
      this.handleRecovery(track, serverId, deviceId, context, telegram)
      return
    }

    if (!isOutage && track.pendingDownSince != null) {
      this.cancelPendingDown(track)
    }
  }

  private beginPendingDown(
    track: DeviceTrack,
    serverId: string,
    deviceId: string,
    context: OutageDeviceContext,
    telegram: { botToken: string; chatId: string } | null
  ) {
    this.cancelPendingDown(track)
    track.pendingDownSince = Date.now()
    track.confirmedDown = false
    track.downSince = Date.now()

    track.timer = setTimeout(() => {
      track.confirmedDown = true
      track.pendingDownSince = null
      track.timer = null

      if (telegram) {
        void sendTelegramMessage(
          telegram.botToken,
          telegram.chatId,
          [
            'NetWatch — host indisponivel',
            `Servidor: ${context.serverLabel}`,
            `Dispositivo: ${context.deviceLabel}`,
            `IP: ${context.deviceIp}`,
            'Status: offline',
          ].join('\n')
        )
      }
    }, this.minNotifyMs)
  }

  private handleRecovery(
    track: DeviceTrack,
    serverId: string,
    deviceId: string,
    context: OutageDeviceContext,
    telegram: { botToken: string; chatId: string } | null
  ) {
    const now = Date.now()
    const downStarted = track.downSince ?? track.pendingDownSince
    const durationMs = downStarted != null ? now - downStarted : 0
    const wasConfirmed = track.confirmedDown

    this.cancelPendingDown(track)
    track.confirmedDown = false
    track.downSince = null

    if (!wasConfirmed && durationMs < this.minNotifyMs) {
      return
    }

    if (telegram && wasConfirmed) {
      void sendTelegramMessage(
        telegram.botToken,
        telegram.chatId,
        [
          'NetWatch — host recuperado',
          `Servidor: ${context.serverLabel}`,
          `Dispositivo: ${context.deviceLabel}`,
          `IP: ${context.deviceIp}`,
          `Indisponivel por: ${formatDurationMs(durationMs)}`,
          'Status: online',
        ].join('\n')
      )
    }
  }

  private cancelPendingDown(track: DeviceTrack) {
    if (track.timer != null) {
      clearTimeout(track.timer)
      track.timer = null
    }
    track.pendingDownSince = null
    if (!track.confirmedDown) {
      track.downSince = null
    }
  }
}
