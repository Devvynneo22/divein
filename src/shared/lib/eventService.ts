import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/shared/types/event';
import { expandOccurrences } from '@/shared/lib/recurrenceUtils';
import { parseISO, differenceInMilliseconds, addMilliseconds, format, subMonths, addMonths } from 'date-fns';

const STORAGE_KEY = 'nexus-events';

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore storage errors
  }
}

let events: CalendarEvent[] = loadEvents();

function generateId(): string { return crypto.randomUUID(); }
function now(): string { return new Date().toISOString(); }

/**
 * Expand a recurring event into virtual occurrences within [rangeStart, rangeEnd].
 * Each virtual occurrence gets id = `{baseId}_{YYYY-MM-DD}`.
 */
function expandRecurring(event: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!event.recurrence) return [event];

  const occurrenceDates = expandOccurrences(
    event.startTime,
    event.recurrence,
    rangeStart,
    rangeEnd,
  );

  // Duration of the original event (for computing end times)
  const baseDuration = event.endTime
    ? differenceInMilliseconds(parseISO(event.endTime), parseISO(event.startTime))
    : null;

  return occurrenceDates.map((dateStr) => {
    const dateKey = format(parseISO(dateStr), 'yyyy-MM-dd');
    const exceptions = event.exceptions ?? {};
    const exception = exceptions[dateKey];

    const occurrenceStart = dateStr;
    const occurrenceEnd = baseDuration !== null
      ? addMilliseconds(parseISO(dateStr), baseDuration).toISOString()
      : null;

    // Skip deleted exceptions
    if (exception && (exception as Record<string, unknown>).title === '__DELETED__') return null;

    const occurrence: CalendarEvent = {
      ...event,
      id: `${event.id}_${dateKey}`,
      startTime: occurrenceStart,
      endTime: occurrenceEnd,
      // Apply exception overrides if any
      ...(exception ? exception : {}),
    };
    return occurrence;
  }).filter((o): o is CalendarEvent => o !== null);
}

/** Parse a virtual occurrence ID into base ID and date key */
function parseOccurrenceId(id: string): { baseId: string; dateKey: string | null } {
  const match = id.match(/^(.+)_(\d{4}-\d{2}-\d{2})$/);
  if (match) return { baseId: match[1], dateKey: match[2] };
  return { baseId: id, dateKey: null };
}

export const eventService = {
  async list(start?: string, end?: string): Promise<CalendarEvent[]> {
    const rangeStart = start ? parseISO(start) : subMonths(new Date(), 3);
    const rangeEnd = end ? parseISO(end) : addMonths(new Date(), 3);

    const result: CalendarEvent[] = [];
    for (const event of events) {
      if (event.recurrence) {
        result.push(...expandRecurring(event, rangeStart, rangeEnd));
      } else {
        // Non-recurring: proper date overlap check
        const eventStart = parseISO(event.startTime);
        const eventEnd = event.endTime ? parseISO(event.endTime) : eventStart;
        // Event overlaps range if: eventStart <= rangeEnd AND eventEnd >= rangeStart
        if (eventStart > rangeEnd) continue;
        if (eventEnd < rangeStart) continue;
        result.push(event);
      }
    }

    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  async get(id: string): Promise<CalendarEvent | null> {
    const { baseId } = parseOccurrenceId(id);
    return events.find((e) => e.id === baseId) ?? null;
  },

  /** Get the base (stored) event by ID */
  async getBase(id: string): Promise<CalendarEvent | null> {
    const { baseId } = parseOccurrenceId(id);
    return events.find((e) => e.id === baseId) ?? null;
  },

  async create(input: CreateEventInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: generateId(),
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime ?? null,
      allDay: input.allDay ?? false,
      location: input.location ?? null,
      color: input.color ?? null,
      category: input.category ?? null,
      projectId: input.projectId ?? null,
      recurrence: input.recurrence ?? null,
      exceptions: null,
      createdAt: now(),
      updatedAt: now(),
    };
    events.push(event);
    persist();
    return event;
  },

  /**
   * Update an event. If `id` is a virtual occurrence ID (e.g., `{uuid}_2026-04-01`),
   * this creates an exception on the base event for that specific date.
   * To update all occurrences, pass the base event ID directly.
   */
  async update(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
    const { baseId, dateKey } = parseOccurrenceId(id);
    const idx = events.findIndex((e) => e.id === baseId);
    if (idx === -1) throw new Error(`Event ${baseId} not found`);

    if (dateKey && events[idx].recurrence) {
      // Single occurrence edit — store as exception
      // Strip fields that should never leak into exception records
      const { recurrence: _r, exceptions: _e, ...safeInput } = input;
      const allowedFields: Record<string, unknown> = {};
      const ALLOWED_KEYS = ['title', 'description', 'startTime', 'endTime', 'allDay', 'location', 'color', 'category', 'projectId'] as const;
      for (const key of ALLOWED_KEYS) {
        if (key in safeInput) allowedFields[key] = (safeInput as Record<string, unknown>)[key];
      }
      const existing = events[idx];
      const exceptions = { ...(existing.exceptions ?? {}) };
      exceptions[dateKey] = { ...(exceptions[dateKey] ?? {}), ...allowedFields };
      events[idx] = { ...existing, exceptions, updatedAt: now() };
    } else {
      // Update all occurrences (or non-recurring event)
      events[idx] = { ...events[idx], ...input, updatedAt: now() };
    }

    persist();
    return events[idx];
  },

  async delete(id: string): Promise<void> {
    const { baseId, dateKey } = parseOccurrenceId(id);

    if (dateKey) {
      // Delete single occurrence by adding an exception that marks it deleted
      const idx = events.findIndex((e) => e.id === baseId);
      if (idx !== -1) {
        const existing = events[idx];
        const exceptions = { ...(existing.exceptions ?? {}) };
        exceptions[dateKey] = { ...exceptions[dateKey], title: '__DELETED__' };
        events[idx] = { ...existing, exceptions, updatedAt: now() };
        persist();
      }
    } else {
      // Delete entire series
      events = events.filter((e) => e.id !== id);
      persist();
    }
  },

  /** Check if an event ID refers to a recurring event */
  isRecurringId(id: string): boolean {
    const { baseId } = parseOccurrenceId(id);
    const event = events.find((e) => e.id === baseId);
    return !!(event?.recurrence);
  },

  /** Get the base ID from a potentially virtual occurrence ID */
  getBaseId(id: string): string {
    return parseOccurrenceId(id).baseId;
  },
};
