/**
 * NLP Quick Add parser
 *
 * Parses a natural-language task string like:
 *   "Finish presentation tomorrow at 5pm #work P1"
 *
 * Returns structured data + the cleaned title (with parsed parts stripped).
 */
import * as chrono from 'chrono-node';
import type { TaskPriority } from '@/shared/types/task';

export interface ParsedQuickAdd {
  /** Cleaned title with tags/priority/date snippets removed */
  title: string;
  /** ISO date string if a date was found, else null */
  dueDate: string | null;
  /** Extracted tags (without the # prefix) */
  tags: string[];
  /** Priority 1–4, or null if not found */
  priority: TaskPriority | null;
  /** Original raw input */
  raw: string;
}

const PRIORITY_MAP: Record<string, TaskPriority> = {
  p1: 4,  // P1 → Urgent (highest)
  p2: 3,  // P2 → High
  p3: 2,  // P3 → Medium
  p4: 1,  // P4 → Low
};

/**
 * Extract priority flag (P1/P2/P3/P4, case-insensitive, standalone word).
 * Returns { priority, remaining } — remaining is the input with the token removed.
 */
function extractPriority(text: string): { priority: TaskPriority | null; remaining: string } {
  const match = text.match(/\b(P[1-4])\b/i);
  if (!match) return { priority: null, remaining: text };
  const priority = PRIORITY_MAP[match[1].toLowerCase()];
  const remaining = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
  return { priority, remaining };
}

/**
 * Extract all #tags (word characters after #, standalone).
 * Returns { tags, remaining }.
 */
function extractTags(text: string): { tags: string[]; remaining: string } {
  const tags: string[] = [];
  const remaining = text
    .replace(/#(\w+)/g, (_match, tag: string) => {
      tags.push(tag);
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { tags, remaining };
}

/**
 * Parses a natural-language task string into structured data.
 */
export function parseQuickAdd(raw: string): ParsedQuickAdd {
  let working = raw;

  // 1. Extract priority
  const { priority, remaining: afterPriority } = extractPriority(working);
  working = afterPriority;

  // 2. Extract tags
  const { tags, remaining: afterTags } = extractTags(working);
  working = afterTags;

  // 3. Parse date with chrono-node
  let dueDate: string | null = null;
  const parsed = chrono.parse(working, new Date(), { forwardDate: true });
  if (parsed.length > 0) {
    const result = parsed[0];
    const date = result.start.date();
    dueDate = date.toISOString();

    // Remove the date text from the working string
    const dateText = result.text;
    working = working
      .replace(dateText, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // 4. Clean up leftover punctuation/whitespace at boundaries
  const title = working.replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, '').trim() || raw.trim();

  return { title, dueDate, tags, priority, raw };
}
