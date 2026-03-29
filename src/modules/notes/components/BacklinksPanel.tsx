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
    <div className="px-8 py-5" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium transition-colors mb-3"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
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
              <p className="text-sm py-1 pl-5" style={{ color: 'var(--color-text-muted)' }}>
                No pages link to this page
              </p>
            ) : (
              backlinks.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigate(note.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {note.icon ? (
                    <span className="text-sm shrink-0">{note.icon}</span>
                  ) : (
                    <FileText size={14} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
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
