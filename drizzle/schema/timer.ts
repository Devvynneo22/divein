import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { tasks } from './tasks';
import { projects } from './projects';

export const timeEntries = sqliteTable('time_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  description: text('description'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  durationSec: integer('duration_sec'),
  isPomodoro: integer('is_pomodoro', { mode: 'boolean' }).notNull().default(false),
  isRunning: integer('is_running', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  taskIdx: index('idx_time_task').on(table.taskId),
  startIdx: index('idx_time_start').on(table.startTime),
}));
