/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Default football-data.org CORS proxy URL, baked in at build time. */
  readonly VITE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
