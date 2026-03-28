import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const events = sqliteTable('events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
  location: text('location'),
  color: text('color'),
  category: text('category'),
  recurrence: text('recurrence'), // JSON
  reminders: text('reminders').notNull().default('[]'), // JSON
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  timeIdx: index('idx_events_time').on(table.startTime, table.endTime),
}));
