import 'server-only'

import { normalizeStrictIpv4 } from '@/lib/server/security/safe-ipv4'

const HOST_LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

function isValidHostname(host: string): boolean {
  if (host.length > 253 || host.length < 1) return false
  if (host.includes('..') || host.startsWith('.') || host.endsWith('.')) return false
  const labels = host.split('.')
  if (labels.length < 1) return false
  return labels.every(label => label.length >= 1 && label.length <= 63 && HOST_LABEL.test(label))
}

export function normalizeServerConnectHost(raw: string): string | null {
  const s = raw.trim()
  if (s.length < 1 || s.length > 253) return null
  if (s !== raw) return null
  if (/[\s\r\n\t;=|&$`'"<>]/.test(s)) return null

  const ipv4 = normalizeStrictIpv4(s)
  if (ipv4) return ipv4

  if (!/^[a-zA-Z0-9.-]+$/.test(s)) return null
  if (!isValidHostname(s)) return null
  return s.toLowerCase()
}
