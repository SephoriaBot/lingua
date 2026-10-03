import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';
import { HttpError } from './core.js';

// Returns the Clerk user id from a *verified* session token.
// The user id is never read from the request body.
export async function requireUser(req: VercelRequest): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error('CLERK_SECRET_KEY is not set');
    throw new HttpError(500, 'Server misconfigured');
  }
  const header = req.headers.authorization;
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Please sign in');

  // Optional but recommended: comma-separated list of your site origins,
  // e.g. https://lingua-nest.vercel.app
  const parties = (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const result: any = await verifyToken(token, {
      secretKey,
      ...(parties.length ? { authorizedParties: parties } : {}),
    });
    if (result?.errors?.length) throw new Error('invalid token');
    const payload = result?.data ?? result;
    if (!payload?.sub) throw new Error('no subject');
    return String(payload.sub);
  } catch {
    throw new HttpError(401, 'Please sign in again');
  }
}
