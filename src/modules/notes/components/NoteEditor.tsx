import { EditorContent } from '@tiptap/react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { CreateFlashcardModal } from './CreateFlashcardModal';
import { FindReplaceBar } from './FindReplaceBar';
import { NoteEditorRibbon } from './NoteEditorRibbon';
import type { Note } from '@/shared/types/note';

// ─── Code languages ───────────────────────────────────────────────────────────

const CODE_LANGUAGES = [
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'css',
  'html',
  'sql',
  'bash',
  'json',
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  editor: ReturnType<typeof import('@tiptap/react').useEditor>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerFileInput: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  noteId?: string;
  note?: Note;
  onNavigateToNote?: (noteId: string) => void;
  zenMode?: boolean;
  onToggleZen?: () => void;
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

// ─── Slash command state ─────────────────────────────────────────────────────

interface SlashMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

interface WikiLinkMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NoteEditor({
  editor,
  fileInputRef,
  triggerFileInput,
  handleFileChange,
  noteId,
  onNavigateToNote,
  zenMode = false,
  onToggleZen,
  rightPanelOpen = false,
  onToggleRightPanel,
}: NoteEditorProps) {
  const editorWrapRef = useRef<HTMLDivElement>(null);

  const [flashcardModal, setFlashcardModal] = useState<{ open: boolean; text: string }>({
    open: false,
    text: '',
  });
  const [hasSelection, setHasSelection] = useState(false);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    open: false,
    query: '',
    position: { top: 0, left: 0 },
  });
  const [wikiLinkMenu, setWikiLinkMenu] = useState<WikiLinkMenuState>({
    open: false,
    query: '',
    position: { top: 0, left: 0 },
  });
  const [wikiLinkNotes, setWikiLinkNotes] = useState<Note[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showReplaceField, setShowReplaceField] = useState(false);

  // Word count & last saved
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [lastSavedText, setLastSavedText] = useState<string>('');
  const lastSavedRef = useRef<Date | null>(null);

  // ─── Selection tracking ───────────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to, empty } = editor.state.selection;
      setHasSelection(!empty && from !== to);
    };
    editor.on('selectionUpdate', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, [editor]);

  // ─── Word count tracking ──────────────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    const updateCounts = () => {
      const text = editor.getText();
      const wc = text.split(/\s+/).filter(Boolean).length;
      setWordCount(wc);
      setReadingTime(Math.max(1, Math.round(wc / 200)));
      lastSavedRef.current = new Date();
      setLastSavedText(formatTime(new Date()));
    };
    editor.on('update', updateCounts);
    // Initialize
    updateCounts();
    return () => {
      editor.off('update', updateCounts);
    };
  }, [editor]);

  // ─── Ctrl+F / Ctrl+H keyboard shortcut ───────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
        setShowReplaceField(false);
      } else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(true);
        setShowReplaceField(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ─── Slash command & wiki-link detection via keydown ─────────────────────

  const lastKeyRef = useRef<string>('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!editor) return;

      if (slashMenu.open || wikiLinkMenu.open) {
        lastKeyRef.current = e.key;
        return;
      }

      // Detect [[ for wiki-link
      if (e.key === '[' && lastKeyRef.current === '[') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect) {
            import('@/shared/lib/noteService').then(({ noteService }) => {
              noteService.list({ isTrashed: false }).then((allNotes) => {
                setWikiLinkNotes(allNotes);
              });
            });
            setWikiLinkMenu({
              open: true,
              query: '',
              position: {
                top: rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - 280),
              },
            });
          }
        }
        lastKeyRef.current = '';
        return;
      }

      lastKeyRef.current = e.key;

      if (e.key === '/') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect) {
            setSlashMenu({
              open: true,
              query: '',
              position: {
                top: rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - 280),
              },
            });
          }
        }
      }
    },
    [editor, slashMenu.open, wikiLinkMenu.open],
  );

  // Track slash query
  useEffect(() => {
    if (!editor || !slashMenu.open) return;
    const update = () => {
      const { from, $from } = editor.state.selection;
      const lineStart = $from.start();
      const textBeforeCursor = editor.state.doc.textBetween(lineStart, from);
      const slashIdx = textBeforeCursor.lastIndexOf('/');
      if (slashIdx === -1) {
        setSlashMenu((prev) => ({ ...prev, open: false }));
        return;
      }
      const query = textBeforeCursor.slice(slashIdx + 1);
      if (query.includes(' ')) {
        setSlashMenu((prev) => ({ ...prev, open: false }));
        return;
      }
      setSlashMenu((prev) => ({ ...prev, query }));
    };
    editor.on('update', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor, slashMenu.open]);

  // Track wiki-link query
  useEffect(() => {
    if (!editor || !wikiLinkMenu.open) return;
    const update = () => {
      const { from, $from } = editor.state.selection;
      const lineStart = $from.start();
      const textBeforeCursor = editor.state.doc.textBetween(lineStart, from);
      const triggerIdx = textBeforeCursor.lastIndexOf('[[');
      if (triggerIdx === -1) {
        setWikiLinkMenu((prev) => ({ ...prev, open: false }));
        return;
      }
      const query = textBeforeCursor.slice(triggerIdx + 2);
      if (query.includes('\n') || query.includes(']]')) {
        setWikiLinkMenu((prev) => ({ ...prev, open: false }));
        return;
      }
      setWikiLinkMenu((prev) => ({ ...prev, query }));
    };
    editor.on('update', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor, wikiLinkMenu.open]);

  const handleCreateFlashcard = useCallback(
    (text?: string) => {
      if (!editor) return;
      const selectedText =
        text ??
        (() => {
          const { from, to } = editor.state.selection;
          return editor.state.doc.textBetween(from, to, ' ');
        })();
      if (selectedText.trim()) {
        setFlashcardModal({ open: true, text: selectedText });
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full relative">
      {/* ─── Styles injected ─────────────────────────────────────────── */}
      <style>{EDITOR_STYLES}</style>

      {/* ─── Ribbon (hidden in zen mode) ─────────────────────────────── */}
      {!zenMode && (
        <NoteEditorRibbon
          editor={editor}
          triggerFileInput={triggerFileInput}
          showFindReplace={showFindReplace}
          onToggleFindReplace={() => { setShowFindReplace((v) => !v); setShowReplaceField(false); }}
          zenMode={zenMode}
          onToggleZen={() => onToggleZen?.()}
          rightPanelOpen={rightPanelOpen}
          onToggleRightPanel={() => onToggleRightPanel?.()}
          hasSelection={hasSelection}
          onCreateFlashcard={() => handleCreateFlashcard()}
          showEmojiPicker={showEmojiPicker}
          onToggleEmojiPicker={() => setShowEmojiPicker((v) => !v)}
        />
      )}

      {/* ─── Code block language selector (context, outside ribbon) ──── */}
      {!zenMode && editor.isActive('codeBlock') && (
        <div
          className="flex items-center px-3 py-1 shrink-0"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginRight: 6 }}>Language:</span>
          <select
            value={(editor.getAttributes('codeBlock').language as string) ?? 'plaintext'}
            onChange={(e) => {
              editor.chain().focus().updateAttributes('codeBlock', { language: e.target.value }).run();
            }}
            className="text-xs rounded px-1.5 py-1"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              outline: 'none',
            }}
            title="Code language"
          >
            {CODE_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      )}

      {/* ─── Find & Replace bar ───────────────────────────────────────── */}
      {showFindReplace && (
        <FindReplaceBar
          editor={editor}
          onClose={() => setShowFindReplace(false)}
          showReplace={showReplaceField}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ─── Editor area ─────────────────────────────────────────────── */}
      <div
        ref={editorWrapRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingLeft: zenMode ? undefined : undefined,
          paddingRight: zenMode ? undefined : undefined,
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="mx-auto py-8"
          style={{
            maxWidth: zenMode ? 680 : 768,
            paddingLeft: zenMode ? 32 : 32,
            paddingRight: zenMode ? 32 : 32,
          }}
        >
          {/* Bubble menu */}
          <EditorBubbleMenu editor={editor} onCreateFlashcard={handleCreateFlashcard} />

          {/* Content */}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* ─── Status bar (word count) ──────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-1 flex items-center gap-2"
        style={{
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-bg-primary)',
          fontSize: 11,
        }}
      >
        <span>{wordCount} words</span>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span>~{readingTime} min read</span>
        {lastSavedText && (
          <>
            <span style={{ color: 'var(--color-border)' }}>·</span>
            <span>Saved {lastSavedText}</span>
          </>
        )}
      </div>

      {/* ─── Slash command menu ───────────────────────────────────────── */}
      {slashMenu.open && (
        <SlashCommandMenu
          editor={editor}
          query={slashMenu.query}
          position={slashMenu.position}
          onClose={() => setSlashMenu((prev) => ({ ...prev, open: false }))}
          triggerFileInput={triggerFileInput}
        />
      )}

      {/* ─── Wiki-link suggestion menu ────────────────────────────────── */}
      {wikiLinkMenu.open && (
        <WikiLinkSuggestion
          editor={editor}
          query={wikiLinkMenu.query}
          position={wikiLinkMenu.position}
          notes={wikiLinkNotes}
          onClose={() => setWikiLinkMenu((prev) => ({ ...prev, open: false }))}
        />
      )}

      {/* ─── Create Flashcard modal ──────────────────────────────────── */}
      {flashcardModal.open && (
        <CreateFlashcardModal
          selectedText={flashcardModal.text}
          sourceNoteId={noteId}
          onClose={() => setFlashcardModal({ open: false, text: '' })}
        />
      )}

      {/* ─── Zen mode exit button ────────────────────────────────────── */}
      {zenMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => onToggleZen?.()}
            className="px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              boxShadow: 'var(--shadow-popup)',
            }}
          >
            Exit Zen Mode (Esc)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Editor styles ────────────────────────────────────────────────────────────

const EDITOR_STYLES = `
/* ── Callout blocks ────────────────────────────────────────────────────────── */
.callout {
  border-radius: 8px;
  padding: 12px 14px;
  margin: 8px 0;
  border-left: 3px solid;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.callout-icon {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1.5;
  user-select: none;
}
.callout-content {
  flex: 1;
  min-width: 0;
}
[data-callout-type="info"] { background: var(--color-accent-soft); border-color: var(--color-accent); }
[data-callout-type="warning"] { background: var(--color-warning-soft); border-color: var(--color-warning); }
[data-callout-type="success"] { background: var(--color-success-soft); border-color: var(--color-success); }
[data-callout-type="danger"] { background: var(--color-danger-soft); border-color: var(--color-danger); }
[data-callout-type="note"] { background: var(--color-bg-tertiary); border-color: var(--color-border-strong); }

/* ── Two-column layout ─────────────────────────────────────────────────────── */
.columns-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 8px 0;
}
.column {
  min-height: 40px;
  padding: 4px;
  border-radius: 4px;
}
.column:focus-within {
  outline: 1px dashed var(--color-border-hover);
}

/* ── Table ─────────────────────────────────────────────────────────────────── */
.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  table-layout: fixed;
}
.ProseMirror th, .ProseMirror td {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
  min-width: 80px;
  vertical-align: top;
}
.ProseMirror th {
  background: var(--color-bg-tertiary);
  font-weight: 600;
}
.ProseMirror .selectedCell {
  background: var(--color-accent-soft);
}
.column-resize-handle {
  background-color: var(--color-accent);
  bottom: 0;
  pointer-events: none;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
}
.tableWrapper {
  overflow-x: auto;
}

/* ── Horizontal rule ───────────────────────────────────────────────────────── */
.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 16px 0;
}

/* ── Sticky notes ──────────────────────────────────────────────────────────── */
.sticky-note {
  border-radius: 6px;
  padding: 14px 16px;
  margin: 10px 0;
  box-shadow: 2px 3px 10px rgba(0,0,0,0.10);
  position: relative;
  border: 1px solid;
  border-top-width: 3px;
}
.sticky-note--yellow { background: #fef3c7; border-color: #d97706; }
.sticky-note--pink { background: #fce7f3; border-color: #db2777; }
.sticky-note--blue { background: #dbeafe; border-color: #2563eb; }
.sticky-note--green { background: #d1fae5; border-color: #059669; }
.sticky-note--lavender { background: #ede9fe; border-color: #7c3aed; }
[data-theme="dark"] .sticky-note--yellow { background: rgba(254,243,199,0.1); border-color: #d97706; }
[data-theme="dark"] .sticky-note--pink { background: rgba(252,231,243,0.1); border-color: #db2777; }
[data-theme="dark"] .sticky-note--blue { background: rgba(219,234,254,0.1); border-color: #2563eb; }
[data-theme="dark"] .sticky-note--green { background: rgba(209,250,229,0.1); border-color: #059669; }
[data-theme="dark"] .sticky-note--lavender { background: rgba(237,233,254,0.1); border-color: #7c3aed; }

/* ── Image alignment ───────────────────────────────────────────────────────── */
.image-align-left { margin-right: auto; display: block; }
.image-align-center { margin: 0 auto; display: block; }
.image-align-right { margin-left: auto; display: block; }
.image-align-float-left { float: left; margin: 0 16px 8px 0; }
.image-align-float-right { float: right; margin: 0 0 8px 16px; }

/* ── Search highlights ─────────────────────────────────────────────────────── */
.search-match {
  background-color: #fef08a;
  border-radius: 2px;
}
[data-theme="dark"] .search-match {
  background-color: rgba(254,240,138,0.3);
  color: #fef08a;
}
.search-match-current {
  background-color: var(--color-accent);
  color: white;
  border-radius: 2px;
}

/* ── Divider ornamental ────────────────────────────────────────────────────── */
.divider-ornamental {
  text-align: center;
  color: var(--color-text-muted);
  margin: 12px 0;
  letter-spacing: 0.5em;
  user-select: none;
}
`;
