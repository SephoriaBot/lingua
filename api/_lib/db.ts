import { createClient, type Client } from '@libsql/client/web';

let client: Client | null = null;

// Server-only. These env vars have NO VITE_ prefix, so they never reach the browser.
export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      console.error('TURSO_URL / TURSO_AUTH_TOKEN are not set');
      throw new Error('Server misconfigured');
    }
    client = createClient({ url, authToken });
  }
  return client;
}
