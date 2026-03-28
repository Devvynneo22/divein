import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Dropcursor from '@tiptap/extension-dropcursor';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
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
} from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { EmojiPicker } from './EmojiPicker';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { CreateFlashcardModal } from './CreateFlashcardModal';
import { WikiLink } from '../extensions/WikiLink';
import { noteService } from '@/shared/lib/noteService';
import type { Note } from '@/shared/types/note';

// ─── Lowlight setup ──────────────────────────────────────────────────────────

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('json', json);
lowlight.register('sql', sql);
lowlight.register('bash', bash);

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface NoteEditorProps {
  content: string | null;
  noteId?: string;
  onUpdate: (content: string, textContent: string, wordCount: number) => void;
  onNavigateToNote?: (noteId: string) => void;
}

// ─── Slash command state ─────────────────────────────────────────────────────

interface SlashMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

// ─── Wiki-link menu state ────────────────────────────────────────────────────

interface WikiLinkMenuState {
  open: boolean;
  query: string;
  position: { top: number; left: number };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NoteEditor({ content, noteId, onUpdate, onNavigateToNote }: NoteEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker on outside click
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

  // ─── Insert image from file ─────────────────────────────────────────────

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (!editorInstance.current) return; // guard against null editor
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        if (src) {
          editorInstance.current?.chain().focus().setImage({ src }).run();
        }
      };
      reader.readAsDataURL(file);
      // Reset so same file can be picked again
      e.target.value = '';
    },
    []
  );

  // We need a stable ref to the editor for use in callbacks
  const editorInstance = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // disable built-in code block since we use lowlight
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "Press '/' for commands or start typing...",
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Dropcursor,
      CodeBlockLowlight.configure({ lowlight }),
      WikiLink,
    ],
    content: content ? (JSON.parse(content) as object) : undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-base max-w-none focus:outline-none px-1 leading-relaxed',
        style: 'min-height: calc(100vh - 200px)',
      },
      handleClick(view, _pos, event) {
        const target = event.target as HTMLElement;
        const wikiLink = target.closest('[data-wiki-link]');
        if (wikiLink) {
          const noteId = wikiLink.getAttribute('data-note-id');
          if (noteId && onNavigateToNote) {
            onNavigateToNote(noteId);
          }
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'));
        if (!imageFile) return false;

        event.preventDefault();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          if (src) {
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src });
            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);
          }
        };
        reader.readAsDataURL(imageFile);
        return true;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              if (src) {
                const { schema } = view.state;
                const node = schema.nodes.image.create({ src });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const json = JSON.stringify(ed.getJSON());
        const text = ed.getText();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        onUpdate(json, text, wordCount);
      }, 500);
    },
  });

  // Keep the stable ref in sync
  useEffect(() => {
    editorInstance.current = editor;
  }, [editor]);

  // Track text selection state for toolbar flashcard button
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

  // Sync content when note changes
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      if (currentContent !== content) {
        editor.commands.setContent(JSON.parse(content) as object);
      }
    } else if (editor && !content) {
      editor.commands.clearContent();
    }
  }, [content, editor]);

  // ─── Slash command & wiki-link detection via keydown ─────────────────────

  const lastKeyRef = useRef<string>('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!editor) return;

      if (slashMenu.open || wikiLinkMenu.open) {
        // Navigation handled inside respective menus via window listener
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
            // Load notes for the suggestion list
            noteService.list({ isTrashed: false }).then((allNotes) => {
              setWikiLinkNotes(allNotes);
            });
            setWikiLinkMenu({
              open: true,
              query: '',
              position: {
                top: rect.bottom + window.scrollY + 4,
                left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
              },
            });
          }
        }
        lastKeyRef.current = '';
        return;
      }

      lastKeyRef.current = e.key;

      if (e.key === '/') {
        // Determine caret position for menu
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const wrapRect = editorWrapRef.current?.getBoundingClientRect();
          if (rect && wrapRect) {
            setSlashMenu({
              open: true,
              query: '',
              position: {
                top: rect.bottom + window.scrollY + 4,
                left: Math.min(rect.left + window.scrollX, window.innerWidth - 280),
              },
            });
          }
        }
      }
    },
    [editor, slashMenu.open, wikiLinkMenu.open]
  );

  // Track typed query after '/' and close menu on backspace past '/'
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
      // If there's a space in the query, close the menu
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

  // Track typed query after '[[' and close menu on backspace past '[['
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
      // If there's a newline or ]] in the query, close the menu
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
      {/* ─── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] flex-wrap shrink-0">
        {/* Undo / Redo */}
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

        {/* Text formatting */}
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
          onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
          active={editor.isActive('highlight')}
          icon={<Highlighter size={14} />}
          title="Highlight"
        />

        {/* Text color picker */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            title="Text color"
            className="p-1.5 rounded transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-0.5"
          >
            <span className="text-xs font-bold" style={{ color: editor.getAttributes('textStyle').color as string | undefined ?? 'inherit' }}>
              A
            </span>
            <span className="text-[10px] leading-none">▾</span>
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl flex gap-1 flex-wrap" style={{ width: 120 }}>
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
                className="w-full text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mt-1"
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

        {/* Lists */}
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

        {/* Image */}
        <ToolbarButton
          onClick={triggerFileInput}
          active={false}
          icon={<ImageIcon size={14} />}
          title="Insert image"
        />

        {/* Emoji */}
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

        <Divider />

        {/* Create Flashcard from selection */}
        <ToolbarButton
          onClick={() => handleCreateFlashcard()}
          active={false}
          icon={<Brain size={14} />}
          title={hasSelection ? 'Create Flashcard from Selection' : 'Select text first to create a flashcard'}
        />
      </div>

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
        className="flex-1 overflow-y-auto px-8 py-6"
        onKeyDown={handleKeyDown}
      >
        <div className="max-w-3xl mx-auto">
          {/* Bubble menu */}
          <EditorBubbleMenu editor={editor} onCreateFlashcard={handleCreateFlashcard} />

          {/* Content */}
          <EditorContent editor={editor} />
        </div>
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
    </div>
  );
}

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function Divider() {
  return <div className="w-px h-4 bg-[var(--color-border)] mx-1" />;
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
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
      }`}
    >
      {icon}
    </button>
  );
}
