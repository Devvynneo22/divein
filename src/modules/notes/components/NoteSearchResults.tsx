import { FileText } from 'lucide-react';
import type { Note } from '@/shared/types/note';
import { useNoteAncestors } from '../hooks/useNotes';

interface NoteSearchResultsProps {
  results: Note[];
  query: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export function NoteSearchResults({ results, query, selectedId, onSelect }: NoteSearchResultsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Subtle count header — no clutter */}
      <div
        style={{
          padding: '6px 12px 4px',
          fontSize: 11,
          color: 'var(--color-text-muted)',
          letterSpacing: '0.01em',
        }}
      >
        {results.length === 0
          ? 'No results'
          : `${results.length} result${results.length !== 1 ? 's' : ''}`}
      </div>

      {results.length === 0 ? (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}
        >
          Nothing found for "{query}"
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

// Highlight matched text inline — no protruding block element
function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const q = query.toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return (
    <span>
      {before}
      <mark
        style={{
          backgroundColor: 'rgba(234, 179, 8, 0.28)',
          color: 'inherit',
          borderRadius: 2,
          padding: '0 1px',
          fontWeight: 600,
        }}
      >
        {match}
      </mark>
      {after}
    </span>
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

  // Build a clean inline snippet (single line, no ellipsis overflow)
  const snippet = (() => {
    if (!note.contentText) return null;
    const q = query.toLowerCase();
    const idx = note.contentText.toLowerCase().indexOf(q);
    if (idx === -1) return null;
    const start = Math.max(0, idx - 28);
    const end = Math.min(note.contentText.length, idx + query.length + 55);
    return (start > 0 ? '…' : '') + note.contentText.slice(start, end) + (end < note.contentText.length ? '…' : '');
  })();

  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '7px 12px',
        border: 'none',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: isSelected
          ? 'var(--color-accent-soft)'
          : isHovered
          ? 'var(--color-bg-hover)'
          : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: snippet || ancestors.length > 0 ? 3 : 0,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
          {note.icon ?? (
            <FileText
              size={13}
              style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)', display: 'block' }}
            />
          )}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          <HighlightedSnippet text={note.title} query={query} />
        </span>
      </div>

      {/* Breadcrumb — only if nested */}
      {ancestors.length > 0 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: 21,
            marginBottom: snippet ? 2 : 0,
          }}
        >
          {ancestors.map((a) => a.title).join(' › ')} ›
        </div>
      )}

      {/* Content snippet — inline, single line, highlight in-flow */}
      {snippet && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            paddingLeft: 21,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
          }}
        >
          <HighlightedSnippet text={snippet} query={query} />
        </div>
      )}
    </button>
  );
}

// useState import needed
import { useState } from 'react';
