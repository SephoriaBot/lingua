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

export function FlagImage({
  emoji,
  size = 24,
}: {
  emoji: string;
  size?: number;
}) {
  const src = flagImages[emoji];

  if (!src) return <span>{emoji}</span>;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        width: size * 1.4,
        height: size,
        objectFit: 'contain',
        verticalAlign: 'middle',
        display: 'inline-block',
      }}
    />
  );
}