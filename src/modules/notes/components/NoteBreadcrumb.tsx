import { Home, ChevronRight, FileText } from 'lucide-react';
import type { Note } from '@/shared/types/note';

interface NoteBreadcrumbProps {
  ancestors: Note[];
  currentNote: Note;
  onNavigate: (id: string) => void;
  onHome: () => void;
}

export function NoteBreadcrumb({ ancestors, currentNote, onNavigate, onHome }: NoteBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] min-w-0">
      <button
        onClick={onHome}
        className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors shrink-0 px-1 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)]"
      >
        <Home size={12} />
        <span>Notes</span>
      </button>

      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-1 min-w-0">
          <ChevronRight size={12} className="shrink-0 opacity-50" />
          <button
            onClick={() => onNavigate(ancestor.id)}
            className="hover:text-[var(--color-text-primary)] transition-colors truncate max-w-[120px] px-1 py-0.5 rounded hover:bg-[var(--color-bg-tertiary)]"
          >
            {ancestor.icon ? (
              <span className="mr-1">{ancestor.icon}</span>
            ) : null}
            {ancestor.title}
          </button>
        </span>
      ))}

      <ChevronRight size={12} className="shrink-0 opacity-50" />
      <span className="flex items-center gap-1 text-[var(--color-text-secondary)] truncate max-w-[160px]">
        {currentNote.icon ? (
          <span>{currentNote.icon}</span>
        ) : (
          <FileText size={12} className="shrink-0" />
        )}
        <span className="truncate">{currentNote.title}</span>
      </span>
    </nav>
  );
}
