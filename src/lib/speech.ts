// Maps a language row's id to a BCP-47 tag speechSynthesis understands.
// Add an entry here whenever a new language is added to the languages table.
const LANGUAGE_TO_BCP47: Record<string, string> = {
  es: 'es-ES',
  zh: 'zh-CN',
  fr: 'fr-FR',
};

export function speak(text: string, languageId: string) {
  if (!('speechSynthesis' in window) || !text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGE_TO_BCP47[languageId] ?? languageId;
  utterance.rate = 0.9; // a touch slower than natural speed, easier to follow while learning
  window.speechSynthesis.cancel(); // stop anything currently playing before starting new
  window.speechSynthesis.speak(utterance);
}
