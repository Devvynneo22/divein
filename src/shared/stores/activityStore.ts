import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_status_changed'
  | 'note_created'
  | 'note_updated'
  | 'habit_checked'
  | 'timer_completed'
  | 'project_created'
  | 'flashcard_studied'
  | 'deck_created';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;       // e.g. "Completed 'Fix login bug'"
  icon: string;        // emoji
  entityId?: string;   // ID of related entity
  entityType?: string; // 'task' | 'note' | 'habit' | 'timer'
  metadata?: Record<string, string>;
  timestamp: string;   // ISO 8601
}

interface ActivityStoreState {
  activities: ActivityItem[];
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  getRecent: (limit?: number) => ActivityItem[];
  clearOlderThan: (days: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'divein-activity-feed';
const MAX_ACTIVITIES = 200;

// ─── Persistence helpers ──────────────────────────────────────────────────────

function load(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ActivityItem[];
  } catch { /* ignore */ }
  return [];
}

function persist(items: ActivityItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  activities: load(),

  addActivity: (activity) => {
    const newItem: ActivityItem = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    // Prepend and cap at MAX_ACTIVITIES (FIFO — keep newest)
    const next = [newItem, ...get().activities].slice(0, MAX_ACTIVITIES);
    persist(next);
    set({ activities: next });
  },

  getRecent: (limit = 20) => {
    return get().activities.slice(0, limit);
  },

  clearOlderThan: (days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffISO = cutoff.toISOString();
    const next = get().activities.filter((a) => a.timestamp >= cutoffISO);
    persist(next);
    set({ activities: next });
  },
}));
