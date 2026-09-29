/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURSO_URL: string;
  readonly VITE_TURSO_AUTH_TOKEN: string;
  readonly VITE_GROQ_API_KEY: string;
  readonly VITE_GROQ_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
