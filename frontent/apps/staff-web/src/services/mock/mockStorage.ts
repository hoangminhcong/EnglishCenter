const REVIEW_SEED_MIGRATION_KEY = 'ec_staff_review_seed_migration_v6'
const ACTIVE_SESSION_KEY_V4 = 'ec_staff_active_session_user_v4'

const memoryFallback = new Map<string, string>()

function removeMatchingKeys(storage: Storage, predicate: (key: string) => boolean): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i)
    if (key && predicate(key)) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    storage.removeItem(key)
  }
}

function isLegacyDemoSessionValue(raw: string | null): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  if (trimmed.toLowerCase().endsWith('.demo')) {
    return true
  }
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed === 'string') {
      return parsed.toLowerCase().endsWith('.demo')
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const candidate = parsed as { username?: unknown }
      if (
        typeof candidate.username === 'string' &&
        candidate.username.toLowerCase().endsWith('.demo')
      ) {
        return true
      }
    }
  } catch {
    // Plain string session ID
  }
  return false
}

export function ensureMockCleanupMigration(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(REVIEW_SEED_MIGRATION_KEY) === '1') {
      return
    }

    const isLegacyVersionedKey = (key: string): boolean =>
      key !== ACTIVE_SESSION_KEY_V4 && /_v[1-5]$/.test(key) && key.startsWith('ec_staff_')

    removeMatchingKeys(window.sessionStorage, isLegacyVersionedKey)
    removeMatchingKeys(window.localStorage, isLegacyVersionedKey)

    const sessionVal = window.sessionStorage.getItem(ACTIVE_SESSION_KEY_V4)
    if (isLegacyDemoSessionValue(sessionVal)) {
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY_V4)
    }

    const localVal = window.localStorage.getItem(ACTIVE_SESSION_KEY_V4)
    if (isLegacyDemoSessionValue(localVal)) {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY_V4)
    }

    window.localStorage.setItem(REVIEW_SEED_MIGRATION_KEY, '1')
  } catch {
    // Ignore restricted storage environments
  }
}

ensureMockCleanupMigration()

export function resetAllMockStorage(): void {
  memoryFallback.clear()
  if (typeof window === 'undefined') return
  try {
    removeMatchingKeys(
      window.sessionStorage,
      (key) => key.startsWith('ec_staff_') || key.startsWith('ec_staff_active_session_user_'),
    )
  } catch {
    // Ignore storage access errors
  }
  try {
    removeMatchingKeys(window.localStorage, (key) =>
      key.startsWith('ec_staff_active_session_user_'),
    )
  } catch {
    // Ignore storage access errors
  }
}

export function readMockCollection<T>(key: string, fallbackFactory: () => T): T {
  if (typeof window === 'undefined') return fallbackFactory()
  ensureMockCleanupMigration()

  try {
    const raw = window.sessionStorage.getItem(key) ?? memoryFallback.get(key)
    if (!raw) {
      const seeded = fallbackFactory()
      writeMockCollection(key, seeded)
      return seeded
    }

    const parsed: unknown = JSON.parse(raw)
    const fallbackSample = fallbackFactory()
    if (Array.isArray(fallbackSample)) {
      if (!Array.isArray(parsed)) {
        writeMockCollection(key, fallbackSample)
        return fallbackSample
      }
      return parsed as T
    }

    if (
      parsed === null ||
      typeof parsed !== typeof fallbackSample ||
      (typeof fallbackSample === 'object' && Array.isArray(parsed))
    ) {
      writeMockCollection(key, fallbackSample)
      return fallbackSample
    }

    return parsed as T
  } catch {
    const fallback = fallbackFactory()
    writeMockCollection(key, fallback)
    return fallback
  }
}

export function writeMockCollection<T>(key: string, data: T): void {
  const serialized = JSON.stringify(data)

  if (typeof window === 'undefined') {
    memoryFallback.set(key, serialized)
    return
  }

  ensureMockCleanupMigration()
  try {
    window.sessionStorage.setItem(key, serialized)
    memoryFallback.delete(key)
  } catch {
    memoryFallback.set(key, serialized)
  }
}

export const mockDelay = (ms = 140) =>
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined') {
      window.setTimeout(resolve, ms)
    } else {
      setTimeout(resolve, ms)
    }
  })
