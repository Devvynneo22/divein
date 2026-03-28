import { useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import {
  useNote,
  useNoteAncestors,
  useNoteChildren,
  useCreateNote,
  useUpdateNote,
  useTrashNote,
} from './hooks/useNotes';
import { NotesSidebar } from './components/NotesSidebar';
import { NoteEditor } from './components/NoteEditor';
import { NoteHeader } from './components/NoteHeader';
import { NoteBreadcrumb } from './components/NoteBreadcrumb';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const { data: selectedNote } = useNote(selectedNoteId);
  const { data: ancestors = [] } = useNoteAncestors(selectedNoteId);
  const { data: children = [] } = useNoteChildren(selectedNoteId);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const trashNote = useTrashNote();

  // ─── Navigation ──────────────────────────────────────────────────

  const handleSelect = useCallback((id: string) => {
    setSelectedNoteId(id);
  }, []);

  const handleHome = useCallback(() => {
    setSelectedNoteId(null);
  }, []);

  // ─── Expand / Collapse ───────────────────────────────────────────

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ─── Create ──────────────────────────────────────────────────────

  const handleCreateRoot = useCallback(async () => {
    const note = await createNote.mutateAsync({ title: 'Untitled' });
    setSelectedNoteId(note.id);
  }, [createNote]);

  const handleCreateChild = useCallback(
    async (parentId: string) => {
      const note = await createNote.mutateAsync({ title: 'Untitled', parentId });
      setExpandedIds((prev) => new Set([...prev, parentId]));
      setSelectedNoteId(note.id);
    },
    [createNote]
  );

  // ─── Update ──────────────────────────────────────────────────────

  const handleEditorUpdate = useCallback(
    (content: string, textContent: string, wordCount: number) => {
      if (selectedNoteId) {
        updateNote.mutate({ id: selectedNoteId, data: { content, contentText: textContent, wordCount } });
      }
    },
    [selectedNoteId, updateNote]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (selectedNoteId && title.trim()) {
        updateNote.mutate({ id: selectedNoteId, data: { title: title.trim() } });
      }
    },
    [selectedNoteId, updateNote]
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      if (selectedNoteId) {
        updateNote.mutate({ id: selectedNoteId, data: { icon } });
      }
    },
    [selectedNoteId, updateNote]
  );

  const handleTogglePin = useCallback(
    (id: string, isPinned: boolean) => {
      updateNote.mutate({ id, data: { isPinned: !isPinned } });
    },
    [updateNote]
  );

  // ─── Trash ───────────────────────────────────────────────────────

  const handleTrash = useCallback(
    (id: string) => {
      if (selectedNoteId === id) setSelectedNoteId(null);
      trashNote.mutate(id);
    },
    [selectedNoteId, trashNote]
  );

  // ─── Rename (inline in sidebar) ──────────────────────────────────

  const handleRename = useCallback((id: string) => {
    setRenamingId(id);
    setSelectedNoteId(id);
  }, []);

  // suppress unused warning — renamingId is passed to sidebar
  void renamingId;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <NotesSidebar
        selectedId={selectedNoteId}
        expandedIds={expandedIds}
        onSelect={handleSelect}
        onToggleExpand={handleToggleExpand}
        onCreateRoot={handleCreateRoot}
        onCreateChild={handleCreateChild}
        onTrash={handleTrash}
        onTogglePin={handleTogglePin}
        onRename={handleRename}
      />

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <>
            {/* Breadcrumb bar */}
            <div className="flex items-center px-8 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
              <NoteBreadcrumb
                ancestors={ancestors}
                currentNote={selectedNote}
                onNavigate={handleSelect}
                onHome={handleHome}
              />
            </div>

            {/* Scrollable content — seamless page feel */}
            <div className="flex-1 overflow-y-auto">
              {/* Page header */}
              <NoteHeader
                note={selectedNote}
                childCount={children.length}
                onTitleChange={handleTitleChange}
                onIconChange={handleIconChange}
              />

              {/* Editor fills remaining space, no dividing border */}
              <NoteEditor
                content={selectedNote.content}
                onUpdate={handleEditorUpdate}
              />
            </div>
          </>
        ) : (
          <EmptyState onCreateRoot={handleCreateRoot} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreateRoot }: { onCreateRoot: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <FileText
          size={56}
          className="mx-auto text-[var(--color-text-muted)] opacity-20"
        />
        <div>
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            No page selected
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Select a page from the sidebar or create a new one
          </p>
        </div>
        <button
          onClick={onCreateRoot}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Create first page
        </button>
      </div>
    </div>
  );
}
