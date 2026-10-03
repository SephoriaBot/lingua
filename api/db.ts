import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { getDb } from './_lib/db';
import { localDate, runAction } from './_lib/core';
import { bodyOf, guard, sendError } from './_lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!guard(req, res)) return;
  try {
    const userId = await requireUser(req);
    const body = bodyOf(req);
    const today = localDate(req.headers['x-timezone']);
    res.status(200).json(await runAction(getDb(), userId, today, body.action, body));
  } catch (e) {
    sendError(res, e);
  }
}
