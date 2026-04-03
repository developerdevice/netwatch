import 'server-only'

import { normalizeStrictIpv4 } from '@/lib/server/security/safe-ipv4'
import type { NetworkMap } from '@/lib/types'

export function validateTopologyDeviceIps(maps: NetworkMap[]): { ok: true } | { ok: false; message: string } {
  for (const map of maps) {
    for (const d of map.devices) {
      const ip = d.ip?.trim() ?? ''
      if (ip === '' || ip === '0.0.0.0') continue
      if (normalizeStrictIpv4(ip) !== ip) {
        return {
          ok: false,
          message: `IP invalido no dispositivo "${d.label}" (apenas IPv4 numerico permitido).`,
        }
      }
    }
  }
  return { ok: true }
}
