/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API origin. Left unset in dev so requests go to `/api` and Vite's proxy
   * forwards them to the Laravel server (see vite.config.ts).
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
