import { useState } from 'react';
import type { LearningStyle } from '../types';

const OPTIONS: { key: LearningStyle; label: string; blurb: string }[] = [
  { key: 'flashcards', label: 'Flashcards', blurb: 'Quick recall drills with spaced repetition.' },
  { key: 'listening', label: 'Listening', blurb: 'Hear a word or phrase and type what you heard.' },
  { key: 'grammar', label: 'Grammar notes', blurb: 'Short explanations with worked examples.' },
  { key: 'conversation', label: 'Conversation', blurb: 'Chat with an AI partner in scenarios.' },
];

export default function StyleSelector({
  initial,
  onSave,
}: {
  initial: LearningStyle[];
  onSave: (styles: LearningStyle[]) => void;
}) {
  const [selected, setSelected] = useState<LearningStyle[]>(initial);

  function toggle(key: LearningStyle) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  }

  return (
    <div className="card-surface">
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginTop: 0 }}>
        How do you want to learn?
      </h2>
      <p style={{ opacity: 0.7, marginTop: -8 }}>Pick as many as you like — you can change this anytime.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        {OPTIONS.map((opt) => (
          <label
            key={opt.key}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              border: `1.5px solid ${selected.includes(opt.key) ? 'var(--moss)' : 'var(--sage)'}`,
              background: selected.includes(opt.key) ? 'var(--sage)' : '#fff',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.key)}
              onChange={() => toggle(opt.key)}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--moss-dark)' }}>{opt.label}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{opt.blurb}</div>
            </div>
          </label>
        ))}
      </div>
      <button
        className="btn-primary"
        disabled={selected.length === 0}
        onClick={() => onSave(selected)}
        style={{ opacity: selected.length === 0 ? 0.5 : 1 }}
      >
        Start learning
      </button>
    </div>
  );
}
