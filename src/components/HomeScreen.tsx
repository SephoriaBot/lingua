import { useState } from 'react';
import type { Language, LessonState } from '../types';
import { FlagImage } from './FlagImage';

export const MAX_FOCUS = 3;

// ---------- Home: only the languages the learner chose ----------
export function Home({
  languages,
  myLanguageIds,
  progress,
  onOpen,
  onEdit,
}: {
  languages: Language[];
  myLanguageIds: string[];
  progress: Record<string, LessonState>;
  onOpen: (id: string) => void;
  onEdit: () => void;
}) {
  const mine = myLanguageIds
    .map((id) => languages.find((l) => l.id === id))
    .filter((l): l is Language => !!l);

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginBottom: 12 }}>
        Your languages
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mine.map((lang) => {
          const p = progress[lang.id];
          return (
            <div
              key={lang.id}
              className="card-surface"
              role="button"
              onClick={() => onOpen(lang.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            >
            
<div style={{ lineHeight: 1 }}>
  <FlagImage emoji={lang.flag_emoji} size={35} />
</div>
              <div style={{ flex: 1 }}>
                <div className="deck-title">{lang.name}</div>
                <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>
                  {p
                    ? p.status === 'open'
                      ? `Day ${p.day} lesson ready`
                      : `Day ${p.day} complete 🌙`
                    : 'Ready to start'}
                </div>
              </div>
              <span style={{ opacity: 0.5 }}>→</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
  className="btn-secondary"
  onClick={onEdit}
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }}
>
  <img
    src="/books.png"
    alt=""
    aria-hidden="true"
    style={{ width: 20, height: 20, objectFit: 'contain' }}
  />
  Change my languages
</button>
      </div>
    </div>
  );
}

// ---------- Picker: choose up to 3 from the full list ----------
export function LanguagePicker({
  languages,
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: {
  languages: Language[];
  initial: string[];
  saving: boolean;
  error: string | null;
  onSave: (ids: string[]) => void;
  onCancel?: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(initial);

  function toggle(id: string) {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= MAX_FOCUS) return p; // full: deselect one first
      return [...p, id];
    });
  }

  const full = picked.length >= MAX_FOCUS;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginBottom: 4 }}>
        What do you want to learn?
      </h2>
      <p style={{ opacity: 0.7, marginTop: 0 }}>
        Pick up to {MAX_FOCUS} to focus on. {picked.length} of {MAX_FOCUS} chosen. You can change this any time,
        and your progress is kept.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {languages.map((lang) => {
          const on = picked.includes(lang.id);
          const disabled = !on && full;
          return (
            <div
              key={lang.id}
              className="card-surface"
              role="button"
              aria-pressed={on}
              aria-disabled={disabled}
              onClick={() => !disabled && toggle(lang.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                outline: on ? '2px solid var(--moss-dark)' : 'none',
              }}
            >
              
<div style={{ lineHeight: 1 }}>
  <FlagImage emoji={lang.flag_emoji} size={35} />
</div>

              <div style={{ flex: 1 }}>
                <div className="deck-title">{lang.name}</div>
                <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>{lang.native_name}</div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center' }}>
  {on && (
    <img
      src="/check.png"
      alt="Selected"
      style={{ width: 24, height: 24, objectFit: 'contain' }}
    />
  )}
</span>
            </div>
          );
        })}
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
        {onCancel && (
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button
          className="btn-primary"
          onClick={() => onSave(picked)}
          disabled={saving || picked.length === 0}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}