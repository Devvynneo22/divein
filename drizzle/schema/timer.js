"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeEntries = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
const tasks_1 = require("./tasks");
const projects_1 = require("./projects");
exports.timeEntries = (0, sqlite_core_1.sqliteTable)('time_entries', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    taskId: (0, sqlite_core_1.text)('task_id').references(() => tasks_1.tasks.id, { onDelete: 'set null' }),
    projectId: (0, sqlite_core_1.text)('project_id').references(() => projects_1.projects.id, { onDelete: 'set null' }),
    description: (0, sqlite_core_1.text)('description'),
    startTime: (0, sqlite_core_1.text)('start_time').notNull(),
    endTime: (0, sqlite_core_1.text)('end_time'),
    durationSec: (0, sqlite_core_1.integer)('duration_sec'),
    isPomodoro: (0, sqlite_core_1.integer)('is_pomodoro', { mode: 'boolean' }).notNull().default(false),
    isRunning: (0, sqlite_core_1.integer)('is_running', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `(datetime('now'))`),
}, (table) => ({
    taskIdx: (0, sqlite_core_1.index)('idx_time_task').on(table.taskId),
    startIdx: (0, sqlite_core_1.index)('idx_time_start').on(table.startTime),
}));
