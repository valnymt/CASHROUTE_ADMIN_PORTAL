/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK_API?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_IDLE_TIMEOUT_MIN?: string
  readonly VITE_REQUIRE_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
