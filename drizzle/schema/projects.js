"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projects = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.projects = (0, sqlite_core_1.sqliteTable)('projects', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    color: (0, sqlite_core_1.text)('color'),
    icon: (0, sqlite_core_1.text)('icon'),
    status: (0, sqlite_core_1.text)('status').notNull().default('active'),
    sortOrder: (0, sqlite_core_1.real)('sort_order').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
