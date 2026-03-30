import { useEditor, Extension } from '@tiptap/react';
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
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import { useRef, useCallback, useEffect } from 'react';
import { WikiLink } from '../extensions/WikiLink';
import { Callout } from '../extensions/Callout';
import { Column, Columns } from '../extensions/Columns';
import { StickyNote } from '../extensions/StickyNote';
import { searchPlugin } from './searchPlugin';
// Wrap ProseMirror search plugin as a TipTap extension
const SearchExtension = Extension.create({
  name: 'searchPlugin',
  addProseMirrorPlugins() {
    return [searchPlugin];
  },
});


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

// ─── Custom Image with align attribute ───────────────────────────────────────

const ImageExtended = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') ?? 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align as string,
          class: `image-align-${attributes.align as string}`,
        }),
      },
    };
  },
});

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseNoteEditorOptions {
  content: string | null;
  onUpdate: (content: string, textContent: string, wordCount: number) => void;
  onNavigateToNote?: (noteId: string) => void;
}

export function useNoteEditor({
  content,
  onUpdate,
  onNavigateToNote,
}: UseNoteEditorOptions) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
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
      ImageExtended.configure({
        inline: false,
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Dropcursor,
      CodeBlockLowlight.configure({ lowlight }),
      WikiLink,
      Callout,
      Column,
      Columns,
      StickyNote,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      SearchExtension,
    ],
    content: content
      ? (() => {
          try {
            return JSON.parse(content) as object;
          } catch (e) {
            console.warn('useNoteEditor: failed to parse initial content JSON', e);
            return undefined;
          }
        })()
      : undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-base max-w-none focus:outline-none px-1 leading-relaxed',
        style: 'min-height: calc(100vh - 200px); line-height: 1.75;',
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

  // Handle file input changes for image insertion
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (!editor) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        if (src) {
          editor.chain().focus().setImage({ src }).run();
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [editor],
  );

  // Sync content when note changes
  useEffect(() => {
    if (editor && content && content !== '') {
      const currentContent = JSON.stringify(editor.getJSON());
      if (currentContent !== content) {
        try {
          editor.commands.setContent(JSON.parse(content) as object);
        } catch (e) {
          console.warn('useNoteEditor: failed to parse content JSON on sync', e);
          editor.commands.clearContent();
        }
      }
    } else if (editor && (!content || content === '')) {
      editor.commands.clearContent();
    }
  }, [content, editor]);

    // setWikiLinkNotes is provided but loading is handled in NoteEditor component

  return { editor, fileInputRef, triggerFileInput, handleFileChange };
}
