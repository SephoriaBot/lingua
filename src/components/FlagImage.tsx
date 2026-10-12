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

export function FlagImage({ emoji }: { emoji: string }) {
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