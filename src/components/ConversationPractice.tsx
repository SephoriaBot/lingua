import { useEffect, useState } from 'react';
import { dbCall, chatCall } from '../lib/api';
import SpeakButton from './SpeakButton';
import type { ConversationPrompt } from '../types';

// `tip` is the optional correction note the tutor adds after a ~~~ line.
interface ChatMsg { role: 'user' | 'assistant'; content: string; tip?: string }

type Level = 'easy' | 'normal' | 'challenge';
const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: 'easy', label: 'Easy', hint: 'Short and simple, only words you know' },
  { id: 'normal', label: 'Normal', hint: 'A gentle stretch' },
  { id: 'challenge', label: 'Challenge', hint: 'Longer replies, new words, fewer hints' },
];

// Remember the last level chosen on this device (storage can be unavailable, so guard it).
function loadLevel(): Level {
  try {
    const v = localStorage.getItem('lingua-level');
    return v === 'easy' || v === 'challenge' ? v : 'normal';
  } catch {
    return 'normal';
  }
}

// Split a raw tutor reply into the conversation part and the correction note.
function splitReply(raw: string): { content: string; tip?: string } {
  const parts = raw.split(/\n?\s*~~~\s*\n?/);
  const content = parts[0].trim();
  const tip = parts.slice(1).join(' ').trim();
  return tip ? { content, tip } : { content };
}

export default function ConversationPractice({
  languageId,
  unlockedDay,
}: {
  languageId: string;
  unlockedDay: number;
}) {
  const [scenarios, setScenarios] = useState<ConversationPrompt[]>([]);
  const [active, setActive] = useState<ConversationPrompt | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [level, setLevel] = useState<Level>(loadLevel);

  function chooseLevel(l: Level) {
    setLevel(l);
    try {
      localStorage.setItem('lingua-level', l);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    dbCall<{ scenarios: ConversationPrompt[] }>('scenarios', { languageId })
      .then((r) => setScenarios(r.scenarios))
      .catch(() => setScenarios([]));
    setActive(null);
  }, [languageId, unlockedDay]);

  function startScenario(prompt: ConversationPrompt) {
    setActive(prompt);
    setMessages([{ role: 'assistant', content: prompt.opening_line }]);
  }

  async function send() {
    if (!input.trim() || !active || sending) return;
    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: input }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      // The server builds the system prompt and talks to Groq; we only send the
      // scenario id and what was said so far. Correction notes (tip) are left out
      // of the history so the tutor doesn't start imitating them.
      const { reply } = await chatCall(
        active.id,
        // Keep the request small: the server accepts at most 20 messages.
        nextMessages.slice(-16).map((m) => ({ role: m.role, content: m.content })),
        level
      );
      const parsed = splitReply(reply);
      setMessages((m) => [...m, { role: 'assistant', ...parsed }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  if (!active) {
    return (
      <div className="card-surface">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--moss-dark)',
            marginTop: 0,
          }}
        >
          {languageId === 'asl' ? 'ASL practice' : 'Pick a scenario'}
        </h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {LEVELS.map((l) => (
            <button
              key={l.id}
              className={level === l.id ? 'btn-primary' : 'btn-secondary'}
              onClick={() => chooseLevel(l.id)}
              style={{ flex: 1, padding: '8px 10px' }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: 4 }}>
          {LEVELS.find((l) => l.id === level)?.hint}
        </p>
        {scenarios.length === 0 && <p style={{ opacity: 0.6 }}>No scenarios yet for this language.</p>}
        {scenarios.map((s) => (
          <div key={s.id} className="deck-list-item" onClick={() => startScenario(s)} role="button">
            <div className="deck-title">{s.scenario}</div>
            <span style={{ opacity: 0.5 }}>→</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card-surface">
      <button className="btn-secondary" onClick={() => setActive(null)} style={{ marginBottom: 16 }}>
        ← Scenarios
      </button>
      <span style={{ marginLeft: 10, fontSize: '0.85rem', opacity: 0.6 }}>
        {LEVELS.find((l) => l.id === level)?.label}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignItems: m.role === 'assistant' ? 'flex-start' : 'flex-end',
            }}
          >
            <div
              className={`chat-bubble ${m.role === 'assistant' ? 'them' : 'me'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ whiteSpace: 'pre-line' }}>{m.content}</span>
            </div>
            {m.tip && (
              <div
                style={{
                  maxWidth: '78%',
                  fontSize: '0.8rem',
                  lineHeight: 1.35,
                  fontStyle: 'italic',
                  opacity: 0.75,
                  padding: '0 6px',
                }}
              >
                💡 {m.tip}
              </div>
            )}
          </div>
        ))}
        {sending && <div className="chat-bubble them" style={{ opacity: 0.6 }}>…</div>}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            languageId === 'asl'
              ? 'Type your ASL gloss or English reply…'
              : 'Type your reply (romaji or English is fine)…'
          }
        />
        <button className="btn-primary" onClick={send} disabled={sending}>
          Send
        </button>
      </div>
    </div>
  );
}