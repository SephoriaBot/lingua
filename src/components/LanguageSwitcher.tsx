import type { Language } from '../types';

const flagImages: Record<string, string> = {
  '🇺🇸': '/USA.png',
  '🇬🇧': '/UK.png',
  '🇫🇷': '/France.png',
  '🇩🇪': '/Germany.png',
  '🇮🇹': '/Italy.png',
  '🇪🇸': '/Spain.png',
  '🇯🇵': '/Japan.png',
  '🇨🇳': '/China.png',
  '🇰🇷': '/South_Korea.png',
  '🇲🇽': '/Mexico.png',
  '🇨🇦': '/Canada.png',
  '🇦🇺': '/Australia.png',
  '🇮🇳': '/India.png',
  '🇧🇷': '/Brazil.png',
  '🇿🇦': '/South_Africa.png',
  '🤟': '/asl.png',
};

function FlagImage({ emoji }: { emoji: string }) {
  const src = flagImages[emoji];

  if (!src) return <span>{emoji}</span>;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="language-flag"
    />
  );
}

export default function LanguageSwitcher({
  languages,
  activeId,
  onChange,
}: {
  languages: Language[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="pill-row">
      {languages.map((lang) => (
        <button
          key={lang.id}
          className={`pill ${lang.id === activeId ? 'active' : ''}`}
          onClick={() => onChange(lang.id)}
        >
          <FlagImage emoji={lang.flag_emoji} />
          {' '}
          {lang.name}
        </button>
      ))}
    </div>
  );
}