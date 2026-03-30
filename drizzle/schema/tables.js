"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableRows = exports.tableDefs = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const projects_1 = require("./projects");
exports.tableDefs = (0, sqlite_core_1.sqliteTable)('table_defs', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    projectId: (0, sqlite_core_1.text)('project_id').references(() => projects_1.projects.id, { onDelete: 'set null' }),
    icon: (0, sqlite_core_1.text)('icon'),
    columns: (0, sqlite_core_1.text)('columns').notNull().default('[]'), // JSON
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
exports.tableRows = (0, sqlite_core_1.sqliteTable)('table_rows', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    tableId: (0, sqlite_core_1.text)('table_id').notNull().references(() => exports.tableDefs.id, { onDelete: 'cascade' }),
    data: (0, sqlite_core_1.text)('data').notNull().default('{}'), // JSON
    sortOrder: (0, sqlite_core_1.real)('sort_order').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    tableIdx: (0, sqlite_core_1.index)('idx_table_rows').on(table.tableId),
}));
