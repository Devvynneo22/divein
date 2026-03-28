import { useState, useEffect, useCallback } from 'react';
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

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <Command
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden"
          loop
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-4 border-b border-[var(--color-border)]">
            <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
            <Command.Input
              placeholder="Type a command or search..."
              className="w-full py-3.5 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
              autoFocus
            />
          </div>

          {/* Results */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--color-text-muted)]">
              No results found.
            </Command.Empty>

            {['Navigation', 'Create'].map((group) => {
              const items = commands.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--color-text-muted)]"
                >
                  {items.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.keywords?.join(' ') ?? ''}`}
                      onSelect={cmd.action}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] cursor-pointer transition-colors data-[selected=true]:bg-[var(--color-accent)] data-[selected=true]:bg-opacity-15 data-[selected=true]:text-[var(--color-text-primary)]"
                    >
                      <span className="text-[var(--color-text-muted)]">{cmd.icon}</span>
                      {cmd.label}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
