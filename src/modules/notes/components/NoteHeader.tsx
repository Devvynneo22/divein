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
    <div className="px-8 pt-10 pb-6 max-w-3xl mx-auto w-full">
      {/* Cover color bar */}
      {note.coverColor && (
        <div
          className="h-2 rounded-full mb-6"
          style={{ backgroundColor: note.coverColor }}
        />
      )}

      {/* Icon button */}
      <div className="mb-4" ref={iconPickerRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowIconPicker((v) => !v)}
          className="text-4xl leading-none transition-opacity hover:opacity-70 w-14 h-14 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: showIconPicker ? 'var(--color-bg-tertiary)' : 'transparent' }}
          title="Change icon"
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => {
            if (!showIconPicker) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {note.icon ? (
            note.icon
          ) : (
            <FileText size={32} style={{ color: 'var(--color-text-muted)' }} />
          )}
        </button>
        {showIconPicker && (
          <PageIconPicker
            onSelect={onIconChange}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>

      {/* Title row */}
      <div className="flex items-start gap-3">
        <input
          type="text"
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          className="flex-1 text-4xl font-bold bg-transparent border-none outline-none min-w-0 leading-tight"
          style={{
            color: 'var(--color-text-primary)',
          }}
        />

        {/* Export menu */}
        <div className="relative mt-2 shrink-0" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            title="Export note"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <MoreHorizontal size={20} />
          </button>
          {showExportMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-52 py-1 rounded-xl"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-popup)',
              }}
            >
              <button
                onClick={() => {
                  exportNoteToMarkdown(note);
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                <FileDown size={15} />
                Export as Markdown
              </button>
              <button
                onClick={() => {
                  exportNoteToPDF(note);
                  setShowExportMenu(false);
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                <FileType size={15} />
                Export as PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div
        className="flex items-center gap-2 mt-3 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span>Created {format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
        {note.wordCount > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{note.wordCount.toLocaleString()} words</span>
          </>
        )}
        {childCount > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{childCount} sub-{childCount === 1 ? 'page' : 'pages'}</span>
          </>
        )}
      </div>
    </div>
  );
}
