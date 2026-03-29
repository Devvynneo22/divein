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

    const menuWidth = 380;
    setCoords({
      top: rect.top - 48,
      left: Math.max(8, rect.left + rect.width / 2 - menuWidth / 2),
    });
    setVisible(true);
  }, [editor]);

  const handleBlur = useCallback(() => setVisible(false), []);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', handleBlur);
    return () => {
      editor.off('selectionUpdate', updatePosition);
      editor.off('blur', handleBlur);
    };
  }, [editor, updatePosition, handleBlur]);

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
      className="fixed z-[100] flex items-center gap-0.5 px-2 py-1.5 rounded-xl"
      style={{
        top: coords.top,
        left: coords.left,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-popup)',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <BubbleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <Underline size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline code"
      >
        <Code size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
        active={editor.isActive('highlight')}
        title="Highlight"
      >
        <Highlighter size={14} />
      </BubbleButton>

      <BubbleButton
        onClick={handleLink}
        active={editor.isActive('link')}
        title="Link"
      >
        <Link size={14} />
      </BubbleButton>

      {onCreateFlashcard && (
        <>
          <Separator />
          <BubbleButton
            onClick={() => {
              const { from, to } = editor.state.selection;
              const text = editor.state.doc.textBetween(from, to, ' ');
              onCreateFlashcard(text);
            }}
            active={false}
            title="Create Flashcard"
          >
            <Brain size={14} />
          </BubbleButton>
        </>
      )}

      <Separator />

      {/* Color palette */}
      {COLORS.map((color) => (
        <button
          key={color}
          title={`Text color: ${color}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setColor(color).run();
          }}
          className="w-4.5 h-4.5 rounded-full hover:scale-110 transition-transform shrink-0"
          style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.15)', width: 18, height: 18 }}
        />
      ))}
    </div>
  );
}

function Separator() {
  return (
    <div
      className="mx-0.5"
      style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)' }}
    />
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
      className="p-1.5 rounded-lg transition-colors"
      style={{
        backgroundColor: active ? 'var(--color-accent-muted)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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
      {children}
    </button>
  );
}
