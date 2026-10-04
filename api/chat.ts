import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { getDb } from './_lib/db.js';
import { buildChat, consumeChatQuota, HttpError, localDate } from './_lib/core.js';
import { bodyOf, guard, sendError } from './_lib/http.js';

// A reply that is empty or only dots/ellipsis/punctuation isn't a real answer.
const isBlank = (s: string) => s.replace(/[\s.…。·\-_*]/g, '').length === 0;

async function askGroq(apiKey: string, messages: unknown[], effort: 'medium' | 'high') {
  const groq = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      // Model is fixed on the server. Change it with the GROQ_MODEL env var.
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      reasoning_effort: effort,
      max_completion_tokens: 1500, // reasoning tokens count too, so leave room
      messages,
    }),
  });
  const data: any = await groq.json().catch(() => ({}));
  if (!groq.ok) {
    console.error('Groq error', groq.status, data?.error?.message);
    throw new HttpError(502, 'The tutor is unavailable right now. Please try again.');
  }
  return String(data?.choices?.[0]?.message?.content ?? '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!guard(req, res)) return;
  try {
    const userId = await requireUser(req);
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      throw new HttpError(500, 'Server misconfigured');
    }
    const db = getDb();
    const today = localDate(req.headers['x-timezone']);

    // Validate first (cheap), then spend quota, then call Groq.
    const messages = await buildChat(db, userId, today, bodyOf(req));
    await consumeChatQuota(db, userId);

    let reply = await askGroq(apiKey, messages, 'medium');
    if (isBlank(reply)) reply = await askGroq(apiKey, messages, 'high'); // one retry
    if (isBlank(reply)) {
      throw new HttpError(502, 'The tutor didn\'t answer that one. Try rephrasing.');
    }
    res.status(200).json({ reply });
  } catch (e) {
    sendError(res, e);
  }
}
