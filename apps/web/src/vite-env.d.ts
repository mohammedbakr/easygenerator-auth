/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public display name (baked in at build time). */
  readonly VITE_APP_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
