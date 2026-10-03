import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpError } from './core';

export function guard(req: VercelRequest, res: VercelResponse): boolean {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}

export function bodyOf(req: VercelRequest): Record<string, unknown> {
  const b = req.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b : {};
}

export function sendError(res: VercelResponse, e: unknown) {
  if (e instanceof HttpError) {
    res.status(e.status).json({ error: e.message });
  } else {
    console.error(e); // details stay in server logs, not in the response
    res.status(500).json({ error: 'Something went wrong' });
  }
}
