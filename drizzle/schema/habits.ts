import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'),
  icon: text('icon'),
  frequency: text('frequency').notNull(), // JSON
  groupName: text('group_name'),
  target: real('target').notNull().default(1),
  unit: text('unit'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const habitEntries = sqliteTable('habit_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  habitId: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  value: real('value').notNull().default(1),
  note: text('note'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  habitDateIdx: index('idx_habit_entries').on(table.habitId, table.date),
  uniqueHabitDate: uniqueIndex('idx_habit_entries_unique').on(table.habitId, table.date),
}));
