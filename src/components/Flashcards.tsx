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

  const isASL = languageId === 'asl';

  useEffect(() => {
    dbCall<{ decks: Deck[] }>('decks', { languageId })
      .then((r) => setDecks(r.decks))
      .catch(() => setDecks([]));

    setActiveDeck(null);
  }, [languageId, unlockedDay]);

  async function openDeck(deck: Deck) {
    const res = await dbCall<{ cards: Card[] }>('cards', {
      deckId: deck.id,
    });

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
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--moss-dark)',
            marginTop: 0,
          }}
        >
          {isASL ? 'Choose a lesson' : 'Choose a deck'}
        </h2>

        {isASL && (
          <p style={{ opacity: 0.65, marginTop: -4 }}>
            Learn the signs, then practice them yourself.
          </p>
        )}

        {decks.length === 0 && (
          <p style={{ opacity: 0.6 }}>
            No lessons yet for this language.
          </p>
        )}

        {decks.map((deck) => (
          <div
            key={deck.id}
            className="deck-list-item"
            onClick={() => openDeck(deck)}
            role="button"
          >
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
      <button
        className="btn-secondary"
        onClick={() => setActiveDeck(null)}
        style={{ marginBottom: 16 }}
      >
        ← {isASL ? 'Lessons' : 'Decks'}
      </button>

      {card ? (
        <>
          <div
            className="flashcard"
            onClick={() => setRevealed((r) => !r)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {!revealed ? (
              <>
                <div
                  style={{
                    fontSize: isASL ? '2.2rem' : undefined,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {card.front}
                </div>

                {!isASL && (
                  <SpeakButton
                    text={card.front}
                    languageId={languageId}
                  />
                )}

                {(card.romaji || card.pinyin) && (
                  <div
                    style={{
                      fontSize: '0.9rem',
                      opacity: 0.65,
                    }}
                  >
                    {card.romaji || card.pinyin}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.85rem',
                    opacity: 0.5,
                    marginTop: 8,
                  }}
                >
                  Tap to reveal
                </div>
              </>
            ) : (
              <>
{isASL && card.media_url && card.media_type !== 'video' && (
                  <img
                    src={card.media_url}
                    alt={`ASL sign for ${card.front}`}
                    loading="lazy"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 220,
                      objectFit: 'contain',
                      borderRadius: 12,
                    }}
                  />
                )}

                {isASL && card.media_url && card.media_type === 'video' && (
                  <a
                    href={card.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="asl-sign-button"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🤟 Watch the sign
                  </a>
                )}

                {isASL && card.gloss && (
                  <div
                    style={{
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      opacity: 0.55,
                    }}
                  >
                    ASL GLOSS
                  </div>
                )}

                <div
                  style={{
                    fontSize: isASL ? '1.8rem' : undefined,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {card.back}
                </div>

                {isASL && card.gloss && (
                  <div
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 600,
                      opacity: 0.8,
                      textAlign: 'center',
                    }}
                  >
                    {card.gloss}
                  </div>
                )}

                {card.example_sentence && (
                  <div
                    className="example"
                    style={{
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    <div>{card.example_sentence}</div>

                    <div
                      style={{
                        opacity: 0.7,
                        marginTop: 4,
                      }}
                    >
                      {card.example_translation}
                    </div>

                    {!isASL && (
                      <SpeakButton
                        text={card.example_sentence}
                        languageId={languageId}
                      />
                    )}
                  </div>
                )}

                {isASL && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      opacity: 0.55,
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    Practice the sign yourself.
                  </div>
                )}
              </>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
              marginTop: 16,
            }}
          >
            <button
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous card"
            >
              ‹
            </button>

            <button
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next card"
            >
              ›
            </button>
          </div>

          <p
            style={{
              textAlign: 'center',
              opacity: 0.5,
              fontSize: '0.85rem',
              marginTop: 14,
            }}
          >
            Card {index + 1} of {cards.length}
          </p>
        </>
      ) : (
        <p>This lesson has no cards yet.</p>
      )}
    </div>
  );
}
