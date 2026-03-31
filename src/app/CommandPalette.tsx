import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Calendar,
  Target,
  Timer,
  BookOpen,
  Table2,
  FolderKanban,
  Settings,
  Plus,
  Search,
  Moon,
  NotebookPen,
  Flame,
  GraduationCap,
  Keyboard,
  FilterX,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { globalSearch, type SearchResult, type SearchResultType } from '@/shared/lib/searchService';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { noteService } from '@/shared/lib/noteService';
import { QuickCapture } from './QuickCapture';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: 'Navigation' | 'Create' | 'Actions';
  keywords?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  Task: <CheckSquare size={14} />,
  Note: <FileText size={14} />,
  Event: <Calendar size={14} />,
  Habit: <Target size={14} />,
  Deck: <BookOpen size={14} />,
  Table: <Table2 size={14} />,
  Project: <FolderKanban size={14} />,
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  Task: 'var(--color-accent)',
  Note: '#a78bfa',
  Event: '#f472b6',
  Habit: '#34d399',
  Deck: '#fbbf24',
  Table: '#60a5fa',
  Project: '#fb923c',
};

const GROUP_HEADING_CLASS =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest';

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { app: appSettings, updateApp } = useAppSettingsStore();

  // ── Toggle Ctrl+K ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setSearchResults([]);
    }
  }, [open]);

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await globalSearch(inputValue);
      setSearchResults(results);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  // ── Navigation helper ─────────────────────────────────────────────────────
  const go = useCallback(
    (path: string, state?: Record<string, unknown>) => {
      if (state) {
        navigate(path, { state });
      } else {
        navigate(path);
      }
      setOpen(false);
    },
    [navigate],
  );

  // ── Open today's daily note ───────────────────────────────────────────────
  const openTodayNote = useCallback(async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const formattedTitle = format(today, 'MMMM d, yyyy');
    let note = await noteService.getDailyNote(dateStr);
    if (!note) {
      note = await noteService.createDailyNote(dateStr, formattedTitle);
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
    navigate('/notes', { state: { selectedNoteId: note.id } });
    setOpen(false);
  }, [navigate, queryClient]);

  // ── Command definitions ───────────────────────────────────────────────────
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      { id: 'nav-dashboard',   label: 'Go to Dashboard',   icon: <LayoutDashboard size={16} />, action: () => go('/dashboard'),   group: 'Navigation', keywords: ['home'] },
      { id: 'nav-tasks',       label: 'Go to Tasks',       icon: <CheckSquare size={16} />,     action: () => go('/tasks'),        group: 'Navigation', keywords: ['todo'] },
      { id: 'nav-notes',       label: 'Go to Notes',       icon: <FileText size={16} />,        action: () => go('/notes'),        group: 'Navigation', keywords: ['documents', 'writing'] },
      { id: 'nav-calendar',    label: 'Go to Calendar',    icon: <Calendar size={16} />,        action: () => go('/calendar'),     group: 'Navigation', keywords: ['events', 'schedule'] },
      { id: 'nav-habits',      label: 'Go to Habits',      icon: <Target size={16} />,          action: () => go('/habits'),       group: 'Navigation', keywords: ['routine', 'tracker'] },
      { id: 'nav-timer',       label: 'Go to Timer',       icon: <Timer size={16} />,           action: () => go('/timer'),        group: 'Navigation', keywords: ['pomodoro', 'focus', 'time'] },
      { id: 'nav-flashcards',  label: 'Go to Flashcards',  icon: <BookOpen size={16} />,        action: () => go('/flashcards'),   group: 'Navigation', keywords: ['study', 'review', 'cards', 'anki'] },
      { id: 'nav-tables',      label: 'Go to Tables',      icon: <Table2 size={16} />,          action: () => go('/tables'),       group: 'Navigation', keywords: ['spreadsheet', 'data'] },
      { id: 'nav-projects',    label: 'Go to Projects',    icon: <FolderKanban size={16} />,    action: () => go('/projects'),     group: 'Navigation', keywords: ['project'] },
      { id: 'nav-settings',    label: 'Go to Settings',    icon: <Settings size={16} />,        action: () => go('/settings'),     group: 'Navigation', keywords: ['preferences', 'config'] },
      // Create (with modal-opening state)
      { id: 'create-task',  label: 'New Task',  icon: <Plus size={16} />, action: () => go('/tasks',    { openCreateModal: true }), group: 'Create', keywords: ['add task', 'todo'] },
      { id: 'create-note',  label: 'New Note',  icon: <Plus size={16} />, action: () => go('/notes',    { createNew: true }),       group: 'Create', keywords: ['add note', 'write'] },
      { id: 'create-event', label: 'New Event', icon: <Plus size={16} />, action: () => go('/calendar', { createEvent: true }),     group: 'Create', keywords: ['add event', 'schedule'] },
      { id: 'start-timer',  label: 'Start Timer', icon: <Timer size={16} />, action: () => go('/timer'), group: 'Create', keywords: ['focus', 'pomodoro'] },
      // Actions
      {
        id: 'action-toggle-dark-mode',
        label: appSettings.theme === 'dark' ? 'Switch to Light Mode' : 'Toggle Dark Mode',
        icon: <Moon size={16} />,
        action: () => {
          updateApp({ theme: appSettings.theme === 'dark' ? 'light' : 'dark' });
          setOpen(false);
        },
        group: 'Actions',
        keywords: ['theme', 'dark', 'light', 'appearance'],
      },
      {
        id: 'action-today-note',
        label: "Open Today's Note",
        icon: <NotebookPen size={16} />,
        action: () => { void openTodayNote(); },
        group: 'Actions',
        keywords: ['daily', 'journal', 'today'],
      },
      {
        id: 'action-start-pomodoro',
        label: 'Start Pomodoro',
        icon: <Flame size={16} />,
        action: () => go('/timer', { startPomodoro: true }),
        group: 'Actions',
        keywords: ['focus', 'timer', 'pomodoro', 'concentration'],
      },
      {
        id: 'action-study-flashcards',
        label: 'Study Due Flashcards',
        icon: <GraduationCap size={16} />,
        action: () => go('/flashcards'),
        group: 'Actions',
        keywords: ['study', 'review', 'cards', 'anki', 'spaced repetition'],
      },
      {
        id: 'action-shortcuts',
        label: 'Show Keyboard Shortcuts',
        icon: <Keyboard size={16} />,
        action: () => {
          setOpen(false);
          // Dispatch synthetic '?' keydown — ShortcutCheatsheet listens for this
          setTimeout(() => {
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true }),
            );
          }, 50);
        },
        group: 'Actions',
        keywords: ['shortcuts', 'keys', 'help', 'hotkeys'],
      },
      {
        id: 'action-clear-filters',
        label: 'Clear All Filters',
        icon: <FilterX size={16} />,
        action: () => go('/tasks'),
        group: 'Actions',
        keywords: ['reset', 'clear', 'filters'],
      },
    ],
    [go, appSettings.theme, updateApp, openTodayNote],
  );

  // ── Filter commands by query ──────────────────────────────────────────────
  const filteredCommands = useMemo<CommandItem[]>(() => {
    if (!inputValue.trim()) return commands;
    const q = inputValue.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q)),
    );
  }, [commands, inputValue]);

  // ── Total indexed item count ──────────────────────────────────────────────
  const [totalItems, setTotalItems] = useState(0);
  useEffect(() => {
    async function fetchCount() {
      try {
        const all = await globalSearch('');
        setTotalItems(all.length);
      } catch {
        // ignore
      }
    }
    if (open) void fetchCount();
  }, [open]);

  // ── Always render QuickCapture (it self-manages open state) ─────────────
  if (!open) return <QuickCapture />;

  const GROUP_LABELS: Record<'Navigation' | 'Create' | 'Actions', string> = {
    Navigation: '🧭 Navigation',
    Create: '✨ Create',
    Actions: '⚡ Actions',
  };

  const GROUPS: Array<'Navigation' | 'Create' | 'Actions'> = ['Navigation', 'Create', 'Actions'];

  return (
    <>
      <QuickCapture />
      <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Command palette">
        {/* Backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setOpen(false)}
        />

        {/* Dialog */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
          <Command
            className="rounded-xl overflow-hidden"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              boxShadow: 'var(--shadow-popup)',
            }}
            loop
          >
            {/* ── Search input ─────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <Search size={18} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <Command.Input
                placeholder="Type a command or search..."
                className="w-full py-4 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-text-primary)' }}
                autoFocus
                value={inputValue}
                onValueChange={setInputValue}
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="shrink-0 text-xs px-2 py-0.5 rounded"
                  style={{
                    color: 'var(--color-text-muted)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* ── Results ──────────────────────────────────────────────────── */}
            <Command.List className="max-h-[380px] overflow-y-auto p-2">
              <Command.Empty
                className="py-8 text-center text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No results found.
              </Command.Empty>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Command.Group heading="🔍 Search Results" className={GROUP_HEADING_CLASS} style={{ color: 'var(--color-text-muted)' } as React.CSSProperties}>
                  {searchResults.map((result) => (
                    <Command.Item
                      key={`search-${result.type}-${result.id}`}
                      value={`search ${result.title} ${result.type}`}
                      onSelect={() => go(result.route)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--color-accent-soft)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {TYPE_ICONS[result.type]}
                      </span>
                      <span className="flex-1 truncate">{result.title}</span>
                      <span
                        className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          color: TYPE_COLORS[result.type],
                          backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[result.type]} 15%, transparent)`,
                        }}
                      >
                        {result.type}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Navigation / Create / Actions groups */}
              {GROUPS.map((group) => {
                const items = filteredCommands.filter((c) => c.group === group);
                if (items.length === 0) return null;
                return (
                  <Command.Group
                    key={group}
                    heading={GROUP_LABELS[group]}
                    className={GROUP_HEADING_CLASS}
                    style={{ color: 'var(--color-text-muted)' } as React.CSSProperties}
                  >
                    {items.map((cmd) => (
                      <Command.Item
                        key={cmd.id}
                        value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                        onSelect={cmd.action}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--color-accent-soft)]"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        <span style={{ color: 'var(--color-text-muted)' }}>{cmd.icon}</span>
                        <span className="flex-1">{cmd.label}</span>
                        {group === 'Actions' && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                            style={{
                              color: 'var(--color-text-muted)',
                              backgroundColor: 'var(--color-bg-tertiary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            ⚡
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div
              className="flex items-center justify-between px-4 py-2.5 text-[11px]"
              style={{
                borderTop: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              {totalItems > 0 && <span>{totalItems} items indexed</span>}
              <span>Esc Close</span>
            </div>
          </Command>
        </div>
      </div>
    </>
  );
}

// Re-export QuickCapture for convenience
export { QuickCapture };
