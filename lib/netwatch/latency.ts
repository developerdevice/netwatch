export function formatLatencyLabel(latencyMs: number): string {
  if (latencyMs < 1) {
    const micros = Math.round(latencyMs * 1000)
    return `${micros} µs`
  }
  if (latencyMs < 10) {
    return `${Math.round(latencyMs * 100) / 100} ms`
  }
  return `${Math.round(latencyMs)} ms`
}

export function formatLatencyForDevicePanel(latencyMs: number): string {
  return formatLatencyLabel(latencyMs)
}
