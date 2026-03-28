/**
 * Global Search Service
 *
 * Searches across all content types in parallel and returns unified results.
 */

import { taskService } from './taskService';
import { noteService } from './noteService';
import { eventService } from './eventService';
import { habitService } from './habitService';
import { flashcardService } from './flashcardService';
import { tableService } from './tableService';
import { projectService } from './projectService';

export type SearchResultType = 'Task' | 'Note' | 'Event' | 'Habit' | 'Deck' | 'Table' | 'Project';

export interface SearchResult {
  id: string;
  title: string;
  type: SearchResultType;
  route: string;       // where to navigate
}

function fuzzyMatch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const [tasks, notes, events, habits, decks, tables, projects] = await Promise.all([
    taskService.list().catch(() => []),
    noteService.list().catch(() => []),
    eventService.list().catch(() => []),
    habitService.list().catch(() => []),
    flashcardService.listDecks().catch(() => []),
    tableService.listTables().catch(() => []),
    projectService.list().catch(() => []),
  ]);

  const results: SearchResult[] = [];

  for (const t of tasks) {
    if (fuzzyMatch(t.title, query)) {
      results.push({ id: t.id, title: t.title, type: 'Task', route: '/tasks' });
    }
  }
  for (const n of notes) {
    if (fuzzyMatch(n.title, query)) {
      results.push({ id: n.id, title: n.title, type: 'Note', route: '/notes' });
    }
  }
  for (const e of events) {
    if (fuzzyMatch(e.title, query)) {
      results.push({ id: e.id, title: e.title, type: 'Event', route: '/calendar' });
    }
  }
  for (const h of habits) {
    if (fuzzyMatch(h.name, query)) {
      results.push({ id: h.id, title: h.name, type: 'Habit', route: '/habits' });
    }
  }
  for (const d of decks) {
    if (fuzzyMatch(d.name, query)) {
      results.push({ id: d.id, title: d.name, type: 'Deck', route: '/flashcards' });
    }
  }
  for (const tb of tables) {
    if (fuzzyMatch(tb.name, query)) {
      results.push({ id: tb.id, title: tb.name, type: 'Table', route: '/tables' });
    }
  }
  for (const p of projects) {
    if (fuzzyMatch(p.name, query)) {
      results.push({ id: p.id, title: p.name, type: 'Project', route: '/projects' });
    }
  }

  return results;
}
