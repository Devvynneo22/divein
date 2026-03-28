import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { FileText } from 'lucide-react';
import type { Note } from '@/shared/types/note';

interface WikiLinkSuggestionProps {
  editor: Editor;
  query: string;
  position: { top: number; left: number };
  notes: Note[];
  onClose: () => void;
}

export function WikiLinkSuggestion({
  editor,
  query,
  position,
  notes,
  onClose,
}: WikiLinkSuggestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = notes.filter((note) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return note.title.toLowerCase().includes(q);
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const insertWikiLink = useCallback(
    (note: Note) => {
      // Delete the [[ + query text
      const { from } = editor.state.selection;
      const deleteLength = query.length + 2; // +2 for the '[['
      editor
        .chain()
        .focus()
        .deleteRange({ from: from - deleteLength, to: from })
        .insertContent({
          type: 'wikiLink',
          attrs: { noteId: note.id, title: note.title },
        })
        .insertContent(' ')
        .run();

      onClose();
    },
    [editor, query, onClose],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          insertWikiLink(filtered[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, insertWikiLink, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div
        className="fixed z-[100] w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl overflow-hidden"
        style={{ top: position.top, left: position.left }}
      >
        <div className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]">
          No matching pages
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[100] w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-2 py-1.5 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
          Link to page
        </span>
      </div>
      <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
        {filtered.map((note, idx) => (
          <button
            key={note.id}
            onMouseDown={(e) => {
              e.preventDefault();
              insertWikiLink(note);
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              idx === selectedIndex
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            <span className="shrink-0 text-[var(--color-text-muted)]">
              {note.icon ? (
                <span className="text-sm">{note.icon}</span>
              ) : (
                <FileText size={14} />
              )}
            </span>
            <span className="text-sm truncate">{note.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
