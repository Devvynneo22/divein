"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const projects_1 = require("./projects");
exports.tasks = (0, sqlite_core_1.sqliteTable)('tasks', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: (0, sqlite_core_1.text)('title').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    status: (0, sqlite_core_1.text)('status').notNull().default('inbox'),
    priority: (0, sqlite_core_1.integer)('priority').notNull().default(0),
    projectId: (0, sqlite_core_1.text)('project_id').references(() => projects_1.projects.id, { onDelete: 'set null' }),
    parentId: (0, sqlite_core_1.text)('parent_id').references(() => exports.tasks.id, { onDelete: 'cascade' }),
    dueDate: (0, sqlite_core_1.text)('due_date'),
    startDate: (0, sqlite_core_1.text)('start_date'),
    completedAt: (0, sqlite_core_1.text)('completed_at'),
    recurrence: (0, sqlite_core_1.text)('recurrence'), // JSON string
    sortOrder: (0, sqlite_core_1.real)('sort_order').notNull().default(0),
    tags: (0, sqlite_core_1.text)('tags').notNull().default('[]'), // JSON string
    estimatedMin: (0, sqlite_core_1.integer)('estimated_min'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    statusIdx: (0, sqlite_core_1.index)('idx_tasks_status').on(table.status),
    projectIdx: (0, sqlite_core_1.index)('idx_tasks_project').on(table.projectId),
    parentIdx: (0, sqlite_core_1.index)('idx_tasks_parent').on(table.parentId),
}));
