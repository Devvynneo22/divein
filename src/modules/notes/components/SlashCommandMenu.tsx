import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Image,
  Code2,
  Quote,
  Minus,
  AlertCircle,
  Columns2,
  Table,
  StickyNote as StickyNoteIcon,
} from 'lucide-react';

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (editor: Editor, triggerFileInput?: () => void) => void;
}

const COMMANDS: SlashCommand[] = [
  {
    id: 'heading1',
    label: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={16} />,
    keywords: ['h1', 'heading', 'title', 'heading1'],
    action: (editor) => { editor.chain().focus().toggleHeading({ level: 1 }).run(); },
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={16} />,
    keywords: ['h2', 'heading', 'subtitle', 'heading2'],
    action: (editor) => { editor.chain().focus().toggleHeading({ level: 2 }).run(); },
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={16} />,
    keywords: ['h3', 'heading', 'heading3'],
    action: (editor) => { editor.chain().focus().toggleHeading({ level: 3 }).run(); },
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Unordered list with bullet points',
    icon: <List size={16} />,
    keywords: ['bullet', 'list', 'ul', 'unordered'],
    action: (editor) => { editor.chain().focus().toggleBulletList().run(); },
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Ordered list with numbers',
    icon: <ListOrdered size={16} />,
    keywords: ['numbered', 'ordered', 'list', 'ol', 'number'],
    action: (editor) => { editor.chain().focus().toggleOrderedList().run(); },
  },
  {
    id: 'todo',
    label: 'To-do List',
    description: 'Interactive checkboxes',
    icon: <CheckSquare size={16} />,
    keywords: ['todo', 'task', 'checkbox', 'check'],
    action: (editor) => { editor.chain().focus().toggleTaskList().run(); },
  },
  {
    id: 'image',
    label: 'Image',
    description: 'Upload or insert an image',
    icon: <Image size={16} />,
    keywords: ['image', 'photo', 'picture', 'img', 'upload'],
    action: (_editor, triggerFileInput) => { triggerFileInput?.(); },
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Syntax-highlighted code block',
    icon: <Code2 size={16} />,
    keywords: ['code', 'codeblock', 'snippet', 'pre'],
    action: (editor) => { editor.chain().focus().toggleCodeBlock().run(); },
  },
  {
    id: 'quote',
    label: 'Quote',
    description: 'Blockquote callout',
    icon: <Quote size={16} />,
    keywords: ['quote', 'blockquote'],
    action: (editor) => { editor.chain().focus().toggleBlockquote().run(); },
  },
  {
    id: 'divider',
    label: 'Divider',
    description: 'Horizontal rule / separator',
    icon: <Minus size={16} />,
    keywords: ['divider', 'hr', 'horizontal', 'rule', 'separator'],
    action: (editor) => { editor.chain().focus().setHorizontalRule().run(); },
  },
  {
    id: 'divider-dots',
    label: 'Ornamental Divider',
    description: 'Decorative ⋆ ⋆ ⋆ divider',
    icon: <span className="text-sm">⋆</span>,
    keywords: ['divider', 'dots', 'ornamental', 'separator'],
    action: (editor) => {
      editor.chain().focus().insertContent({
        type: 'paragraph',
        attrs: { class: 'divider-ornamental' },
        content: [{ type: 'text', text: '⋆ ⋆ ⋆' }],
      }).run();
    },
  },
  {
    id: 'divider-wave',
    label: 'Wave Divider',
    description: 'Decorative 〰 divider',
    icon: <span className="text-sm">〰</span>,
    keywords: ['divider', 'wave', 'separator'],
    action: (editor) => {
      editor.chain().focus().insertContent({
        type: 'paragraph',
        attrs: { class: 'divider-ornamental' },
        content: [{ type: 'text', text: '〰〰〰' }],
      }).run();
    },
  },
  // ── Callouts ──────────────────────────────────────────────────────────────
  {
    id: 'callout',
    label: 'Callout',
    description: 'Info callout block',
    icon: <span className="text-sm">ℹ️</span>,
    keywords: ['callout', 'info', 'note', 'alert', 'box'],
    action: (editor) => { editor.chain().focus().insertCallout('info').run(); },
  },
  {
    id: 'callout-info',
    label: 'Info Callout',
    description: 'Blue info callout',
    icon: <span className="text-sm">ℹ️</span>,
    keywords: ['info', 'callout'],
    action: (editor) => { editor.chain().focus().insertCallout('info').run(); },
  },
  {
    id: 'callout-warning',
    label: 'Warning Callout',
    description: 'Yellow warning callout',
    icon: <span className="text-sm">⚠️</span>,
    keywords: ['warning', 'callout', 'caution'],
    action: (editor) => { editor.chain().focus().insertCallout('warning').run(); },
  },
  {
    id: 'callout-success',
    label: 'Success Callout',
    description: 'Green success callout',
    icon: <span className="text-sm">✅</span>,
    keywords: ['success', 'callout', 'ok', 'done'],
    action: (editor) => { editor.chain().focus().insertCallout('success').run(); },
  },
  {
    id: 'callout-danger',
    label: 'Danger Callout',
    description: 'Red danger callout',
    icon: <span className="text-sm">🚨</span>,
    keywords: ['danger', 'callout', 'error', 'alert'],
    action: (editor) => { editor.chain().focus().insertCallout('danger').run(); },
  },
  {
    id: 'callout-note',
    label: 'Note Callout',
    description: 'Neutral note callout',
    icon: <span className="text-sm">📝</span>,
    keywords: ['note', 'callout', 'neutral'],
    action: (editor) => { editor.chain().focus().insertCallout('note').run(); },
  },
  // ── Columns ───────────────────────────────────────────────────────────────
  {
    id: 'columns',
    label: '2 Columns',
    description: 'Two-column layout',
    icon: <Columns2 size={16} />,
    keywords: ['columns', '2col', 'layout', 'grid', 'column'],
    action: (editor) => { editor.chain().focus().insertColumns().run(); },
  },
  // ── Table ─────────────────────────────────────────────────────────────────
  {
    id: 'table',
    label: 'Table',
    description: 'Insert a 3×3 table with headers',
    icon: <Table size={16} />,
    keywords: ['table', 'grid', 'spreadsheet'],
    action: (editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  // ── Sticky notes ──────────────────────────────────────────────────────────
  {
    id: 'sticky',
    label: 'Sticky Note',
    description: 'Yellow sticky note block',
    icon: <StickyNoteIcon size={16} />,
    keywords: ['sticky', 'note', 'post-it', 'yellow'],
    action: (editor) => { editor.chain().focus().insertStickyNote('yellow').run(); },
  },
  {
    id: 'sticky-pink',
    label: 'Pink Sticky Note',
    description: 'Pink sticky note block',
    icon: <span className="text-sm">🌸</span>,
    keywords: ['sticky', 'pink', 'note'],
    action: (editor) => { editor.chain().focus().insertStickyNote('pink').run(); },
  },
  {
    id: 'sticky-blue',
    label: 'Blue Sticky Note',
    description: 'Blue sticky note block',
    icon: <span className="text-sm">💙</span>,
    keywords: ['sticky', 'blue', 'note'],
    action: (editor) => { editor.chain().focus().insertStickyNote('blue').run(); },
  },
  {
    id: 'sticky-green',
    label: 'Green Sticky Note',
    description: 'Green sticky note block',
    icon: <span className="text-sm">💚</span>,
    keywords: ['sticky', 'green', 'note'],
    action: (editor) => { editor.chain().focus().insertStickyNote('green').run(); },
  },
  // ── Old callout as blockquote (keep backward compat) ──────────────────────
  {
    id: 'alert',
    label: 'Alert',
    description: 'Styled info/note box',
    icon: <AlertCircle size={16} />,
    keywords: ['alert', 'blockquote', 'info'],
    action: (editor) => { editor.chain().focus().toggleBlockquote().run(); },
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  query: string;
  position: { top: number; left: number };
  onClose: () => void;
  triggerFileInput: () => void;
}

export function SlashCommandMenu({
  editor,
  query,
  position,
  onClose,
  triggerFileInput,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q))
    );
  });

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      const { from } = editor.state.selection;
      const queryLength = query.length + 1;
      editor.chain().focus().deleteRange({ from: from - queryLength, to: from }).run();
      cmd.action(editor, triggerFileInput);
      onClose();
    },
    [editor, query, onClose, triggerFileInput],
  );

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
        if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, executeCommand, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="fixed z-[100] w-72 rounded-xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-popup)',
      }}
    >
      <div
        className="px-3 py-2"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Commands
        </span>
      </div>
      <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
        {filtered.map((cmd, idx) => (
          <button
            key={cmd.id}
            onMouseDown={(e) => { e.preventDefault(); executeCommand(cmd); }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
            style={{
              backgroundColor:
                idx === selectedIndex ? 'var(--color-accent-soft)' : 'transparent',
              color:
                idx === selectedIndex
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
            }}
          >
            <span className="shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {cmd.icon}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">{cmd.label}</div>
              <div
                className="text-xs truncate"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {cmd.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
