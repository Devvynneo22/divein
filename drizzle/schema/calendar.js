"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.events = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const projects_1 = require("./projects");
exports.events = (0, sqlite_core_1.sqliteTable)('events', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: (0, sqlite_core_1.text)('title').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    startTime: (0, sqlite_core_1.text)('start_time').notNull(),
    endTime: (0, sqlite_core_1.text)('end_time'),
    allDay: (0, sqlite_core_1.integer)('all_day', { mode: 'boolean' }).notNull().default(false),
    location: (0, sqlite_core_1.text)('location'),
    color: (0, sqlite_core_1.text)('color'),
    category: (0, sqlite_core_1.text)('category'),
    recurrence: (0, sqlite_core_1.text)('recurrence'), // JSON
    reminders: (0, sqlite_core_1.text)('reminders').notNull().default('[]'), // JSON
    projectId: (0, sqlite_core_1.text)('project_id').references(() => projects_1.projects.id, { onDelete: 'set null' }),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    timeIdx: (0, sqlite_core_1.index)('idx_events_time').on(table.startTime, table.endTime),
}));
