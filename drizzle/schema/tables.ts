import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';

export const tableDefs = sqliteTable('table_defs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  icon: text('icon'),
  columns: text('columns').notNull().default('[]'), // JSON
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const tableRows = sqliteTable('table_rows', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableId: text('table_id').notNull().references(() => tableDefs.id, { onDelete: 'cascade' }),
  data: text('data').notNull().default('{}'), // JSON
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  tableIdx: index('idx_table_rows').on(table.tableId),
}));
