import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';


export const noteFolders = sqliteTable('note_folders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): any => noteFolders.id, { onDelete: 'cascade' }),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content'),                               // TipTap JSON document
  contentText: text('content_text'),                       // Plain text extraction (for search)
  folderId: text('folder_id').references(() => noteFolders.id, { onDelete: 'set null' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  tags: text('tags').notNull().default('[]'),              // JSON array
  wordCount: integer('word_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  folderIdx: index('idx_notes_folder').on(table.folderId),
  projectIdx: index('idx_notes_project').on(table.projectId),
}));
