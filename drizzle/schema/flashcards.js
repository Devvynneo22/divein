"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardReviews = exports.cards = exports.decks = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const notes_1 = require("./notes");
exports.decks = (0, sqlite_core_1.sqliteTable)('decks', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    color: (0, sqlite_core_1.text)('color'),
    newCardsPerDay: (0, sqlite_core_1.integer)('new_cards_per_day').notNull().default(20),
    tags: (0, sqlite_core_1.text)('tags').notNull().default('[]'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.cards = (0, sqlite_core_1.sqliteTable)('cards', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    deckId: (0, sqlite_core_1.text)('deck_id').notNull().references(() => exports.decks.id, { onDelete: 'cascade' }),
    front: (0, sqlite_core_1.text)('front').notNull(),
    back: (0, sqlite_core_1.text)('back').notNull(),
    sourceNoteId: (0, sqlite_core_1.text)('source_note_id').references(() => notes_1.notes.id, { onDelete: 'set null' }),
    tags: (0, sqlite_core_1.text)('tags').notNull().default('[]'),
    // SM-2 algorithm state
    intervalDays: (0, sqlite_core_1.real)('interval_days').notNull().default(0),
    repetitions: (0, sqlite_core_1.integer)('repetitions').notNull().default(0),
    easeFactor: (0, sqlite_core_1.real)('ease_factor').notNull().default(2.5),
    nextReview: (0, sqlite_core_1.text)('next_review').notNull().default((0, drizzle_orm_1.sql) `(date('now'))`),
    lastReviewed: (0, sqlite_core_1.text)('last_reviewed'),
    status: (0, sqlite_core_1.text)('status').notNull().default('new'), // new, learning, review, suspended
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    deckIdx: (0, sqlite_core_1.index)('idx_cards_deck').on(table.deckId),
    reviewIdx: (0, sqlite_core_1.index)('idx_cards_review').on(table.nextReview, table.status),
}));
exports.cardReviews = (0, sqlite_core_1.sqliteTable)('card_reviews', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    cardId: (0, sqlite_core_1.text)('card_id').notNull().references(() => exports.cards.id, { onDelete: 'cascade' }),
    quality: (0, sqlite_core_1.integer)('quality').notNull(), // 0-5
    intervalDays: (0, sqlite_core_1.real)('interval_days').notNull(),
    easeFactor: (0, sqlite_core_1.real)('ease_factor').notNull(),
    reviewedAt: (0, sqlite_core_1.text)('reviewed_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    cardIdx: (0, sqlite_core_1.index)('idx_card_reviews_card').on(table.cardId),
}));
