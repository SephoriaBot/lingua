export type LearningStyle = 'flashcards' | 'grammar' | 'conversation';

export interface Language {
  id: string;
  name: string;
  native_name: string;
  flag_emoji: string;
  sort_order: number;
}

export interface Deck {
  id: string;
  language_id: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  example_sentence: string;
  example_translation: string;
  pinyin?: string;
}

export interface GrammarNote {
  id: string;
  language_id: string;
  title: string;
  explanation: string;
  examples: { target: string; english: string }[];
  sort_order: number;
}

export interface ConversationPrompt {
  id: string;
  language_id: string;
  scenario: string;
  opening_line: string;
  system_prompt: string;
  sort_order: number;
}

export interface CardProgress {
  user_id: string;
  card_id: string;
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
}

export interface UserSettings {
  user_id: string;
  active_language_id: string;
  learning_styles: LearningStyle[];
  started_at: string;
  updated_at: string;
}
