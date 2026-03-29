import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Serializable filter/sort/group snapshot stored as a named view. */
export interface SavedViewFilters {
  status?: string[];
  priority?: number[];
  tags?: string[];
  dueBefore?: string;
}

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewFilters;
  groupBy?: string;
  sortBy?: string;
}

export interface CustomStatus {
  id: string;   // matches TaskStatus value for core statuses, or a UUID for new ones
  name: string; // display name (editable)
  state: 'unstarted' | 'active' | 'completed';
  color: string; // hex color
  isCore: boolean; // if true, cannot be deleted
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CUSTOM_STATUSES: CustomStatus[] = [
  { id: 'backlog',     name: 'Backlog',      state: 'unstarted', color: '#a1a1aa', isCore: true },
  { id: 'inbox',       name: 'Inbox',        state: 'unstarted', color: '#a1a1aa', isCore: true },
  { id: 'todo',        name: 'To Do',        state: 'unstarted', color: '#60a5fa', isCore: true },
  { id: 'in_progress', name: 'In Progress',  state: 'active',    color: '#fb923c', isCore: true },
  { id: 'in_review',   name: 'In Review',    state: 'active',    color: '#c084fc', isCore: true },
  { id: 'done',        name: 'Done',         state: 'completed', color: '#4ade80', isCore: true },
  { id: 'cancelled',   name: 'Cancelled',    state: 'completed', color: '#f87171', isCore: true },
];

// ─── Persistence helpers ─────────────────────────────────────────────────────

const VIEWS_KEY    = 'divein-task-saved-views';
const STATUSES_KEY = 'divein-task-custom-statuses';

function load<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return defaults;
}

function persist(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface TaskSettingsState {
  savedViews: SavedView[];
  customStatuses: CustomStatus[];

  // Saved views
  addSavedView: (view: Omit<SavedView, 'id'>) => void;
  updateSavedView: (id: string, partial: Partial<Omit<SavedView, 'id'>>) => void;
  removeSavedView: (id: string) => void;

  // Custom statuses
  addCustomStatus: (status: Omit<CustomStatus, 'id' | 'isCore'>) => void;
  updateCustomStatus: (id: string, partial: Partial<Omit<CustomStatus, 'id' | 'isCore'>>) => void;
  removeCustomStatus: (id: string) => void;
  resetStatuses: () => void;
}

export const useTaskSettingsStore = create<TaskSettingsState>((set, get) => {
  const loadedStatuses = load<CustomStatus[]>(STATUSES_KEY, DEFAULT_CUSTOM_STATUSES);

  // Merge: ensure all core statuses are present (in case new ones were added in an update)
  const merged = [...loadedStatuses];
  for (const def of DEFAULT_CUSTOM_STATUSES) {
    if (!merged.find((s) => s.id === def.id)) {
      merged.push(def);
    }
  }

  return {
    savedViews: load<SavedView[]>(VIEWS_KEY, []),
    customStatuses: merged,

    addSavedView: (view) => {
      const newView: SavedView = { ...view, id: crypto.randomUUID() };
      const next = [...get().savedViews, newView];
      persist(VIEWS_KEY, next);
      set({ savedViews: next });
    },

    updateSavedView: (id, partial) => {
      const next = get().savedViews.map((v) => v.id === id ? { ...v, ...partial } : v);
      persist(VIEWS_KEY, next);
      set({ savedViews: next });
    },

    removeSavedView: (id) => {
      const next = get().savedViews.filter((v) => v.id !== id);
      persist(VIEWS_KEY, next);
      set({ savedViews: next });
    },

    addCustomStatus: (status) => {
      const newStatus: CustomStatus = { ...status, id: crypto.randomUUID(), isCore: false };
      const next = [...get().customStatuses, newStatus];
      persist(STATUSES_KEY, next);
      set({ customStatuses: next });
    },

    updateCustomStatus: (id, partial) => {
      const next = get().customStatuses.map((s) => s.id === id ? { ...s, ...partial } : s);
      persist(STATUSES_KEY, next);
      set({ customStatuses: next });
    },

    removeCustomStatus: (id) => {
      const status = get().customStatuses.find((s) => s.id === id);
      if (!status || status.isCore) return; // cannot remove core statuses
      const next = get().customStatuses.filter((s) => s.id !== id);
      persist(STATUSES_KEY, next);
      set({ customStatuses: next });
    },

    resetStatuses: () => {
      persist(STATUSES_KEY, DEFAULT_CUSTOM_STATUSES);
      set({ customStatuses: DEFAULT_CUSTOM_STATUSES });
    },
  };
});
