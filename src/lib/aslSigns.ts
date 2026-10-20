// Turns the tutor's ASL gloss line into a row of sign pictures.
// Images live in /public/asl. Single-word signs are found by name automatically
// (HELLO -> /asl/hello.png, GO-TO -> /asl/go_to.png), and fingerspelled words
// (F-O-R-K) use the letter images (/asl/F.png). Signs made of several words in the
// gloss ("THANK YOU") are only matched if they are listed here, so add new
// multi-word signs to this list when you upload their images.
export const MULTI_WORD_SIGNS = new Set<string>(['thank_you']);

export type SignItem = { label: string; src: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const FINGERSPELLED = /^[A-Z](?:-[A-Z])+$/;

export type ParsedAsl = { signs: SignItem[]; cues: string[]; english: string };

// Expected tutor reply: line 1 = gloss (optionally with grammar cues in parentheses),
// line 2 = English in parentheses. Returns null if it doesn't look like that, so the
// caller can fall back to showing plain text.
export function parseAslReply(content: string): ParsedAsl | null {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  const wrapped = (l: string) => /^\(.*\)$/.test(l);
  if (wrapped(lines[0])) return null;

  const cues: string[] = [];
  const stripped = lines[0].replace(/\(([^)]*)\)/g, (_m, c: string) => {
    if (c.trim()) cues.push(c.trim());
    return ' ';
  });
  const tokens = stripped
    .split(/[\s,]+/)
    .map((t) => t.replace(/[?!.:;]+$/g, '').trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const rest = lines.slice(1);
  const english = rest.map((l) => (wrapped(l) ? l.slice(1, -1) : l)).join(' ');

  const signs: SignItem[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i].toUpperCase();
    if (FINGERSPELLED.test(tok)) {
      for (const letter of tok.split('-')) signs.push({ label: letter, src: `/asl/${letter}.png` });
      i += 1;
      continue;
    }
    let took = 1;
    for (const n of [3, 2]) {
      if (i + n <= tokens.length && MULTI_WORD_SIGNS.has(norm(tokens.slice(i, i + n).join('_')))) {
        took = n;
        break;
      }
    }
    const label = tokens.slice(i, i + took).join(' ');
    signs.push({ label, src: `/asl/${norm(tokens.slice(i, i + took).join('_'))}.png` });
    i += took;
  }
  return { signs, cues, english };
}
