const EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
])

/** Chỉ cho phép http(s) tuyệt đối hoặc đường dẫn nội bộ bắt đầu bằng "/" (chặn javascript:, data:...) */
export function toSafeHttpUrl(url?: string | null): string | null {
  const value = url?.trim()
  if (!value) return null
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null
  } catch {
    return null
  }
}

/** Link video trực tiếp (.mp4 / .webm) */
export function toSafeVideoFileUrl(url?: string | null): string | null {
  const safe = toSafeHttpUrl(url)
  return safe && /\.(mp4|webm)(\?.*)?$/i.test(safe) ? safe : null
}

/** Chỉ cho phép nhúng iframe từ YouTube / Vimeo (https). Tự đổi link xem sang link nhúng. */
export function toSafeEmbedUrl(url?: string | null): string | null {
  const value = url?.trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return null
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
    }
    if (!EMBED_HOSTS.has(parsed.hostname)) return null
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null
    }
    return parsed.toString()
  } catch {
    return null
  }
}
