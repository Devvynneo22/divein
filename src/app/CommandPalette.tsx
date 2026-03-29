import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { globalSearch, type SearchResult, type SearchResultType } from '@/shared/lib/searchService';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
}

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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle with Ctrl+K
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setSearchResults([]);
    }
  }, [open]);

  // Debounced search
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

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard size={16} />, action: () => go('/dashboard'), group: 'Navigation', keywords: ['home'] },
    { id: 'nav-tasks', label: 'Go to Tasks', icon: <CheckSquare size={16} />, action: () => go('/tasks'), group: 'Navigation', keywords: ['todo'] },
    { id: 'nav-notes', label: 'Go to Notes', icon: <FileText size={16} />, action: () => go('/notes'), group: 'Navigation', keywords: ['documents', 'writing'] },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: <Calendar size={16} />, action: () => go('/calendar'), group: 'Navigation', keywords: ['events', 'schedule'] },
    { id: 'nav-habits', label: 'Go to Habits', icon: <Target size={16} />, action: () => go('/habits'), group: 'Navigation', keywords: ['routine', 'tracker'] },
    { id: 'nav-timer', label: 'Go to Timer', icon: <Timer size={16} />, action: () => go('/timer'), group: 'Navigation', keywords: ['pomodoro', 'focus', 'time'] },
    { id: 'nav-flashcards', label: 'Go to Flashcards', icon: <BookOpen size={16} />, action: () => go('/flashcards'), group: 'Navigation', keywords: ['study', 'review', 'cards', 'anki'] },
    { id: 'nav-tables', label: 'Go to Tables', icon: <Table2 size={16} />, action: () => go('/tables'), group: 'Navigation', keywords: ['spreadsheet', 'data'] },
    { id: 'nav-projects', label: 'Go to Projects', icon: <FolderKanban size={16} />, action: () => go('/projects'), group: 'Navigation', keywords: ['project'] },
    { id: 'nav-settings', label: 'Go to Settings', icon: <Settings size={16} />, action: () => go('/settings'), group: 'Navigation', keywords: ['preferences', 'config'] },
    // Quick Actions
    { id: 'create-task', label: 'New Task', icon: <Plus size={16} />, action: () => go('/tasks'), group: 'Create', keywords: ['add task', 'todo'] },
    { id: 'create-note', label: 'New Note', icon: <Plus size={16} />, action: () => go('/notes'), group: 'Create', keywords: ['add note', 'write'] },
    { id: 'create-event', label: 'New Event', icon: <Plus size={16} />, action: () => go('/calendar'), group: 'Create', keywords: ['add event', 'schedule'] },
    { id: 'start-timer', label: 'Start Timer', icon: <Timer size={16} />, action: () => go('/timer'), group: 'Create', keywords: ['focus', 'pomodoro'] },
  ];

  if (!open) return null;

  const groupHeadingClass = '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest';

  return (
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
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <Search size={18} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            <Command.Input
              placeholder="Type a command or search..."
              className="w-full py-4 bg-transparent text-sm outline-none"
              style={{
                color: 'var(--color-text-primary)',
              }}
              autoFocus
              value={inputValue}
              onValueChange={setInputValue}
            />
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty
              className="py-8 text-center text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No results found.
            </Command.Empty>

            {/* Search Results group */}
            {searchResults.length > 0 && (
              <Command.Group heading="Search Results" className={groupHeadingClass}>
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

            {['Navigation', 'Create'].map((group) => {
              const items = commands.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className={groupHeadingClass}>
                  {items.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                      onSelect={cmd.action}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--color-accent-soft)]"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>{cmd.icon}</span>
                      {cmd.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer hint */}
          <div
            className="flex items-center justify-between px-4 py-2.5 text-[11px]"
            style={{
              borderTop: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
