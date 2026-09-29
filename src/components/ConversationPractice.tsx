import { useEffect, useState } from 'react';
import { turso } from '../lib/db/turso';
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
    turso
      .execute({
        sql: 'select * from conversation_prompts where language_id = ? and sort_order <= ? order by sort_order',
        args: [languageId, unlockedDay],
      })
      .then((res) => setScenarios(res.rows as unknown as ConversationPrompt[]));
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
      // Groq call — set VITE_GROQ_API_KEY, or better, proxy this through a
      // server route so the key isn't exposed in the browser bundle.
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                active.system_prompt +
                '\n\nThe learner is a beginner who may not be able to type in the target script. ' +
                'Format every reply as three short lines: (1) the target-language sentence, ' +
                '(2) its romanization/pronunciation if the script is not Latin (e.g. romaji, pinyin), ' +
                '(3) an English translation in parentheses. Keep replies to one or two sentences. ' +
                'The learner may answer in romanization or English; always understand it, ' +
                'gently model the correct target-language phrasing, and keep the conversation going. ' +
                'Never reply with only an ellipsis.',
            },
            ...nextMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data = await res.json();
      const reply =
        data.choices?.[0]?.message?.content?.trim() ||
        `⚠️ No reply from the tutor${data.error?.message ? `: ${data.error.message}` : ` (HTTP ${res.status})`}`;
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ Couldn't reach the tutor: ${String(err)}` }]);
    } finally {
      setSending(false);
    }
  }

  if (!active) {
    return (
      <div className="card-surface">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginTop: 0 }}>
          Pick a scenario
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
          <div key={i} className={`chat-bubble ${m.role === 'assistant' ? 'them' : 'me'}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ whiteSpace: 'pre-line' }}>{m.content}</span>
            {m.role === 'assistant' && <SpeakButton text={m.content} languageId={languageId} />}
          </div>
        ))}
        {sending && <div className="chat-bubble them" style={{ opacity: 0.6 }}>…</div>}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your reply (romaji or English is fine)…"
        />
        <button className="btn-primary" onClick={send} disabled={sending}>
          Send
        </button>
      </div>
    </div>
  );
}
