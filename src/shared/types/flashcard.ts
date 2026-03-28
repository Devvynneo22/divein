export type CardStatus = 'new' | 'learning' | 'review' | 'suspended';

// Full 0-5 quality scale used by SM-2 internally
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Simplified 4-button UI rating
export type UIRating = 'again' | 'hard' | 'good' | 'easy';

export const UI_RATING_QUALITY: Record<UIRating, ReviewQuality> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface Deck {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  newCardsPerDay: number;
  tags: string[]; // parsed from JSON
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  sourceNoteId: string | null;
  tags: string[]; // parsed from JSON
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string; // ISO date (YYYY-MM-DD)
  lastReviewed: string | null;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CardReview {
  id: string;
  cardId: string;
  quality: ReviewQuality;
  intervalDays: number;
  easeFactor: number;
  reviewedAt: string;
}

export interface CreateDeckInput {
  name: string;
  description?: string;
  color?: string;
  newCardsPerDay?: number;
  tags?: string[];
}

export interface UpdateDeckInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  newCardsPerDay?: number;
  tags?: string[];
}

export interface CreateCardInput {
  deckId: string;
  front: string;
  back: string;
  sourceNoteId?: string;
  tags?: string[];
}

export interface UpdateCardInput {
  front?: string;
  back?: string;
  tags?: string[];
  status?: CardStatus;
}

export interface StudySession {
  deckId: string;
  cards: Card[];
  currentIndex: number;
  showingAnswer: boolean;
}

export interface DeckStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
}
