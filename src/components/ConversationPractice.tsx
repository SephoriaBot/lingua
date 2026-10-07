import { useEffect, useState } from 'react';
import { dbCall, chatCall } from '../lib/api';
import SpeakButton from './SpeakButton';
import type { ConversationPrompt } from '../types';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

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
      // scenario id and what was said so far.
      const { reply } = await chatCall(
        active.id,
        // Keep the request small: the server accepts at most 20 messages.
        nextMessages.slice(-16).map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
       {messages.map((m, i) => (
  <div
    key={i}
    className={`chat-bubble ${m.role === 'assistant' ? 'them' : 'me'}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}
  >
    <span style={{ whiteSpace: 'pre-line' }}>
      {m.content}
    </span>
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
