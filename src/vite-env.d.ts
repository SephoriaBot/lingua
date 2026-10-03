/// <reference types="vite/client" />

// Only public values belong here. The Clerk *publishable* key is meant to be public.
// Turso and Groq secrets are server-only now (see SETUP.md) and must never use a VITE_ prefix.
interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
