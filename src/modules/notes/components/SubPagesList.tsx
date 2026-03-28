import { Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Note } from '@/shared/types/note';

interface SubPagesListProps {
  pages: Note[];
  onNavigate: (id: string) => void;
  onCreateSubPage: () => void;
}

export function SubPagesList({ pages, onNavigate, onCreateSubPage }: SubPagesListProps) {
  if (pages.length === 0) {
    return (
      <div className="px-8 py-4 border-t border-[var(--color-border)]">
        <button
          onClick={onCreateSubPage}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors group"
        >
          <Plus size={14} className="group-hover:text-[var(--color-accent)]" />
          Add a sub-page
        </button>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Sub-pages <span className="ml-1 font-normal normal-case tracking-normal">({pages.length})</span>
        </h3>
        <button
          onClick={onCreateSubPage}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors px-2 py-1 rounded hover:bg-[var(--color-bg-tertiary)]"
        >
          <Plus size={12} />
          Add sub-page
        </button>
      </div>

      <div className="space-y-1">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className="w-full flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-left group"
          >
            <div className="shrink-0 mt-0.5 text-base leading-none">
              {page.icon ? (
                <span>{page.icon}</span>
              ) : (
                <FileText size={16} className="text-[var(--color-text-muted)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                {page.title}
              </div>
              {page.contentText && (
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                  {page.contentText.slice(0, 80)}
                </p>
              )}
              <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
                Updated {format(new Date(page.updatedAt), 'MMM d, yyyy')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
