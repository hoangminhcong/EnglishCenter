const metaEnv: Partial<ImportMetaEnv> =
  typeof import.meta.env === 'object' && import.meta.env !== null
    ? import.meta.env
    : { DEV: true }

const rawSharedApiBaseUrl = metaEnv.VITE_API_BASE_URL?.trim() ?? ''
const rawStaffApiBaseUrl = metaEnv.VITE_STAFF_API_BASE_URL?.trim() ?? ''
const rawUseMock = metaEnv.VITE_STAFF_USE_MOCK_API?.trim().toLowerCase()
const rawDataSource = metaEnv.VITE_STAFF_DATA_SOURCE?.trim().toLowerCase()

const rawClientAppUrl = metaEnv.VITE_CLIENT_APP_URL?.trim() ?? ''
const rawStaffAppUrl = metaEnv.VITE_STAFF_APP_URL?.trim() ?? ''

export const STAFF_API_BASE_URL = (rawStaffApiBaseUrl || rawSharedApiBaseUrl).replace(/\/+$/, '')

export const CLIENT_APP_URL = (
  rawClientAppUrl || (metaEnv.DEV ? 'http://localhost:5173' : '')
).replace(/\/+$/, '')

export const STAFF_APP_URL = (
  rawStaffAppUrl || (metaEnv.DEV ? 'http://localhost:5174' : '')
).replace(/\/+$/, '')

export const USE_STAFF_MOCK_API =
  rawDataSource === 'mock' ||
  rawUseMock === 'true' ||
  Boolean(
    metaEnv.DEV &&
      !STAFF_API_BASE_URL &&
      rawUseMock !== 'false' &&
      rawDataSource !== 'api',
  )

export const STAFF_API_CONFIG_ERROR: string | null =
  !USE_STAFF_MOCK_API && !STAFF_API_BASE_URL
    ? 'Hệ thống quản trị chưa được cấu hình địa chỉ máy chủ.'
    : null
