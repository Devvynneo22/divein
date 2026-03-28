import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('inbox'),
  priority: integer('priority').notNull().default(0),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  parentId: text('parent_id').references((): any => tasks.id, { onDelete: 'cascade' }),
  dueDate: text('due_date'),
  startDate: text('start_date'),
  completedAt: text('completed_at'),
  recurrence: text('recurrence'),           // JSON string
  sortOrder: real('sort_order').notNull().default(0),
  tags: text('tags').notNull().default('[]'), // JSON string
  estimatedMin: integer('estimated_min'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  statusIdx: index('idx_tasks_status').on(table.status),
  projectIdx: index('idx_tasks_project').on(table.projectId),
  parentIdx: index('idx_tasks_parent').on(table.parentId),
}));
