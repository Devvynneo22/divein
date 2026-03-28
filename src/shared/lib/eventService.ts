import type { CalendarEvent, CreateEventInput, UpdateEventInput } from '@/shared/types/event';

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

export const eventService = {
  async list(start?: string, end?: string): Promise<CalendarEvent[]> {
    let result = [...events];
    if (start) result = result.filter((e) => e.startTime >= start);
    if (end) result = result.filter((e) => e.startTime <= end);
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  async get(id: string): Promise<CalendarEvent | null> {
    return events.find((e) => e.id === id) ?? null;
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
      createdAt: now(),
      updatedAt: now(),
    };
    events.push(event);
    persist();
    return event;
  },

  async update(id: string, input: UpdateEventInput): Promise<CalendarEvent> {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Event ${id} not found`);
    events[idx] = { ...events[idx], ...input, updatedAt: now() };
    persist();
    return events[idx];
  },

  async delete(id: string): Promise<void> {
    events = events.filter((e) => e.id !== id);
    persist();
  },
};
