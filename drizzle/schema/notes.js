"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notes = exports.noteFolders = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const projects_1 = require("./projects");
exports.noteFolders = (0, sqlite_core_1.sqliteTable)('note_folders', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull(),
    parentId: (0, sqlite_core_1.text)('parent_id').references(() => exports.noteFolders.id, { onDelete: 'cascade' }),
    sortOrder: (0, sqlite_core_1.real)('sort_order').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.notes = (0, sqlite_core_1.sqliteTable)('notes', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: (0, sqlite_core_1.text)('title').notNull(),
    content: (0, sqlite_core_1.text)('content'), // TipTap JSON document
    contentText: (0, sqlite_core_1.text)('content_text'), // Plain text extraction (for search)
    folderId: (0, sqlite_core_1.text)('folder_id').references(() => exports.noteFolders.id, { onDelete: 'set null' }),
    projectId: (0, sqlite_core_1.text)('project_id').references(() => projects_1.projects.id, { onDelete: 'set null' }),
    isPinned: (0, sqlite_core_1.integer)('is_pinned', { mode: 'boolean' }).notNull().default(false),
    isArchived: (0, sqlite_core_1.integer)('is_archived', { mode: 'boolean' }).notNull().default(false),
    tags: (0, sqlite_core_1.text)('tags').notNull().default('[]'), // JSON array
    wordCount: (0, sqlite_core_1.integer)('word_count').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    folderIdx: (0, sqlite_core_1.index)('idx_notes_folder').on(table.folderId),
    projectIdx: (0, sqlite_core_1.index)('idx_notes_project').on(table.projectId),
}));
