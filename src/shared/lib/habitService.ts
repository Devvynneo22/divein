/**
 * Habit Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.habits.*) without
 *          changing any component or hook code.
 */
import { format, subDays, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import type {
  Habit,
  HabitEntry,
  HabitFrequency,
  CreateHabitInput,
  UpdateHabitInput,
  HabitWithStatus,
} from '@/shared/types/habit';

// ─── Persistent store ────────────────────────────────────────────────────────

const HABITS_KEY = 'nexus-habits';
const HABIT_ENTRIES_KEY = 'nexus-habit-entries';

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Habit[];
  } catch {
    return [];
  }
}

function loadHabitEntries(): HabitEntry[] {
  try {
    const raw = localStorage.getItem(HABIT_ENTRIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HabitEntry[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
    localStorage.setItem(HABIT_ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

let habits: Habit[] = loadHabits();
let entries: HabitEntry[] = loadHabitEntries();

function generateId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Returns true if the habit is scheduled for the given date string (YYYY-MM-DD). */
function isScheduledOn(habit: Habit, dateStr: string): boolean {
  const freq: HabitFrequency = habit.frequency;
  if (freq.type === 'daily') return true;
  if (freq.type === 'weekly') {
    const dow = parseISO(dateStr).getDay(); // 0=Sun
    return freq.days.includes(dow);
  }
  // xPerWeek — always consider scheduled (completion rate logic handles the count)
  return true;
}

/** Calculate the current streak for a habit (consecutive scheduled days completed, going back from today). */
function computeStreak(habit: Habit, habitEntries: HabitEntry[]): number {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const day = subDays(today, i);
    const dayStr = format(day, 'yyyy-MM-dd');

    if (!isScheduledOn(habit, dayStr)) continue;

    const entry = habitEntries.find((e) => e.habitId === habit.id && e.date === dayStr);
    const isComplete = entry !== undefined && entry.value >= habit.target;

    if (!isComplete) {
      // Allow today to be incomplete without breaking the streak
      if (i === 0) continue;
      break;
    }
    streak++;
  }

  return streak;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const habitService = {
  async list(): Promise<Habit[]> {
    return habits
      .filter((h) => !h.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async get(id: string): Promise<Habit | null> {
    return habits.find((h) => h.id === id) ?? null;
  },

  async create(input: CreateHabitInput): Promise<Habit> {
    const maxOrder =
      habits.length > 0 ? Math.max(...habits.map((h) => h.sortOrder)) : 0;
    const habit: Habit = {
      id: generateId(),
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      frequency: input.frequency ?? { type: 'daily' },
      groupName: input.groupName ?? null,
      target: input.target ?? 1,
      unit: input.unit ?? null,
      isArchived: false,
      sortOrder: maxOrder + 1,
      createdAt: nowIso(),
    };
    habits.push(habit);
    persist();
    return habit;
  },

  async update(id: string, input: UpdateHabitInput): Promise<Habit> {
    const idx = habits.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error(`Habit ${id} not found`);

    const existing = habits[idx];
    const updated: Habit = { ...existing, ...input };
    habits[idx] = updated;
    persist();
    return updated;
  },

  async delete(id: string): Promise<void> {
    habits = habits.filter((h) => h.id !== id);
    entries = entries.filter((e) => e.habitId !== id);
    persist();
  },

  async checkIn(
    habitId: string,
    date: string,
    value?: number,
    note?: string,
  ): Promise<HabitEntry> {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) throw new Error(`Habit ${habitId} not found`);

    const existingIdx = entries.findIndex(
      (e) => e.habitId === habitId && e.date === date,
    );
    const entryValue = value ?? 1;

    if (existingIdx !== -1) {
      const updated: HabitEntry = {
        ...entries[existingIdx],
        value: entryValue,
        note: note ?? entries[existingIdx].note,
      };
      entries[existingIdx] = updated;
      persist();
      return updated;
    }

    const entry: HabitEntry = {
      id: generateId(),
      habitId,
      date,
      value: entryValue,
      note: note ?? null,
      createdAt: nowIso(),
    };
    entries.push(entry);
    persist();
    return entry;
  },

  async uncheckIn(habitId: string, date: string): Promise<void> {
    entries = entries.filter(
      (e) => !(e.habitId === habitId && e.date === date),
    );
    persist();
  },

  async getEntries(
    habitId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<HabitEntry[]> {
    return entries
      .filter((e) => {
        if (e.habitId !== habitId) return false;
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async getStreak(habitId: string): Promise<number> {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return 0;
    return computeStreak(habit, entries);
  },

  async getCompletionRate(habitId: string, days: number): Promise<number> {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return 0;

    const today = new Date();
    const startDate = subDays(today, days - 1);
    const allDays = eachDayOfInterval({ start: startDate, end: today });

    const scheduledDays = allDays.filter((d) =>
      isScheduledOn(habit, format(d, 'yyyy-MM-dd')),
    );
    if (scheduledDays.length === 0) return 0;

    const completedCount = scheduledDays.filter((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const entry = entries.find(
        (e) => e.habitId === habitId && e.date === dateStr,
      );
      return entry !== undefined && entry.value >= habit.target;
    }).length;

    return completedCount / scheduledDays.length;
  },

  async getLongestStreak(habitId: string): Promise<number> {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return 0;

    const habitEntries = entries
      .filter((e) => e.habitId === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (habitEntries.length === 0) return 0;

    const firstDate = parseISO(habitEntries[0].date);
    const today = new Date();
    const allDays = eachDayOfInterval({ start: firstDate, end: today });

    let longest = 0;
    let current = 0;

    for (const day of allDays) {
      const dayStr = format(day, 'yyyy-MM-dd');
      if (!isScheduledOn(habit, dayStr)) continue;
      const entry = entries.find(
        (e) => e.habitId === habitId && e.date === dayStr,
      );
      if (entry && entry.value >= habit.target) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }

    return longest;
  },

  async getTodayStatus(): Promise<HabitWithStatus[]> {
    const today = todayStr();
    const activeHabits = habits
      .filter((h) => !h.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return activeHabits.map((habit) => {
      const todayEntry =
        entries.find((e) => e.habitId === habit.id && e.date === today) ?? null;
      const streak = computeStreak(habit, entries);
      const isCompletedToday =
        todayEntry !== null && todayEntry.value >= habit.target;

      return {
        ...habit,
        todayEntry,
        streak,
        isCompletedToday,
      };
    });
  },
};
