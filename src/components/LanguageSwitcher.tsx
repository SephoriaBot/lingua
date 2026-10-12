import type { Language } from '../types';
import { FlagImage } from './FlagImage';

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