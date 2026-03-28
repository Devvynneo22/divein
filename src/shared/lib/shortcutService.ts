/**
 * Keyboard Shortcuts Registry
 *
 * Manages default + user-customized keyboard shortcuts.
 * User overrides are persisted in localStorage under 'nexus-shortcuts'.
 */

export interface ShortcutDef {
  id: string;
  label: string;
  keys: string;          // Display string, e.g. "Ctrl+K", "?", "j"
  group: ShortcutGroup;
  description?: string;
}

export type ShortcutGroup = 'Global' | 'Navigation' | 'Tasks' | 'Notes' | 'Timer';

const STORAGE_KEY = 'nexus-shortcuts';

// ─── Default shortcuts ──────────────────────────────────────────────────────

const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // Global
  { id: 'command-palette',  label: 'Command Palette',      keys: 'Ctrl+K',       group: 'Global' },
  { id: 'quick-add',        label: 'Quick Add Task',       keys: 'Ctrl+Shift+N', group: 'Global' },
  { id: 'shortcut-help',    label: 'Shortcut Cheatsheet',  keys: '?',            group: 'Global' },
  // Navigation
  { id: 'nav-dashboard',    label: 'Go to Dashboard',      keys: 'G then D',     group: 'Navigation' },
  { id: 'nav-tasks',        label: 'Go to Tasks',          keys: 'G then T',     group: 'Navigation' },
  { id: 'nav-notes',        label: 'Go to Notes',          keys: 'G then N',     group: 'Navigation' },
  { id: 'nav-calendar',     label: 'Go to Calendar',       keys: 'G then C',     group: 'Navigation' },
  { id: 'nav-settings',     label: 'Go to Settings',       keys: 'G then S',     group: 'Navigation' },
  // Tasks
  { id: 'task-move-down',   label: 'Next task',            keys: 'j',            group: 'Tasks' },
  { id: 'task-move-up',     label: 'Previous task',        keys: 'k',            group: 'Tasks' },
  { id: 'task-new',         label: 'New task',             keys: 'n',            group: 'Tasks' },
  { id: 'task-open',        label: 'Open task',            keys: 'Enter',        group: 'Tasks' },
  { id: 'task-close',       label: 'Close panel',          keys: 'Escape',       group: 'Tasks' },
  { id: 'task-priority-1',  label: 'Priority: Low',        keys: '1',            group: 'Tasks' },
  { id: 'task-priority-2',  label: 'Priority: Medium',     keys: '2',            group: 'Tasks' },
  { id: 'task-priority-3',  label: 'Priority: High',       keys: '3',            group: 'Tasks' },
  { id: 'task-priority-4',  label: 'Priority: Urgent',     keys: '4',            group: 'Tasks' },
  { id: 'task-done',        label: 'Toggle done',          keys: 'd',            group: 'Tasks' },
  { id: 'task-delete',      label: 'Delete task',          keys: 'Delete',       group: 'Tasks' },
  // Notes
  { id: 'note-new',         label: 'New note',             keys: 'n',            group: 'Notes' },
  { id: 'note-save',        label: 'Save note',            keys: 'Ctrl+S',       group: 'Notes' },
  // Timer
  { id: 'timer-start-stop', label: 'Start / Stop',         keys: 'Space',        group: 'Timer' },
  { id: 'timer-reset',      label: 'Reset timer',          keys: 'r',            group: 'Timer' },
];

// ─── User overrides ─────────────────────────────────────────────────────────

function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // corrupt data — ignore
  }
  return {};
}

function saveOverrides(overrides: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const shortcutService = {
  /** Get all shortcut definitions (with user overrides applied). */
  getAll(): ShortcutDef[] {
    const overrides = loadOverrides();
    return DEFAULT_SHORTCUTS.map((s) => ({
      ...s,
      keys: overrides[s.id] ?? s.keys,
    }));
  },

  /** Get all shortcuts grouped. */
  getGrouped(): Record<ShortcutGroup, ShortcutDef[]> {
    const all = this.getAll();
    const groups: Record<ShortcutGroup, ShortcutDef[]> = {
      Global: [],
      Navigation: [],
      Tasks: [],
      Notes: [],
      Timer: [],
    };
    for (const s of all) {
      groups[s.group].push(s);
    }
    return groups;
  },

  /** Get a single shortcut's keys (user override or default). */
  getShortcut(actionId: string): string | null {
    const overrides = loadOverrides();
    if (overrides[actionId]) return overrides[actionId];
    const def = DEFAULT_SHORTCUTS.find((s) => s.id === actionId);
    return def?.keys ?? null;
  },

  /** Update a shortcut's keys (persists to localStorage). */
  updateShortcut(actionId: string, keys: string): void {
    const overrides = loadOverrides();
    overrides[actionId] = keys;
    saveOverrides(overrides);
  },

  /** Reset a single shortcut to default. */
  resetShortcut(actionId: string): void {
    const overrides = loadOverrides();
    delete overrides[actionId];
    saveOverrides(overrides);
  },

  /** Reset all shortcuts to defaults. */
  resetAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  /** Get the default keys for a shortcut (ignoring overrides). */
  getDefault(actionId: string): string | null {
    const def = DEFAULT_SHORTCUTS.find((s) => s.id === actionId);
    return def?.keys ?? null;
  },

  /** Check if a shortcut has been customized. */
  isCustomized(actionId: string): boolean {
    const overrides = loadOverrides();
    return actionId in overrides;
  },
};
