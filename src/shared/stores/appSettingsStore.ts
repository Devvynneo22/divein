import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';
export type TaskDensity = 'compact' | 'default' | 'spacious';

export interface AppSettings {
  theme: ThemeMode;
  sidebarDefault: 'expanded' | 'collapsed';
  dateFormat: 'relative' | 'short' | 'long';
  startOfWeek: 0 | 1 | 6;
  accentColor: string;
  taskDensity: TaskDensity;
  showCoverImages: boolean;
  showIssueKeys: boolean;
}

export interface FlashcardSettings {
  newCardsPerDay: number;
  showIntervalPreview: boolean;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_APP: AppSettings = {
  theme: 'light',
  sidebarDefault: 'expanded',
  dateFormat: 'relative',
  startOfWeek: 1,
  accentColor: '#2383e2',
  taskDensity: 'default',
  showCoverImages: true,
  showIssueKeys: true,
};

const DEFAULT_FLASHCARD: FlashcardSettings = {
  newCardsPerDay: 20,
  showIntervalPreview: true,
};

// ─── Persistence helpers ────────────────────────────────────────────────────

const APP_KEY = 'divein-app-settings';
const FC_KEY = 'divein-flashcard-settings';

function load<T>(key: string, defaults: T): T {
  try {
    // Migrate from old nexus keys
    const oldKey = key.replace('divein-', 'nexus-');
    let raw = localStorage.getItem(key);
    if (!raw) {
      raw = localStorage.getItem(oldKey);
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(oldKey);
      }
    }
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaults;
}

function persist(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── Theme helpers ──────────────────────────────────────────────────────────

function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(mode: ThemeMode): void {
  const effective = getEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effective);
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface AppSettingsStore {
  app: AppSettings;
  flashcard: FlashcardSettings;
  effectiveTheme: 'light' | 'dark';
  updateApp: (partial: Partial<AppSettings>) => void;
  updateFlashcard: (partial: Partial<FlashcardSettings>) => void;
}

export const useAppSettingsStore = create<AppSettingsStore>((set, get) => {
  const initial = load<AppSettings>(APP_KEY, DEFAULT_APP);
  // Apply theme on store creation
  applyTheme(initial.theme);

  return {
    app: initial,
    flashcard: load<FlashcardSettings>(FC_KEY, DEFAULT_FLASHCARD),
    effectiveTheme: getEffectiveTheme(initial.theme),

    updateApp: (partial) => {
      const next = { ...get().app, ...partial };
      persist(APP_KEY, next);
      if (partial.theme !== undefined) {
        applyTheme(next.theme);
      }
      set({ app: next, effectiveTheme: getEffectiveTheme(next.theme) });
    },

    updateFlashcard: (partial) => {
      const next = { ...get().flashcard, ...partial };
      persist(FC_KEY, next);
      set({ flashcard: next });
    },
  };
});

// Listen for system theme changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useAppSettingsStore.getState();
    if (store.app.theme === 'system') {
      applyTheme('system');
      useAppSettingsStore.setState({ effectiveTheme: getEffectiveTheme('system') });
    }
  });
}
