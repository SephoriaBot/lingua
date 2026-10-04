import { useEffect, useState } from 'react';
import { useUser, useAuth, SignIn, UserButton } from '@clerk/clerk-react';
import { dbCall, setTokenGetter } from './lib/api';
import type { Language, UserSettings, LessonState } from './types';
import LanguageSwitcher from './components/LanguageSwitcher';
import Flashcards from './components/Flashcards';
import GrammarNotes from './components/GrammarNotes';
import ConversationPractice from './components/ConversationPractice';
import ListeningDrill from './components/ListeningDrill';

type Mode = 'flashcards' | 'listening' | 'grammar' | 'conversation';

function LoadingScreen() {
  return (
    <div className="app-shell" style={{ textAlign: 'center' }}>
      <style>{`@keyframes lingua-spin { to { transform: rotate(360deg); } }`}</style>
      <img src="/linguatitle.png" alt="Lingua" className="brand-logo" />
      <div
        role="status"
        aria-label="Loading"
        style={{
          width: 32,
          height: 32,
          margin: '16px auto 8px',
          border: '3px solid rgba(128,128,128,0.25)',
          borderTopColor: 'currentColor',
          borderRadius: '50%',
          animation: 'lingua-spin 0.8s linear infinite',
        }}
      />
      <p>Loading your lessons…</p>
    </div>
  );
}

export default function App() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id;
  // Registered during render so child effects can authenticate on first mount.
  setTokenGetter(() => getToken());

  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [lesson, setLesson] = useState<LessonState | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    dbCall<{ languages: Language[]; settings: UserSettings; lesson: LessonState }>('bootstrap')
      .then((r) => {
        if (cancelled) return;
        setLanguages(r.languages);
        setSettings(r.settings);
        setLesson(r.lesson);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load your data');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Lesson gate: recompute whenever the language changes, and again when the
  // tab regains focus so a page left open past midnight picks up the new day.
  const activeLanguageId = settings?.active_language_id;
  useEffect(() => {
    if (!userId || !activeLanguageId) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const r = await dbCall<{ lesson: LessonState }>('lesson', { languageId: activeLanguageId });
        if (!cancelled) setLesson(r.lesson);
      } catch {
        /* keep the last known state */
      }
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
    try {
      const r = await dbCall<{ lesson: LessonState }>('completeLesson', { languageId: activeLanguageId });
      setLesson(r.lesson);
    } catch {
      /* leave the button available so they can try again */
    }
  }

  async function setActiveLanguage(id: string) {
    if (!settings || !userId) return;
    try {
      await dbCall('setLanguage', { languageId: id });
      setSettings({ ...settings, active_language_id: id });
    } catch {
      /* ignore; the switcher stays on the current language */
    }
  }

  // Wait for Clerk to finish checking the session before deciding what to show.
  if (!isLoaded) return <LoadingScreen />;

  // Not signed in — Clerk's modal handles the actual form (email, password,
  // socials, whatever you've enabled in the Clerk dashboard).
  if (!userId) {
    return (
      <div className="app-shell">
        <img src="/linguatitle.png" alt="Lingua" className="brand-logo" />
        <p style={{ marginBottom: 16 }}>Sign in to start learning.</p>
        {/* Hash routing keeps the sign-up step in the URL, so if the phone reloads
            the page while you're in your email app, you land back on the code step. */}
        <SignIn routing="hash" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-shell">
        <p>Couldn't load your lessons: {loadError}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  if (loading || !settings || !lesson) return <LoadingScreen />;

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
        <ListeningDrill languageId={activeLanguage.id} unlockedDay={unlockedDay} />
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
