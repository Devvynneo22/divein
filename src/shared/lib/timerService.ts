/**
 * Timer Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.timer.*) without
 *          changing any component or hook code.
 */
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  eachDayOfInterval,
  format,
  subDays,
} from 'date-fns';
import type { TimeEntry, CreateTimeEntryInput, UpdateTimeEntryInput } from '@/shared/types/timer';

// ─── Persistent store ────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexus-timer-entries';

function loadEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TimeEntry[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

let entries: TimeEntry[] = loadEntries();

// Maximum duration (in seconds) for orphaned timer entries recovered on startup.
// Prevents ghost entries with 19+ hour durations when a tab is closed mid-timer.
const MAX_ORPHAN_DURATION_SEC = 4 * 60 * 60; // 4 hours

// Clean up orphaned running entries from previous sessions (e.g. tab closed mid-timer)
(function cleanupOrphanedEntries(): void {
  const running = entries.filter((e) => e.isRunning);
  if (running.length > 0) {
    const now = nowISO();
    for (const entry of running) {
      const elapsed = Math.round(
        (new Date(now).getTime() - new Date(entry.startTime).getTime()) / 1000,
      );
      const cappedDuration = Math.min(elapsed, MAX_ORPHAN_DURATION_SEC);
      entry.durationSec = cappedDuration;
      // Recompute endTime based on capped duration
      entry.endTime = new Date(
        new Date(entry.startTime).getTime() + cappedDuration * 1000,
      ).toISOString();
      entry.isRunning = false;
    }
    persist();
  }
})();

function generateId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const timerService = {
  async listEntries(startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    return entries
      .filter((e) => {
        const start = new Date(e.startTime);
        if (startDate && start < startDate) return false;
        if (endDate && start > endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  async getEntry(id: string): Promise<TimeEntry | null> {
    return entries.find((e) => e.id === id) ?? null;
  },

  async startTimer(input: CreateTimeEntryInput): Promise<TimeEntry> {
    // Stop any currently running entry first
    const running = entries.find((e) => e.isRunning);
    if (running) {
      const endTime = nowISO();
      const durationSec = Math.round(
        (new Date(endTime).getTime() - new Date(running.startTime).getTime()) / 1000,
      );
      Object.assign(running, { endTime, durationSec, isRunning: false });
      persist();
    }

    const entry: TimeEntry = {
      id: generateId(),
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      description: input.description ?? null,
      startTime: input.startTime ?? nowISO(),
      endTime: null,
      durationSec: null,
      isPomodoro: input.isPomodoro ?? false,
      isRunning: true,
      createdAt: nowISO(),
    };
    entries.push(entry);
    persist();
    return entry;
  },

  async stopTimer(id: string): Promise<TimeEntry> {
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw new Error(`TimeEntry ${id} not found`);

    const endTime = nowISO();
    const durationSec = Math.round(
      (new Date(endTime).getTime() - new Date(entry.startTime).getTime()) / 1000,
    );
    entry.endTime = endTime;
    entry.durationSec = durationSec;
    entry.isRunning = false;
    persist();
    return entry;
  },

  async createManualEntry(input: CreateTimeEntryInput): Promise<TimeEntry> {
    if (!input.startTime || !input.endTime) {
      throw new Error('Manual entries require startTime and endTime');
    }
    const durationSec =
      input.durationSec ??
      Math.round(
        (new Date(input.endTime).getTime() - new Date(input.startTime).getTime()) / 1000,
      );
    const entry: TimeEntry = {
      id: generateId(),
      taskId: input.taskId ?? null,
      projectId: input.projectId ?? null,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      durationSec,
      isPomodoro: input.isPomodoro ?? false,
      isRunning: false,
      createdAt: nowISO(),
    };
    entries.push(entry);
    persist();
    return entry;
  },

  async updateEntry(id: string, input: UpdateTimeEntryInput): Promise<TimeEntry> {
    const entry = entries.find((e) => e.id === id);
    if (!entry) throw new Error(`TimeEntry ${id} not found`);
    Object.assign(entry, input);
    persist();
    return entry;
  },

  async deleteEntry(id: string): Promise<void> {
    entries = entries.filter((e) => e.id !== id);
    persist();
  },

  async getRunning(): Promise<TimeEntry | null> {
    return entries.find((e) => e.isRunning) ?? null;
  },

  async getTodayTotal(): Promise<number> {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return entries
      .filter((e) => {
        const s = new Date(e.startTime);
        return s >= start && s <= end && !e.isRunning;
      })
      .reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
  },

  async getWeekSummary(): Promise<{ date: string; totalSec: number }[]> {
    const today = new Date();
    const weekStart = subDays(today, 6);
    const days = eachDayOfInterval({ start: weekStart, end: today });

    return days.map((day) => {
      const start = startOfDay(day);
      const end = endOfDay(day);
      const totalSec = entries
        .filter((e) => {
          const s = new Date(e.startTime);
          return s >= start && s <= end && !e.isRunning;
        })
        .reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
      return { date: format(day, 'yyyy-MM-dd'), totalSec };
    });
  },
};
