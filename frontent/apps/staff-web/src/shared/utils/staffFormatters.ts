export { normalizeVnPhone, toVietnamYmd } from '@english-center/utils'

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'EC'
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? 'EC').toUpperCase()
  const first = parts[0]?.[0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return `${first}${last}`.toUpperCase()
}

export function buildRecentYearMonths(anchorYm: string, count: number): string[] {
  const [rawY = 2026, rawM = 11] = anchorYm.split('-').map(Number)
  const list: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const dt = new Date(Date.UTC(rawY, rawM - 1 - offset, 1))
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    list.push(`${y}-${m}`)
  }
  return list
}

let fallbackCounter = 1000

export function createUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  fallbackCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${fallbackCounter}`
}
