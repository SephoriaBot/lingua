import { useEffect, useState } from 'react';
import { turso } from '../lib/db/turso';
import SpeakButton from './SpeakButton';
import type { Deck, Card } from '../types';

// Builds a forgiving comparison key: ignores case, accents/tone marks,
// punctuation (¿ ? ¡ ! . , 、 。 etc.) and spacing, so "Ni hao" matches "nǐ hǎo!".
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining accents / tone marks
    .replace(/['’]/g, '')
    .replace(/[\p{P}\p{S}]/gu, ' ') // punctuation and symbols
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Allow a small typo or two on longer phrases; short words must match exactly.
function isCloseEnough(input: string, target: string): boolean {
  const a = normalize(input);
  const b = normalize(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const tolerance = b.length < 5 ? 0 : b.length < 12 ? 1 : b.length < 24 ? 2 : 3;
  return editDistance(a, b) <= tolerance;
}

export default function ListeningDrill({
  languageId,
  userId,
  unlockedDay,
}: {
  languageId: string;
  userId: string;
  unlockedDay: number;
}) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    turso
      .execute({
        sql: 'select * from decks where language_id = ? and sort_order <= ? order by sort_order',
        args: [languageId, unlockedDay],
      })
      .then((res) => setDecks(res.rows as unknown as Deck[]));
    setActiveDeck(null);
  }, [languageId, unlockedDay]);

  async function openDeck(deck: Deck) {
    const res = await turso.execute({
      sql: 'select * from cards where deck_id = ?',
      args: [deck.id],
    });
    // Shuffle so dictation practice doesn't always run in the same order as flashcards.
    const shuffled = [...(res.rows as unknown as Card[])].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setActiveDeck(deck);
    setIndex(0);
    setInput('');
    setResult(null);
  }

  async function logProgress(card: Card, correct: boolean) {
    const nextInterval = correct ? 2 : 0;
    const dueAt = new Date(Date.now() + nextInterval * 86400000).toISOString();
    await turso.execute({
      sql: `insert into card_progress (user_id, card_id, interval_days, due_at, last_reviewed_at)
            values (?, ?, ?, ?, ?)
            on conflict(user_id, card_id) do update set
              interval_days = excluded.interval_days,
              due_at = excluded.due_at,
              last_reviewed_at = excluded.last_reviewed_at`,
      args: [userId, card.id, nextInterval, dueAt, new Date().toISOString()],
    });
  }

  function checkAnswer() {
    const card = cards[index];
    if (!card) return;
    // Accept the reading (pinyin/romanization) OR the written form.
    const targets = [card.pinyin, card.front].filter(Boolean) as string[];
    const isCorrect = targets.some((t) => isCloseEnough(input, t));
    setResult(isCorrect ? 'correct' : 'incorrect');
    logProgress(card, isCorrect);
  }

  function next() {
    setInput('');
    setResult(null);
    setIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
  }

  if (!activeDeck) {
    return (
      <div className="card-surface">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginTop: 0 }}>
          Listening practice — choose a deck
        </h2>
        {decks.length === 0 && <p style={{ opacity: 0.6 }}>No decks yet for this language.</p>}
        {decks.map((deck) => (
          <div key={deck.id} className="deck-list-item" onClick={() => openDeck(deck)} role="button">
            <div>
              <div className="deck-title">{deck.title}</div>
              <div className="deck-desc">{deck.description}</div>
            </div>
            <span style={{ opacity: 0.5 }}>→</span>
          </div>
        ))}
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="card-surface">
      <button className="btn-secondary" onClick={() => setActiveDeck(null)} style={{ marginBottom: 16 }}>
        ← Decks
      </button>
      {card ? (
        <>
          <div className="flashcard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Listen, then type what you hear (romanization is fine; capitalization and punctuation don't matter)</div>
            <SpeakButton text={card.front} languageId={languageId} />

            {result === null ? (
              <>
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && input.trim() && checkAnswer()}
                  placeholder="Type what you heard..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--moss-light, #ccc)',
                    fontSize: '1rem',
                  }}
                />
                <button className="btn-primary" onClick={checkAnswer} disabled={!input.trim()}>
                  Check
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontWeight: 600,
                    color: result === 'correct' ? 'seagreen' : 'firebrick',
                  }}
                >
                  {result === 'correct' ? '✓ Correct' : '✗ Not quite'}
                </div>
                <div className="front" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {card.front}
                  <SpeakButton text={card.front} languageId={languageId} />
                </div>
                {card.pinyin && <div style={{ fontSize: '0.9rem', opacity: 0.65 }}>{card.pinyin}</div>}
                <div style={{ opacity: 0.8 }}>{card.back}</div>
                {result === 'incorrect' && (
                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>You typed: "{input}"</div>
                )}
                <button className="btn-secondary" onClick={next}>
                  Next card →
                </button>
              </>
            )}
          </div>
          <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginTop: 14 }}>
            Card {index + 1} of {cards.length}
          </p>
        </>
      ) : (
        <p>This deck has no cards yet.</p>
      )}
    </div>
  );
}
