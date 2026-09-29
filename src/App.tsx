import { useEffect, useState } from 'react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { turso } from './lib/db/turso';
import { ensureLessonTable, getLessonState, completeLesson, type LessonState } from './lib/progress';
import type { Language, UserSettings } from './types';
import LanguageSwitcher from './components/LanguageSwitcher';
import Flashcards from './components/Flashcards';
import GrammarNotes from './components/GrammarNotes';
import ConversationPractice from './components/ConversationPractice';
import ListeningDrill from './components/ListeningDrill';

type Mode = 'flashcards' | 'listening' | 'grammar' | 'conversation';

export default function App() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [lesson, setLesson] = useState<LessonState | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const langsRes = await turso.execute('select * from languages order by sort_order');
      const langs = langsRes.rows as unknown as Language[];
      setLanguages(langs);

      const settingsRes = await turso.execute({
        sql: 'select * from user_settings where user_id = ?',
        args: [userId],
      });
      const row = settingsRes.rows[0] as any;

      if (row) {
        let startedAt = row.started_at as string | null;
        if (!startedAt) {
          startedAt = new Date().toISOString();
          await turso.execute({
            sql: 'update user_settings set started_at = ? where user_id = ?',
            args: [startedAt, userId],
          });
        }
        setSettings({ ...row, started_at: startedAt });
      } else {
        // First time we've seen this user — create their settings row up
        // front instead of waiting on a style-selection step.
        const activeLanguage = langs[0]?.id ?? 'es';
        const startedAt = new Date().toISOString();
        await turso.execute({
          sql: `insert into user_settings (user_id, active_language_id, started_at, updated_at)
                values (?, ?, ?, ?)`,
          args: [userId, activeLanguage, startedAt, startedAt],
        });
        setSettings({
          user_id: userId,
          active_language_id: activeLanguage,
          started_at: startedAt,
          updated_at: startedAt,
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  // Lesson gate: recompute whenever the language changes, and again when the
  // tab regains focus so a page left open past midnight picks up the new day.
  const activeLanguageId = settings?.active_language_id;
  useEffect(() => {
    if (!userId || !activeLanguageId) return;
    let cancelled = false;
    const refresh = async () => {
      await ensureLessonTable();
      const state = await getLessonState(userId, activeLanguageId);
      if (!cancelled) setLesson(state);
    };
    refresh();
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, activeLanguageId]);

  async function finishLesson() {
    if (!userId || !activeLanguageId || lesson?.status !== 'open') return;
    await completeLesson(userId, activeLanguageId, lesson.day);
    setLesson(await getLessonState(userId, activeLanguageId));
  }

  async function setActiveLanguage(id: string) {
    if (!settings || !userId) return;
    await turso.execute({
      sql: 'update user_settings set active_language_id = ? where user_id = ?',
      args: [id, userId],
    });
    setSettings({ ...settings, active_language_id: id });
  }

  // Wait for Clerk to finish checking the session before deciding what to show.
  if (!isLoaded) return null;

  // Not signed in — Clerk's modal handles the actual form (email, password,
  // socials, whatever you've enabled in the Clerk dashboard).
  if (!userId) {
    return (
      <div className="app-shell">
        <img src="/linguatitle.png" alt="Lingua" className="brand-logo" />
        <p style={{ marginBottom: 16 }}>Sign in to start learning.</p>
        <SignInButton mode="modal">
          <button className="btn-primary">Sign in</button>
        </SignInButton>
      </div>
    );
  }

  if (loading || !settings || !lesson) return null;

  const activeLanguage = languages.find((l) => l.id === settings.active_language_id) ?? languages[0];
  const unlockedDay = lesson.unlockedDay;

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <img src="/linguatitle.png" alt="Lingua" className="brand-logo" />
          <div className="subtitle">Learn languages, one lesson at a time.</div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      <LanguageSwitcher
        languages={languages}
        activeId={activeLanguage?.id ?? ''}
        onChange={setActiveLanguage}
      />


      <div className="card-surface" style={{ marginBottom: 16, textAlign: 'center' }}>
        {lesson.status === 'open' ? (
          <>
            <div style={{ marginBottom: 10 }}>Day {lesson.day} lesson</div>
            <button className="btn-primary" onClick={finishLesson}>
              Finish today's lesson
            </button>
          </>
        ) : (
          <div>Day {lesson.day} complete 🌙 Your next lesson unlocks tomorrow.</div>
        )}
      </div>

      <div className="nav-row">
        <button className={`nav-tab ${mode === 'flashcards' ? 'active' : ''}`} onClick={() => setMode('flashcards')}>
          <img src="/flashcards.png" alt="" className="nav-tab-icon" />
          Flashcards
        </button>
        <button className={`nav-tab ${mode === 'listening' ? 'active' : ''}`} onClick={() => setMode('listening')}>
          <img src="/listening.png" alt="" className="nav-tab-icon" />
          Listening
        </button>
        <button className={`nav-tab ${mode === 'grammar' ? 'active' : ''}`} onClick={() => setMode('grammar')}>
          <img src="/grammar.png" alt="" className="nav-tab-icon" />
          Grammar
        </button>
        <button className={`nav-tab ${mode === 'conversation' ? 'active' : ''}`} onClick={() => setMode('conversation')}>
          <img src="/conversations.png" alt="" className="nav-tab-icon" />
          Conversation
        </button>
      </div>

      {activeLanguage && mode === 'flashcards' && (
        <Flashcards languageId={activeLanguage.id} unlockedDay={unlockedDay} />
      )}
      {activeLanguage && mode === 'listening' && (
        <ListeningDrill languageId={activeLanguage.id} userId={userId} unlockedDay={unlockedDay} />
      )}
      {activeLanguage && mode === 'grammar' && (
        <GrammarNotes languageId={activeLanguage.id} unlockedDay={unlockedDay} />
      )}
      {activeLanguage && mode === 'conversation' && (
        <ConversationPractice languageId={activeLanguage.id} unlockedDay={unlockedDay} />
      )}
    </div>
  );
}
