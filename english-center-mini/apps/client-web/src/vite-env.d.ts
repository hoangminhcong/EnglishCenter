/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CLIENT_APP_URL?: string
  readonly VITE_STAFF_APP_URL?: string
  readonly VITE_USE_MOCK_API?: string
  readonly VITE_DATA_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
