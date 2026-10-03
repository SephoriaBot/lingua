// All data now goes through our own /api routes. The browser never holds a
// database token or an AI key; it only sends the signed-in user's Clerk session token.

type TokenGetter = () => Promise<string | null>;
let getToken: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter) {
  getToken = fn;
}

async function post<T>(path: string, body: object): Promise<T> {
  const token = getToken ? await getToken() : null;
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

export const chatCall = (scenarioId: string, messages: { role: string; content: string }[]) =>
  post<{ reply: string }>('/api/chat', { scenarioId, messages });
