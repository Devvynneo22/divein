import { useState } from 'react';
import { ChevronRight, FileText, Link } from 'lucide-react';
import type { Note } from '@/shared/types/note';

interface BacklinksPanelProps {
  backlinks: Note[];
  onNavigate: (noteId: string) => void;
}

export function BacklinksPanel({ backlinks, onNavigate }: BacklinksPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="border-t border-[var(--color-border)] px-8 py-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors mb-2"
        >
          <ChevronRight
            size={14}
            className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
          <Link size={14} />
          <span>
            Backlinks{' '}
            <span className="text-xs">({backlinks.length})</span>
          </span>
        </button>

        {!isCollapsed && (
          <div className="space-y-0.5 ml-1">
            {backlinks.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-1 pl-5">
                No pages link to this page
              </p>
            ) : (
              backlinks.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigate(note.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  {note.icon ? (
                    <span className="text-sm shrink-0">{note.icon}</span>
                  ) : (
                    <FileText size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                  )}
                  <span className="truncate">{note.title}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
