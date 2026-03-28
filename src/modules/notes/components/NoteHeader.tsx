import { useState, useRef, useEffect } from 'react';
import { FileText, MoreHorizontal, FileDown, FileType } from 'lucide-react';
import { format } from 'date-fns';
import { PageIconPicker } from './PageIconPicker';
import { exportNoteToMarkdown, exportNoteToPDF } from '@/shared/lib/exportService';
import type { Note } from '@/shared/types/note';

interface NoteHeaderProps {
  note: Note;
  childCount: number;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
}

export function NoteHeader({ note, childCount, onTitleChange, onIconChange }: NoteHeaderProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [localTitle, setLocalTitle] = useState(note.title);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync title when note changes
  useEffect(() => {
    setLocalTitle(note.title);
  }, [note.id, note.title]);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function handler(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  function handleTitleChange(value: string) {
    setLocalTitle(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) onTitleChange(value.trim());
    }, 400);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  return (
    <div className="px-8 pt-6 pb-4">
      {/* Cover color bar */}
      {note.coverColor && (
        <div
          className="h-2 rounded-full mb-4 -mx-8"
          style={{ backgroundColor: note.coverColor }}
        />
      )}

      {/* Icon + title row */}
      <div className="flex items-start gap-3">
        {/* Page icon */}
        <div className="relative mt-1" ref={iconPickerRef}>
          <button
            onClick={() => setShowIconPicker((v) => !v)}
            className="text-3xl leading-none hover:opacity-80 transition-opacity w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-tertiary)]"
            title="Change icon"
          >
            {note.icon ? (
              note.icon
            ) : (
              <FileText size={28} className="text-[var(--color-text-muted)]" />
            )}
          </button>
          {showIconPicker && (
            <PageIconPicker
              onSelect={onIconChange}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </div>

        {/* Title */}
        <input
          type="text"
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          className="flex-1 text-3xl font-bold bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] min-w-0"
        />

        {/* Export menu */}
        <div className="relative mt-1" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="Export note"
          >
            <MoreHorizontal size={20} />
          </button>
          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-52 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl"
            >
              <button
                onClick={() => {
                  exportNoteToMarkdown(note);
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <FileDown size={16} />
                Export as Markdown
              </button>
              <button
                onClick={() => {
                  exportNoteToPDF(note);
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <FileType size={16} />
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-2 mt-2 ml-13 text-xs text-[var(--color-text-muted)]" style={{ paddingLeft: 52 }}>
        <span>Created {format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
        {note.wordCount > 0 && (
          <>
            <span>·</span>
            <span>{note.wordCount.toLocaleString()} words</span>
          </>
        )}
        {childCount > 0 && (
          <>
            <span>·</span>
            <span>{childCount} sub-{childCount === 1 ? 'page' : 'pages'}</span>
          </>
        )}
      </div>
    </div>
  );
}
