import { useEffect, useState } from 'react';
import { dbCall, chatCall } from '../lib/api';
import SpeakButton from './SpeakButton';
import type { ConversationPrompt } from '../types';
import { parseAslReply, signSrc, type SignItem } from '../lib/aslSigns';

// `tip` is the optional correction note the tutor adds after a ~~~ line.
// `signs` is set when the learner built the reply by tapping signs (shown as pictures).
interface ChatMsg { role: 'user' | 'assistant'; content: string; tip?: string; signs?: string[] }

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

// One sign as a picture. If the image can't be loaded (a sign we have no picture for yet),
// it falls back to a plain text tile so nothing goes missing.
function SignTile({ item, size = 76 }: { item: SignItem; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = {
    width: size,
    minHeight: size,
    borderRadius: 12,
    border: '1px solid rgba(128,128,128,0.3)',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box' as const,
  };
  if (failed) {
    return (
      <div style={{ ...box, padding: 6, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', color: '#333' }}>
        {item.label}
      </div>
    );
  }
  return (
    <div style={box}>
      <img
        src={item.src}
        alt={`ASL sign: ${item.label}`}
        title={item.label}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: size - 6, objectFit: 'contain', borderRadius: 10 }}
      />
    </div>
  );
}

// The ASL partner's message: a row of sign pictures, with the grammar cue and the
// English translation tucked behind a small button.
function AslBubble({ content }: { content: string }) {
  const [showEnglish, setShowEnglish] = useState(false);
  const parsed = parseAslReply(content);
  if (!parsed) return <span style={{ whiteSpace: 'pre-line' }}>{content}</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {parsed.signs.map((sg, i) => (
          <SignTile key={i} item={sg} />
        ))}
      </div>
      {parsed.cues.length > 0 && (
        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.75 }}>{parsed.cues.join(' · ')}</div>
      )}
      {parsed.english && (
        <>
          <button
            className="btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={() => setShowEnglish((v) => !v)}
          >
            {showEnglish ? 'Hide English' : 'Show English'}
          </button>
          {showEnglish && <div style={{ fontSize: '0.9rem' }}>{parsed.english}</div>}
        </>
      )}
    </div>
  );
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
  const isASL = languageId === 'asl';
  // ASL: the signs unlocked so far, and the reply being built by tapping them.
  const [palette, setPalette] = useState<SignItem[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

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

  useEffect(() => {
    if (!isASL) return;
    dbCall<{ signs: { gloss: string; media_url: string | null; media_type: string | null }[] }>('signs', {
      languageId,
    })
      .then((r) => {
        const seen = new Set<string>();
        const items: SignItem[] = [];
        for (const s of r.signs) {
          const label = String(s.gloss).trim();
          const key = label.toLowerCase();
          if (!label || seen.has(key)) continue;
          seen.add(key);
          const useUploaded = s.media_url && s.media_type !== 'video';
          items.push({ label, src: useUploaded ? String(s.media_url) : signSrc(label) });
        }
        // Whole signs first, single letters (fingerspelling) after.
        const isLetter = (i: SignItem) => /^[A-Za-z]$/.test(i.label);
        setPalette([...items.filter((i) => !isLetter(i)), ...items.filter(isLetter)]);
      })
      .catch(() => setPalette([]));
  }, [languageId, unlockedDay, isASL]);

  function startScenario(prompt: ConversationPrompt) {
    setPicked([]);
    setActive(prompt);
    setMessages([{ role: 'assistant', content: prompt.opening_line }]);
  }

  async function send() {
    const text = picked.length > 0 ? picked.join(' ') : input.trim();
    if (!text || !active || sending) return;
    const nextMessages: ChatMsg[] = [
      ...messages,
      { role: 'user', content: text, ...(picked.length > 0 ? { signs: picked } : {}) },
    ];
    setMessages(nextMessages);
    setInput('');
    setPicked([]);
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
      <button
  className="btn-secondary"
  onClick={() => setActive(null)}
  style={{
    marginBottom: 16,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }}
>
  <img
    src="/compass.png"
    alt=""
    aria-hidden="true"
    style={{ width: 20, height: 20, objectFit: 'contain' }}
  />
  Scenarios
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
              {isASL && m.role === 'assistant' && !m.content.startsWith('⚠️') ? (
                <AslBubble content={m.content} />
              ) : m.signs ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                  {m.signs.map((g, i) => (
                    <SignTile key={i} item={{ label: g, src: signSrc(g) }} size={64} />
                  ))}
                </div>
              ) : (
                <span style={{ whiteSpace: 'pre-line' }}>{m.content}</span>
              )}
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
      {isASL && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: 6 }}>
            Tap signs to build your reply
          </div>
          {picked.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              {picked.map((g, i) => (
                <button
                  key={i}
                  aria-label={`Remove ${g}`}
                  onClick={() => setPicked((p) => p.filter((_, j) => j !== i))}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <SignTile item={{ label: g, src: signSrc(g) }} size={56} />
                </button>
              ))}
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => setPicked([])}>
                Clear
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
            {palette.map((sg) => (
              <button
                key={sg.label}
                aria-label={`Add ${sg.label}`}
                onClick={() => setPicked((p) => (p.length < 12 ? [...p, sg.label] : p))}
                style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <SignTile item={sg} size={56} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={
            languageId === 'asl'
              ? 'Or type your reply (ASL gloss or English)…'
              : 'Type your reply (romaji or English is fine)…'
          }
        />
        <button className="btn-primary" onClick={send} disabled={sending}>
  <img
    src="/send.png"
    alt=""
    aria-hidden="true"
    style={{ width: 20, height: 20, objectFit: 'contain' }}
  />
  Send
</button>
      </div>
    </div>
  );
}