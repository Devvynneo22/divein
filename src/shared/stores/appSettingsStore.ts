import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light';
  sidebarDefault: 'expanded' | 'collapsed';
  dateFormat: 'relative' | 'short' | 'long';
  startOfWeek: 0 | 1 | 6;
}

export interface FlashcardSettings {
  newCardsPerDay: number;
  showIntervalPreview: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_APP: AppSettings = {
  theme: 'dark',
  sidebarDefault: 'expanded',
  dateFormat: 'relative',
  startOfWeek: 1,
};

const DEFAULT_FLASHCARD: FlashcardSettings = {
  newCardsPerDay: 20,
  showIntervalPreview: true,
};

// ─── Persistence helpers ────────────────────────────────────────────────────

const APP_KEY = 'nexus-app-settings';
const FC_KEY = 'nexus-flashcard-settings';

function load<T>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaults;
}

function persist(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface AppSettingsStore {
  app: AppSettings;
  flashcard: FlashcardSettings;
  updateApp: (partial: Partial<AppSettings>) => void;
  updateFlashcard: (partial: Partial<FlashcardSettings>) => void;
}

export const useAppSettingsStore = create<AppSettingsStore>((set, get) => ({
  app: load<AppSettings>(APP_KEY, DEFAULT_APP),
  flashcard: load<FlashcardSettings>(FC_KEY, DEFAULT_FLASHCARD),

  updateApp: (partial) => {
    const next = { ...get().app, ...partial };
    persist(APP_KEY, next);
    set({ app: next });
  },

  updateFlashcard: (partial) => {
    const next = { ...get().flashcard, ...partial };
    persist(FC_KEY, next);
    set({ flashcard: next });
  },
}));
