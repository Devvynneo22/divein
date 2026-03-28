import { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Highlighter,
  Brain,
} from 'lucide-react';

interface EditorBubbleMenuProps {
  editor: Editor;
  onCreateFlashcard?: (selectedText: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export function EditorBubbleMenu({ editor, onCreateFlashcard }: EditorBubbleMenuProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty || from === to) {
      setVisible(false);
      return;
    }

    // Don't show for node selections (images, code blocks, etc.)
    const isNodeSelection = editor.state.selection.constructor.name === 'NodeSelection';
    if (isNodeSelection) {
      setVisible(false);
      return;
    }

    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      setVisible(false);
      return;
    }

    const range = domSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      setVisible(false);
      return;
    }

    const menuWidth = 380; // approximate
    setCoords({
      top: rect.top + window.scrollY - 48,
      left: Math.max(8, rect.left + window.scrollX + rect.width / 2 - menuWidth / 2),
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', () => setVisible(false));

    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('blur', () => setVisible(false));
    };
  }, [editor, updatePosition]);

  const handleLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', prev ?? 'https://');
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl"
      style={{ top: coords.top, left: coords.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <Underline size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline code"
      >
        <Code size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        active={editor.isActive('highlight')}
        title="Highlight"
      >
        <Highlighter size={13} />
      </BubbleButton>

      <BubbleButton
        onClick={handleLink}
        active={editor.isActive('link')}
        title="Link"
      >
        <Link size={13} />
      </BubbleButton>

      {onCreateFlashcard && (
        <>
          <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
          <BubbleButton
            onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to, ' ');
              onCreateFlashcard(text);
            }}
            active={false}
            title="Create Flashcard"
          >
            <Brain size={13} />
          </BubbleButton>
        </>
      )}

      <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />

      {/* Color palette */}
      {COLORS.map((color) => (
        <button
          key={color}
          title={`Text color: ${color}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setColor(color).run();
          }}
          className="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function BubbleButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
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
      {children}
    </button>
  );
}
