import { useEffect, useState } from 'react';
import { turso } from '../lib/db/turso';
import SpeakButton from './SpeakButton';
import type { Deck, Card } from '../types';

export default function Flashcards({
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
  const [revealed, setRevealed] = useState(false);

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
    setCards(res.rows as unknown as Card[]);
    setActiveDeck(deck);
    setIndex(0);
    setRevealed(false);
  }

  async function grade(quality: 'again' | 'good' | 'easy') {
    const card = cards[index];
    if (card) {
      // Minimal SM-2-style update — tune as you learn what feels right.
      const bump = quality === 'again' ? 0 : quality === 'good' ? 1 : 2.5;
      const nextInterval = quality === 'again' ? 0 : Math.max(1, bump * 2);
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
    setRevealed(false);
    setIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
  }

  if (!activeDeck) {
    return (
      <div className="card-surface">
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--moss-dark)', marginTop: 0 }}>
          Choose a deck
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
          <div className="flashcard" onClick={() => setRevealed((r) => !r)}>
            <div className="front" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {revealed ? card.back : card.front}
                <SpeakButton text={card.front} languageId={languageId} />
              </div>
              {/* Pinyin stays visible whether or not the card is revealed —
                  it's what makes the character readable in the first place. */}
              {card.pinyin && (
                <div style={{ fontSize: '0.9rem', opacity: 0.65 }}>{card.pinyin}</div>
              )}
            </div>
            {revealed && card.example_sentence && (
              <div className="example">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {card.example_sentence}
                  <SpeakButton text={card.example_sentence} languageId={languageId} />
                </span>
                <br />
                {card.example_translation}
              </div>
            )}
            {!revealed && <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>Tap to reveal</div>}
          </div>
          {revealed && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn-secondary" onClick={() => grade('again')}>Again</button>
              <button className="btn-secondary" onClick={() => grade('good')}>Good</button>
              <button className="btn-primary" onClick={() => grade('easy')}>Easy</button>
            </div>
          )}
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
