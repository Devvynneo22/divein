"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.habitEntries = exports.habits = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.habits = (0, sqlite_core_1.sqliteTable)('habits', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    color: (0, sqlite_core_1.text)('color'),
    icon: (0, sqlite_core_1.text)('icon'),
    frequency: (0, sqlite_core_1.text)('frequency').notNull(), // JSON
    groupName: (0, sqlite_core_1.text)('group_name'),
    target: (0, sqlite_core_1.real)('target').notNull().default(1),
    unit: (0, sqlite_core_1.text)('unit'),
    isArchived: (0, sqlite_core_1.integer)('is_archived', { mode: 'boolean' }).notNull().default(false),
    sortOrder: (0, sqlite_core_1.real)('sort_order').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.habitEntries = (0, sqlite_core_1.sqliteTable)('habit_entries', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    habitId: (0, sqlite_core_1.text)('habit_id').notNull().references(() => exports.habits.id, { onDelete: 'cascade' }),
    date: (0, sqlite_core_1.text)('date').notNull(), // YYYY-MM-DD
    value: (0, sqlite_core_1.real)('value').notNull().default(1),
    note: (0, sqlite_core_1.text)('note'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    habitDateIdx: (0, sqlite_core_1.index)('idx_habit_entries').on(table.habitId, table.date),
    uniqueHabitDate: (0, sqlite_core_1.uniqueIndex)('idx_habit_entries_unique').on(table.habitId, table.date),
}));
