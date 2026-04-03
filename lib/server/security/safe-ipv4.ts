import 'server-only'

export function normalizeStrictIpv4(raw: string): string | null {
  const s = raw.trim()
  if (s.length < 7 || s.length > 15) return null
  if (s !== raw) return null
  if (/[\s\r\n\t;=|&$`'"<>]/.test(s)) return null
  const parts = s.split('.')
  if (parts.length !== 4) return null
  for (const part of parts) {
    if (part.length === 0 || part.length > 3) return null
    if (!/^\d+$/.test(part)) return null
    if (part.length > 1 && part.startsWith('0')) return null
    const n = Number(part)
    if (n > 255) return null
  }
  return s
}

export function normalizePingTargetIpv4(raw: string): string | null {
  const ip = normalizeStrictIpv4(raw)
  if (!ip || ip === '0.0.0.0') return null
  return ip
}
