import { httpApi } from './httpApi'
import { mockApi } from './mockApi'
import type { Api } from './types'

export * from './types'

/** Mock (browser-only) until the Laravel API exists. Set VITE_USE_MOCK_API=false to switch. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

export const api: Api = USE_MOCK_API ? mockApi : httpApi
