"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityLog = exports.tags = exports.schemaVersion = exports.settings = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.settings = (0, sqlite_core_1.sqliteTable)('settings', {
    key: (0, sqlite_core_1.text)('key').primaryKey(),
    value: (0, sqlite_core_1.text)('value').notNull(), // JSON-encoded
});
exports.schemaVersion = (0, sqlite_core_1.sqliteTable)('schema_version', {
    version: (0, sqlite_core_1.integer)('version').notNull(),
    appliedAt: (0, sqlite_core_1.text)('applied_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    description: (0, sqlite_core_1.text)('description'),
});
exports.tags = (0, sqlite_core_1.sqliteTable)('tags', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    color: (0, sqlite_core_1.text)('color'),
});
exports.activityLog = (0, sqlite_core_1.sqliteTable)('activity_log', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    entityType: (0, sqlite_core_1.text)('entity_type').notNull(),
    entityId: (0, sqlite_core_1.text)('entity_id').notNull(),
    action: (0, sqlite_core_1.text)('action').notNull(), // create, update, delete
    oldData: (0, sqlite_core_1.text)('old_data'), // JSON
    newData: (0, sqlite_core_1.text)('new_data'), // JSON
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
});
