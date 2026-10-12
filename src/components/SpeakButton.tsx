import { speak } from '../lib/speech';

// A small inline speaker icon. Click to hear `text` read aloud in `languageId`.
// stopPropagation matters here since these buttons often sit inside a
// clickable card (e.g. the flashcard itself flips on click).
export default function SpeakButton({
  text,
  languageId,
  label,
}: {
  text: string;
  languageId: string;
  label?: string;
}) {
  return (
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    speak(text, languageId);
  }}
  aria-label={label ?? `Listen to "${text}"`}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '2px 6px',
    opacity: 0.75,
  }}
>
  <img
    src="/speakbutton.png"
    alt=""
    aria-hidden="true"
    style={{
      width: '22px',
      height: '22px',
      objectFit: 'contain',
      display: 'block',
    }}
  />
</button>
  );
}
