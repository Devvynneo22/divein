import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { notes } from './notes';

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  newCardsPerDay: integer('new_cards_per_day').notNull().default(20),
  tags: text('tags').notNull().default('[]'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  deckId: text('deck_id').notNull().references(() => decks.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  sourceNoteId: text('source_note_id').references(() => notes.id, { onDelete: 'set null' }),
  tags: text('tags').notNull().default('[]'),
  // SM-2 algorithm state
  intervalDays: real('interval_days').notNull().default(0),
  repetitions: integer('repetitions').notNull().default(0),
  easeFactor: real('ease_factor').notNull().default(2.5),
  nextReview: text('next_review').notNull().default(sql`(date('now'))`),
  lastReviewed: text('last_reviewed'),
  status: text('status').notNull().default('new'), // new, learning, review, suspended
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  deckIdx: index('idx_cards_deck').on(table.deckId),
  reviewIdx: index('idx_cards_review').on(table.nextReview, table.status),
}));

export const cardReviews = sqliteTable('card_reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cardId: text('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  quality: integer('quality').notNull(), // 0-5
  intervalDays: real('interval_days').notNull(),
  easeFactor: real('ease_factor').notNull(),
  reviewedAt: text('reviewed_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  cardIdx: index('idx_card_reviews_card').on(table.cardId),
}));
