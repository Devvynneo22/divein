import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
} from 'lucide-react';

interface NoteEditorProps {
  content: string | null;
  onUpdate: (content: string, textContent: string, wordCount: number) => void;
}

export function NoteEditor({ content, onUpdate }: NoteEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Press '/' for commands or start typing...",
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-base max-w-none focus:outline-none min-h-[400px] px-1 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const json = JSON.stringify(editor.getJSON());
        const text = editor.getText();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        onUpdate(json, text, wordCount);
      }, 500);
    },
  });

  // Sync content when note changes
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      if (currentContent !== content) {
        editor.commands.setContent(JSON.parse(content));
      }
    } else if (editor && !content) {
      editor.commands.clearContent();
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--color-border)] flex-wrap">
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
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          icon={<Strikethrough size={14} />}
          title="Strikethrough"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          icon={<Code size={14} />}
          title="Code"
        />

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

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

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

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
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={<Quote size={14} />}
          title="Blockquote"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          icon={<Minus size={14} />}
          title="Divider"
        />

        <div className="w-px h-4 bg-[var(--color-border)] mx-1" />

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
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
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
