// All data now goes through our own /api routes. The browser never holds a
// database token or an AI key; it only sends the signed-in user's Clerk session token.

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

// Demo mode: a random "guest_<32 hex>" id kept in this browser, used when nobody is signed in.
const GUEST_KEY = 'lingua:guest';
const GUEST_RE = /^guest_[0-9a-f]{32}$/;
let memoryGuest: string | null = null; // fallback if localStorage is blocked

export function getGuestToken(): string | null {
  try {
    const v = localStorage.getItem(GUEST_KEY);
    if (v && GUEST_RE.test(v)) return v;
  } catch {
    /* ignore storage failures (e.g. private browsing) */
  }
  return memoryGuest;
}

export function startGuest(): string {
  const token = getGuestToken() ?? `guest_${crypto.randomUUID().replace(/-/g, '')}`;
  memoryGuest = token;
  try {
    localStorage.setItem(GUEST_KEY, token);
  } catch {
    /* ignore storage failures */
  }
  return token;
}

// Forget the guest id on this device (used when someone signs in or exits the demo).
export function forgetGuest() {
  memoryGuest = null;
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore storage failures */
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  // A signed-in user's token always wins; the guest id only applies when nobody is signed in.
  const token = (getToken ? await getToken() : null) ?? getGuestToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Lets the server work out "today" in the learner's own time zone.
      'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data as T;
}

export const dbCall = <T>(action: string, params: object = {}) =>
  post<T>('/api/db', { action, ...params });

export const chatCall = (
  scenarioId: string,
  messages: { role: string; content: string }[],
  level: 'easy' | 'normal' | 'challenge' = 'normal'
) => post<{ reply: string }>('/api/chat', { scenarioId, messages, level });