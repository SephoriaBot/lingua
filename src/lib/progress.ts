import { turso } from './db/turso';

// One lesson ("day") per calendar day, and the next lesson only unlocks once
// the current one has been marked finished. Everything else in the app keys
// off `unlockedDay` (content with sort_order <= unlockedDay is visible), so
// that number is now derived from completions instead of elapsed time.

export type LessonState =
  | { status: 'open'; day: number; unlockedDay: number }       // today's lesson, not finished yet
  | { status: 'done_today'; day: number; unlockedDay: number }; // finished; next one unlocks tomorrow

// Local-time YYYY-MM-DD, so "a day" resets at the user's midnight, not UTC's.
const localDate = () => new Date().toLocaleDateString('en-CA');

export async function ensureLessonTable() {
  await turso.execute(`
    create table if not exists lesson_completions (
      user_id text not null,
      language_id text not null,
      day integer not null,
      completed_on text not null,
      primary key (user_id, language_id, day)
    )`);
}

export async function getLessonState(userId: string, languageId: string): Promise<LessonState> {
  const res = await turso.execute({
    sql: `select day, completed_on from lesson_completions
          where user_id = ? and language_id = ?
          order by day desc limit 1`,
    args: [userId, languageId],
  });
  const last = res.rows[0] as any;
  const lastDay = last ? Number(last.day) : 0;

  if (last && last.completed_on === localDate()) {
    // Already finished a lesson today: nothing new until tomorrow.
    return { status: 'done_today', day: lastDay, unlockedDay: lastDay };
  }
  // Otherwise the next lesson stays put at lastDay + 1 until it's completed.
  return { status: 'open', day: lastDay + 1, unlockedDay: lastDay + 1 };
}

export async function completeLesson(userId: string, languageId: string, day: number) {
  await turso.execute({
    sql: `insert or ignore into lesson_completions (user_id, language_id, day, completed_on)
          values (?, ?, ?, ?)`,
    args: [userId, languageId, day, localDate()],
  });
}
