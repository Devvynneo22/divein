/**
 * Flashcard Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.flashcards.*) without
 *          changing any component or hook code.
 */
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { sm2 } from './sm2';
import type {
  Deck,
  Card,
  CardReview,
  CardStatus,
  ReviewQuality,
  CreateDeckInput,
  UpdateDeckInput,
  CreateCardInput,
  UpdateCardInput,
  DeckStats,
} from '@/shared/types/flashcard';

// ─── In-memory store ─────────────────────────────────────────────────────────

let decks: Deck[] = [];
let cards: Card[] = [];
let reviews: CardReview[] = [];

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Returns true if a card is due for review today or earlier. */
function isDueToday(card: Card): boolean {
  const today = startOfDay(new Date());
  const reviewDate = startOfDay(parseISO(card.nextReview));
  return !isAfter(reviewDate, today);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const flashcardService = {
  // ── Decks ──────────────────────────────────────────────────────────────────

  async listDecks(): Promise<Deck[]> {
    return [...decks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async getDeck(id: string): Promise<Deck | null> {
    return decks.find((d) => d.id === id) ?? null;
  },

  async createDeck(input: CreateDeckInput): Promise<Deck> {
    const deck: Deck = {
      id: generateId(),
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      newCardsPerDay: input.newCardsPerDay ?? 20,
      tags: input.tags ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    decks.push(deck);
    return deck;
  },

  async updateDeck(id: string, input: UpdateDeckInput): Promise<Deck> {
    const idx = decks.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Deck ${id} not found`);
    const updated: Deck = { ...decks[idx], ...input, updatedAt: nowIso() };
    decks[idx] = updated;
    return updated;
  },

  async deleteDeck(id: string): Promise<void> {
    decks = decks.filter((d) => d.id !== id);
    // Cascade delete
    const cardIds = cards.filter((c) => c.deckId === id).map((c) => c.id);
    cards = cards.filter((c) => c.deckId !== id);
    reviews = reviews.filter((r) => !cardIds.includes(r.cardId));
  },

  // ── Cards ──────────────────────────────────────────────────────────────────

  async listCards(deckId: string): Promise<Card[]> {
    return cards.filter((c) => c.deckId === deckId);
  },

  async getCard(id: string): Promise<Card | null> {
    return cards.find((c) => c.id === id) ?? null;
  },

  async createCard(input: CreateCardInput): Promise<Card> {
    const card: Card = {
      id: generateId(),
      deckId: input.deckId,
      front: input.front,
      back: input.back,
      sourceNoteId: input.sourceNoteId ?? null,
      tags: input.tags ?? [],
      intervalDays: 0,
      repetitions: 0,
      easeFactor: 2.5,
      nextReview: todayStr(),
      lastReviewed: null,
      status: 'new',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    cards.push(card);
    return card;
  },

  async updateCard(id: string, input: UpdateCardInput): Promise<Card> {
    const idx = cards.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Card ${id} not found`);
    const updated: Card = { ...cards[idx], ...input, updatedAt: nowIso() };
    cards[idx] = updated;
    return updated;
  },

  async deleteCard(id: string): Promise<void> {
    cards = cards.filter((c) => c.id !== id);
    reviews = reviews.filter((r) => r.cardId !== id);
  },

  // ── Study queue helpers ────────────────────────────────────────────────────

  async getDueCards(deckId: string): Promise<Card[]> {
    return cards.filter(
      (c) => c.deckId === deckId && c.status !== 'new' && c.status !== 'suspended' && isDueToday(c),
    );
  },

  async getNewCards(deckId: string, limit: number): Promise<Card[]> {
    return cards.filter((c) => c.deckId === deckId && c.status === 'new').slice(0, limit);
  },

  async getStudyQueue(deckId: string): Promise<Card[]> {
    const deck = decks.find((d) => d.id === deckId);
    const newCardsPerDay = deck?.newCardsPerDay ?? 20;

    const dueCards = cards.filter(
      (c) => c.deckId === deckId && c.status !== 'new' && c.status !== 'suspended' && isDueToday(c),
    );

    const newCards = cards
      .filter((c) => c.deckId === deckId && c.status === 'new')
      .slice(0, newCardsPerDay);

    // Order: learning first, then review (due), then new
    const learning = dueCards.filter((c) => c.status === 'learning');
    const review = dueCards.filter((c) => c.status === 'review');

    return [...learning, ...review, ...newCards];
  },

  async reviewCard(cardId: string, quality: ReviewQuality): Promise<Card> {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) throw new Error(`Card ${cardId} not found`);

    const card = cards[idx];
    const result = sm2(quality, card.repetitions, card.easeFactor, card.intervalDays);

    // Determine new status
    let newStatus: CardStatus;
    if (quality < 3) {
      newStatus = 'learning';
    } else if (result.repetitions <= 1) {
      newStatus = 'learning';
    } else {
      newStatus = 'review';
    }

    const updated: Card = {
      ...card,
      intervalDays: result.intervalDays,
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      nextReview: result.nextReview,
      lastReviewed: format(new Date(), 'yyyy-MM-dd'),
      status: newStatus,
      updatedAt: nowIso(),
    };
    cards[idx] = updated;

    // Record the review
    const review: CardReview = {
      id: generateId(),
      cardId,
      quality,
      intervalDays: result.intervalDays,
      easeFactor: result.easeFactor,
      reviewedAt: nowIso(),
    };
    reviews.push(review);

    return updated;
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  async getDeckStats(deckId: string): Promise<DeckStats> {
    const deckCards = cards.filter((c) => c.deckId === deckId);
    const newCards = deckCards.filter((c) => c.status === 'new').length;
    const learningCards = deckCards.filter((c) => c.status === 'learning').length;
    const reviewCards = deckCards.filter((c) => c.status === 'review').length;

    const dueToday = deckCards.filter(
      (c) => c.status !== 'new' && c.status !== 'suspended' && isDueToday(c),
    ).length;

    return {
      totalCards: deckCards.length,
      newCards,
      learningCards,
      reviewCards,
      dueToday,
    };
  },

  async getTotalDueToday(): Promise<number> {
    return cards.filter(
      (c) => c.status !== 'new' && c.status !== 'suspended' && isDueToday(c),
    ).length;
  },
};
