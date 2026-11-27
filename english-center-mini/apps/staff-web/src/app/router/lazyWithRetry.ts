import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

const CHUNK_RELOAD_GUARD_KEY = 'ec_staff_chunk_reload_guard'

function isDynamicImportFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

/**
 * Bọc `React.lazy` với cơ chế tự thử lại 1 lần (tránh xung đột lưu file tức thời của Vite HMR)
 * và tự làm mới trang an toàn 1 lần duy nhất nếu trình duyệt đang giữ đường dẫn chunk cũ.
 */
export function lazyWithRetry<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const loaded = await factory()
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
      }
      return loaded
    } catch (firstError) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      try {
        const retried = await factory()
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY)
        }
        return retried
      } catch (secondError) {
        if (typeof window !== 'undefined' && isDynamicImportFetchError(secondError)) {
          const currentPath = window.location.pathname
          const alreadyReloadedForPath = window.sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)
          if (alreadyReloadedForPath !== currentPath) {
            window.sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, currentPath)
            window.location.reload()
          }
        }
        throw secondError ?? firstError
      }
    }
  })
}
