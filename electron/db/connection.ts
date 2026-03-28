import { app } from 'electron';
import { join } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../drizzle/schema';
import { existsSync, mkdirSync } from 'fs';

const userDataPath = app.getPath('userData');
const dbDir = join(userDataPath, 'db');

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'nexus.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for performance and reliability
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
