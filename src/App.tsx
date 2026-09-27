import { useEffect, useState } from 'react';
import { useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { turso } from './lib/db/turso';
import { getUnlockedDay } from './lib/progress';
import type { Language, LearningStyle, UserSettings } from './types';
import StyleSelector from './components/StyleSelector';
import LanguageSwitcher from './components/LanguageSwitcher';
import Flashcards from './components/Flashcards';
import GrammarNotes from './components/GrammarNotes';
import ConversationPractice from './components/ConversationPractice';
import ListeningDrill from './components/ListeningDrill';

type Mode = LearningStyle;

export default function App() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('flashcards');

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const langsRes = await turso.execute('select * from languages order by sort_order');
      setLanguages(langsRes.rows as unknown as Language[]);

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
        setSettings({
          ...row,
          started_at: startedAt,
          learning_styles: JSON.parse(row.learning_styles || '[]'),
        });
        setMode((JSON.parse(row.learning_styles || '[]')[0] as Mode) ?? 'flashcards');
      }
      setLoading(false);
    })();
  }, [userId]);

  async function saveStyles(styles: LearningStyle[]) {
    if (!userId) return;
    const activeLanguage = settings?.active_language_id ?? languages[0]?.id ?? 'es';
    const startedAt = settings?.started_at ?? new Date().toISOString();
    await turso.execute({
      sql: `insert into user_settings (user_id, active_language_id, learning_styles, started_at, updated_at)
            values (?, ?, ?, ?, ?)
            on conflict(user_id) do update set
              learning_styles = excluded.learning_styles,
              updated_at = excluded.updated_at`,
      args: [userId, activeLanguage, JSON.stringify(styles), startedAt, new Date().toISOString()],
    });
    setSettings({
      user_id: userId,
      active_language_id: activeLanguage,
      learning_styles: styles,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
    });
    setMode(styles[0]);
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
        <div className="brand">
          <span className="flag">🌿</span> Lingua
        </div>
        <p style={{ marginBottom: 16 }}>Sign in to start learning.</p>
        <SignInButton mode="modal">
          <button className="btn-primary">Sign in</button>
        </SignInButton>
      </div>
    );
  }

  if (loading) return null;

  const activeLanguage = languages.find((l) => l.id === settings?.active_language_id) ?? languages[0];
  const unlockedDay = settings ? getUnlockedDay(settings.started_at) : 1;

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="brand">
            Lingua
          </div>
          <div className="subtitle">Learn languages, one day at a time.</div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {!settings ? (
        <StyleSelector initial={[]} onSave={saveStyles} />
      ) : (
        <>
          <LanguageSwitcher
            languages={languages}
            activeId={activeLanguage?.id ?? ''}
            onChange={setActiveLanguage}
          />

          <div className="nav-row">
            {settings.learning_styles.includes('flashcards') && (
              <button className={`nav-tab ${mode === 'flashcards' ? 'active' : ''}`} onClick={() => setMode('flashcards')}>
                Flashcards
              </button>
            )}
            {settings.learning_styles.includes('listening') && (
              <button className={`nav-tab ${mode === 'listening' ? 'active' : ''}`} onClick={() => setMode('listening')}>
                Listening
              </button>
            )}
            {settings.learning_styles.includes('grammar') && (
              <button className={`nav-tab ${mode === 'grammar' ? 'active' : ''}`} onClick={() => setMode('grammar')}>
                Grammar
              </button>
            )}
            {settings.learning_styles.includes('conversation') && (
              <button className={`nav-tab ${mode === 'conversation' ? 'active' : ''}`} onClick={() => setMode('conversation')}>
                Conversation
              </button>
            )}
          </div>

          {activeLanguage && mode === 'flashcards' && (
            <Flashcards languageId={activeLanguage.id} userId={userId} unlockedDay={unlockedDay} />
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
        </>
      )}
    </div>
  );
}
