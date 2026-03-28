import { X, FileText } from 'lucide-react';
import type { Note } from '@/shared/types/note';
import { useNoteAncestors } from '../hooks/useNotes';

interface NoteSearchResultsProps {
  results: Note[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export function NoteSearchResults({ results, query, selectedId, onSelect, onClear }: NoteSearchResultsProps) {
  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-[var(--color-text-muted)]">
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </span>
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          title="Clear search"
        >
          <X size={12} />
        </button>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
          No pages found
        </div>
      ) : (
        results.map((note) => (
          <SearchResultItem
            key={note.id}
            note={note}
            query={query}
            isSelected={note.id === selectedId}
            onSelect={() => onSelect(note.id)}
          />
        ))
      )}
    </div>
  );
}

function SearchResultItem({
  note,
  query,
  isSelected,
  onSelect,
}: {
  note: Note;
  query: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { data: ancestors = [] } = useNoteAncestors(note.parentId);

  // Find snippet from contentText
  const snippet = (() => {
    if (!note.contentText) return null;
    const q = query.toLowerCase();
    const idx = note.contentText.toLowerCase().indexOf(q);
    if (idx === -1) return null;
    const start = Math.max(0, idx - 30);
    const end = Math.min(note.contentText.length, idx + query.length + 50);
    return (start > 0 ? '...' : '') + note.contentText.slice(start, end) + (end < note.contentText.length ? '...' : '');
  })();

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 hover:bg-[var(--color-bg-tertiary)] transition-colors border-b border-[var(--color-border)] ${
        isSelected ? 'bg-[var(--color-accent)]/10' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-sm leading-none shrink-0">
          {note.icon ?? <FileText size={13} className="text-[var(--color-text-muted)]" />}
        </span>
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {note.title}
        </span>
      </div>

      {/* Breadcrumb path */}
      {ancestors.length > 0 && (
        <div className="text-[10px] text-[var(--color-text-muted)] truncate mb-0.5 pl-5">
          {ancestors.map((a) => a.title).join(' › ')} ›
        </div>
      )}

      {snippet && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 pl-5 mt-0.5">
          {snippet}
        </p>
      )}
    </button>
  );
}
