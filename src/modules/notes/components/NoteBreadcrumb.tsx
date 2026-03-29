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
    <nav
      className="flex items-center gap-0.5 text-sm min-w-0"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <button
        onClick={onHome}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md shrink-0 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Home size={13} />
        <span>Notes</span>
      </button>

      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-0.5 min-w-0">
          <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
          <button
            onClick={() => onNavigate(ancestor.id)}
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors truncate max-w-[140px]"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {ancestor.icon ? (
              <span className="shrink-0">{ancestor.icon}</span>
            ) : null}
            <span className="truncate">{ancestor.title}</span>
          </button>
        </span>
      ))}

      <ChevronRight size={13} style={{ opacity: 0.4, flexShrink: 0 }} />
      <span
        className="flex items-center gap-1.5 px-2 py-1 truncate max-w-[200px] font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {currentNote.icon ? (
          <span className="shrink-0">{currentNote.icon}</span>
        ) : (
          <FileText size={13} style={{ flexShrink: 0 }} />
        )}
        <span className="truncate">{currentNote.title}</span>
      </span>
    </nav>
  );
}
