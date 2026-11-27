export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'

export function removeDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/** Tìm kiếm không phân biệt hoa/thường và dấu tiếng Việt */
export function matchText(haystack: string, needle: string): boolean {
  const n = removeDiacritics(needle.trim().toLowerCase())
  if (!n) return true
  return removeDiacritics(haystack.toLowerCase()).includes(n)
}

/** Định dạng chuỗi ngày YYYY-MM-DD sang DD/MM/YYYY */
export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Định dạng DateTime ISO-8601 theo múi giờ chuẩn nghiệp vụ Asia/Ho_Chi_Minh */
export function formatDateTimeVi(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/** Lấy ngày lịch hiện tại (YYYY-MM-DD) theo đúng múi giờ Asia/Ho_Chi_Minh (tránh lệch ngày UTC 00:00–06:59) */
export function getTodayIsoInVietnam(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

/** Kiểm tra hạn ngày lịch YYYY-MM-DD đã qua so với ngày hiện tại tại Việt Nam hay chưa */
export function isIsoDateExpiredInVietnam(
  deadlineIso?: string | null,
  referenceTodayIso: string = getTodayIsoInVietnam(),
): boolean {
  if (!deadlineIso) return false
  const trimmed = deadlineIso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false
  return trimmed < referenceTodayIso
}

/** Định dạng tiền tệ số nguyên VND thống nhất */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`
}

const vnDateEnCaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Chuẩn hóa số điện thoại Việt Nam (+84 / 84 -> 0...) */
export function normalizeVnPhone(raw: string): string {
  const cleaned = raw.replace(/[\s.()-]+/g, '').trim()
  if (cleaned.startsWith('+84')) {
    return `0${cleaned.slice(3)}`
  }
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    return `0${cleaned.slice(2)}`
  }
  return cleaned
}

/** Chuyển đổi chuỗi ngày hoặc ISO-8601 sang YYYY-MM-DD theo múi giờ Asia/Ho_Chi_Minh */
export function toVietnamYmd(isoOrYmd: string): string {
  const trimmed = isoOrYmd.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10)
  }
  return vnDateEnCaFormatter.format(parsed)
}

export function paginate<T>(items: readonly T[], page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(page, 1), totalPages)
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
  }
}

/** Dịch chuyển ngày lịch YYYY-MM-DD thêm/bớt số ngày nguyên */
export function shiftIsoYmd(isoYmd: string, deltaDays: number): string {
  const base = new Date(`${isoYmd}T00:00:00Z`)
  if (Number.isNaN(base.getTime())) return isoYmd
  base.setUTCDate(base.getUTCDate() + deltaDays)
  return base.toISOString().slice(0, 10)
}

/** Chuyển chuỗi tiếng Việt sang slug URL chuẩn (chữ thường, gạch ngang) */
export function slugifyVi(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
