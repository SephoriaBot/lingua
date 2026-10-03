import { useEffect, useState } from 'react';
import { dbCall } from '../lib/api';
import SpeakButton from './SpeakButton';
import type { Deck, Card } from '../types';

export default function Flashcards({
  languageId,
  unlockedDay,
}: {
  languageId: string;
  unlockedDay: number;
}) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    dbCall<{ decks: Deck[] }>('decks', { languageId })
      .then((r) => setDecks(r.decks))
      .catch(() => setDecks([]));
    setActiveDeck(null);
  }, [languageId, unlockedDay]);

  async function openDeck(deck: Deck) {
    const res = await dbCall<{ cards: Card[] }>('cards', { deckId: deck.id });
    setCards(res.cards);
    setActiveDeck(deck);
    setIndex(0);
    setRevealed(false);
  }

  function go(delta: number) {
    setRevealed(false);
    setIndex((i) => (i + delta + cards.length) % cards.length);
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
              {(card.romaji || card.pinyin) && (
                <div style={{ fontSize: '0.9rem', opacity: 0.65 }}>{card.romaji || card.pinyin}</div>
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-secondary" onClick={() => go(-1)} aria-label="Previous card">‹</button>
            <button className="btn-secondary" onClick={() => go(1)} aria-label="Next card">›</button>
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
