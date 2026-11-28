const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const rawUseMock = import.meta.env.VITE_USE_MOCK_API?.trim().toLowerCase()
const rawDataSource = import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase()

const rawClientAppUrl = import.meta.env.VITE_CLIENT_APP_URL?.trim() ?? ''
const rawStaffAppUrl = import.meta.env.VITE_STAFF_APP_URL?.trim() ?? ''

/** URL gốc của Backend Node.js REST API (ví dụ: "https://api.example.com/api/v1") */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

export const CLIENT_APP_URL = (
  rawClientAppUrl || (import.meta.env.DEV ? 'http://localhost:5173' : '')
).replace(/\/+$/, '')

export const STAFF_APP_URL = (
  rawStaffAppUrl || (import.meta.env.DEV ? 'http://localhost:5174' : '')
).replace(/\/+$/, '')

export const USE_MOCK_API =
  rawDataSource === 'mock' ||
  rawUseMock === 'true' ||
  (import.meta.env.DEV &&
    !API_BASE_URL &&
    rawUseMock !== 'false' &&
    rawDataSource !== 'api')

export const API_CONFIG_ERROR: string | null =
  !USE_MOCK_API && !API_BASE_URL
    ? 'Hệ thống chưa được kết nối máy chủ dữ liệu. Vui lòng thử lại sau hoặc liên hệ trung tâm.'
    : null
