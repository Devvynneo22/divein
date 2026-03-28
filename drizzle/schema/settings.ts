import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON-encoded
});

export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').notNull(),
  appliedAt: text('applied_at').notNull().default(sql`(datetime('now'))`),
  description: text('description'),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  color: text('color'),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // create, update, delete
  oldData: text('old_data'), // JSON
  newData: text('new_data'), // JSON
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
