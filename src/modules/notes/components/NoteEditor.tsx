import { EditorContent } from '@tiptap/react';
import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Underline as UnderlineIcon,
  Highlighter,
  ImageIcon,
  SmilePlus,
  CheckSquare,
  Code2,
  Brain,
  Search,
  Columns2,
  Table as TableIcon,
  StickyNote as StickyNoteIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { EmojiPicker } from './EmojiPicker';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { CreateFlashcardModal } from './CreateFlashcardModal';
import { FindReplaceBar } from './FindReplaceBar';
import type { Note } from '@/shared/types/note';

// ─── Text color palette ──────────────────────────────────────────────────────

const TEXT_COLORS = [
  { color: '#fafafa', label: 'White' },
  { color: '#a1a1aa', label: 'Gray' },
  { color: '#ef4444', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#eab308', label: 'Yellow' },
  { color: '#22c55e', label: 'Green' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#ec4899', label: 'Pink' },
];

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
}: NoteEditorProps) {
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showReplaceField, setShowReplaceField] = useState(false);

  // Word count & last saved
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [lastSavedText, setLastSavedText] = useState<string>('');
  const lastSavedRef = useRef<Date | null>(null);

  // ─── Close color picker on outside click ──────────────────────────────────

  useEffect(() => {
    if (!showColorPicker) return;
    function handler(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

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

  // Context checks
  const isInCodeBlock = editor.isActive('codeBlock');
  const isInTable = editor.isActive('table');
  const isImageSelected = editor.isActive('image');

  return (
    <div className="flex flex-col h-full relative">
      {/* ─── Styles injected ─────────────────────────────────────────── */}
      <style>{EDITOR_STYLES}</style>

      {/* ─── Toolbar (hidden in zen mode) ────────────────────────────── */}
      {!zenMode && (
        <div
          className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap shrink-0"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
            minHeight: 40,
          }}
        >
          {/* History group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            active={false}
            icon={<Undo size={14} />}
            title="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            active={false}
            icon={<Redo size={14} />}
            title="Redo (Ctrl+Shift+Z)"
          />

          <Divider />

          {/* Formatting group */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            icon={<Bold size={14} />}
            title="Bold (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            icon={<Italic size={14} />}
            title="Italic (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            icon={<UnderlineIcon size={14} />}
            title="Underline (Ctrl+U)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            icon={<Strikethrough size={14} />}
            title="Strikethrough"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()
            }
            active={editor.isActive('highlight')}
            icon={<Highlighter size={14} />}
            title="Highlight"
          />

          {/* Text color picker */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              title="Text color"
              className="p-1.5 rounded transition-colors flex items-center gap-0.5"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    (editor.getAttributes('textStyle').color as string | undefined) ??
                    'inherit',
                }}
              >
                A
              </span>
              <span className="text-[10px] leading-none">▾</span>
            </button>
            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-1 z-50 p-2 rounded-xl flex gap-1 flex-wrap"
                style={{
                  width: 120,
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
                {TEXT_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    title={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-5 h-5 rounded border border-black/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                  className="w-full text-xs mt-1 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <Divider />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            icon={<Heading1 size={14} />}
            title="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            icon={<Heading2 size={14} />}
            title="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            icon={<Heading3 size={14} />}
            title="Heading 3"
          />

          <Divider />

          {/* Block types */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            icon={<List size={14} />}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            icon={<ListOrdered size={14} />}
            title="Ordered List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            icon={<CheckSquare size={14} />}
            title="Task List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            icon={<Quote size={14} />}
            title="Blockquote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            icon={<Code2 size={14} />}
            title="Code Block"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            icon={<Minus size={14} />}
            title="Divider"
          />

          <Divider />

          {/* Insert group */}
          <ToolbarButton
            onClick={triggerFileInput}
            active={false}
            icon={<ImageIcon size={14} />}
            title="Insert image"
          />

          <div className="relative">
            <ToolbarButton
              onClick={() => setShowEmojiPicker((v) => !v)}
              active={showEmojiPicker}
              icon={<SmilePlus size={14} />}
              title="Insert emoji"
            />
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={(emoji) => {
                  editor.chain().focus().insertContent(emoji).run();
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            active={editor.isActive('table')}
            icon={<TableIcon size={14} />}
            title="Insert table"
          />

          <ToolbarButton
            onClick={() => editor.chain().focus().insertColumns().run()}
            active={false}
            icon={<Columns2 size={14} />}
            title="Two columns"
          />

          <ToolbarButton
            onClick={() => editor.chain().focus().insertCallout('info').run()}
            active={false}
            icon={<span className="text-xs">ℹ️</span>}
            title="Insert callout"
          />

          <ToolbarButton
            onClick={() => editor.chain().focus().insertStickyNote('yellow').run()}
            active={false}
            icon={<StickyNoteIcon size={14} />}
            title="Insert sticky note"
          />

          <Divider />

          {/* Tools group */}
          <ToolbarButton
            onClick={() => {
              setShowFindReplace((v) => !v);
              setShowReplaceField(false);
            }}
            active={showFindReplace}
            icon={<Search size={14} />}
            title="Find & Replace (Ctrl+F)"
          />

          <ToolbarButton
            onClick={() => handleCreateFlashcard()}
            active={false}
            icon={<Brain size={14} />}
            title={
              hasSelection
                ? 'Create Flashcard from Selection'
                : 'Select text first to create a flashcard'
            }
          />

          <ToolbarButton
            onClick={() => onToggleZen?.()}
            active={zenMode}
            icon={<Maximize2 size={14} />}
            title="Zen mode (Ctrl+Shift+F)"
          />

          {/* Context-sensitive: Code block language selector */}
          {isInCodeBlock && (
            <>
              <Divider />
              <select
                value={(editor.getAttributes('codeBlock').language as string) ?? 'plaintext'}
                onChange={(e) => {
                  editor
                    .chain()
                    .focus()
                    .updateAttributes('codeBlock', { language: e.target.value })
                    .run();
                }}
                className="text-xs rounded px-1.5 py-1 ml-1"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  outline: 'none',
                }}
                title="Code language"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Context-sensitive: Table controls */}
          {isInTable && (
            <>
              <Divider />
              <TableControls editor={editor} />
            </>
          )}

          {/* Context-sensitive: Image alignment */}
          {isImageSelected && (
            <>
              <Divider />
              <ImageAlignControls editor={editor} />
            </>
          )}
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

      {/* ─── Image alignment floating toolbar (shown when image active) ─ */}
      {isImageSelected && (
        <ImageFloatingToolbar editor={editor} />
      )}

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

// ─── Image floating toolbar ───────────────────────────────────────────────────

function ImageFloatingToolbar({ editor }: { editor: NonNullable<ReturnType<typeof import('@tiptap/react').useEditor>> }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const { view } = editor;
    const { from } = editor.state.selection;
    const coords = view.coordsAtPos(from);
    setPos({ top: coords.top - 50, left: coords.left });
  }, [editor]);

  if (!pos) return null;

  const currentAlign = (editor.getAttributes('image').align as string) ?? 'center';

  return (
    <div
      className="fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg"
      style={{
        top: pos.top,
        left: pos.left,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-popup)',
      }}
    >
      {(
        [
          { align: 'left', label: '← Left', icon: <AlignLeft size={12} /> },
          { align: 'center', label: '↔ Center', icon: <AlignCenter size={12} /> },
          { align: 'right', label: '→ Right', icon: <AlignRight size={12} /> },
        ] as const
      ).map(({ align, label, icon }) => (
        <button
          key={align}
          title={label}
          onClick={() => editor.chain().focus().updateAttributes('image', { align }).run()}
          className="p-1.5 rounded transition-colors"
          style={{
            backgroundColor:
              currentAlign === align ? 'var(--color-accent-soft)' : 'transparent',
            color:
              currentAlign === align ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}
        >
          {icon}
        </button>
      ))}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--color-border)' }} />
      <button
        title="Remove image"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        className="p-1.5 rounded transition-colors"
        style={{ color: 'var(--color-danger)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Context-sensitive: Table controls ───────────────────────────────────────

function TableControls({ editor }: { editor: NonNullable<ReturnType<typeof import('@tiptap/react').useEditor>> }) {
  const btns = [
    { label: 'Add row ↓', action: () => editor.chain().focus().addRowAfter().run() },
    { label: 'Add col →', action: () => editor.chain().focus().addColumnAfter().run() },
    { label: 'Del row', action: () => editor.chain().focus().deleteRow().run() },
    { label: 'Del col', action: () => editor.chain().focus().deleteColumn().run() },
    { label: 'Del table', action: () => editor.chain().focus().deleteTable().run() },
  ];
  return (
    <div className="flex items-center gap-1">
      {btns.map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          className="px-2 py-0.5 text-[11px] rounded transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Context-sensitive: Image alignment ──────────────────────────────────────

function ImageAlignControls({ editor }: { editor: NonNullable<ReturnType<typeof import('@tiptap/react').useEditor>> }) {
  const currentAlign = (editor.getAttributes('image').align as string) ?? 'center';
  return (
    <div className="flex items-center gap-1">
      {(['left', 'center', 'right'] as const).map((align) => (
        <button
          key={align}
          onClick={() => editor.chain().focus().updateAttributes('image', { align }).run()}
          className="px-2 py-0.5 text-[11px] rounded capitalize transition-colors"
          style={{
            backgroundColor:
              currentAlign === align ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
            color: currentAlign === align ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {align}
        </button>
      ))}
    </div>
  );
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      className="w-px h-4 mx-1"
      style={{ backgroundColor: 'var(--color-border)' }}
    />
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
  title,
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{
        backgroundColor: active ? 'var(--color-accent-muted)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }
      }}
    >
      {icon}
    </button>
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
  border-radius: 4px;
  padding: 14px 16px;
  margin: 8px 0;
  box-shadow: 2px 3px 8px rgba(0,0,0,0.12);
  font-family: inherit;
  position: relative;
}
.sticky-note::before {
  content: '📌';
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 14px;
}
.sticky-note--yellow { background: #fef3c7; border: 1px solid #d97706; }
.sticky-note--pink { background: #fce7f3; border: 1px solid #db2777; }
.sticky-note--blue { background: #dbeafe; border: 1px solid #2563eb; }
.sticky-note--green { background: #d1fae5; border: 1px solid #059669; }
.sticky-note--lavender { background: #ede9fe; border: 1px solid #7c3aed; }

/* Dark mode sticky note overrides */
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
