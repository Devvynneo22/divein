import { useState, useCallback } from 'react';
import { FileText } from 'lucide-react';
import {
  useNote,
  useNoteAncestors,
  useNoteChildren,
  useCreateNote,
  useUpdateNote,
  useTrashNote,
  useBacklinks,
} from './hooks/useNotes';
import { NotesSidebar } from './components/NotesSidebar';
import { NoteEditor } from './components/NoteEditor';
import { NoteHeader } from './components/NoteHeader';
import { NoteBreadcrumb } from './components/NoteBreadcrumb';
import { BacklinksPanel } from './components/BacklinksPanel';
import { TemplatePickerModal, type NoteTemplate } from './components/TemplatePickerModal';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const { data: selectedNote } = useNote(selectedNoteId);
  const { data: ancestors = [] } = useNoteAncestors(selectedNoteId);
  const { data: children = [] } = useNoteChildren(selectedNoteId);
  const { data: backlinks = [] } = useBacklinks(selectedNoteId);

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

  const handleCreateRoot = useCallback(() => {
    setShowTemplatePicker(true);
  }, []);

  const handleCreateFromTemplate = useCallback(
    async (template: NoteTemplate) => {
      setShowTemplatePicker(false);
      const note = await createNote.mutateAsync({
        title: template.defaultTitle,
        content: template.content || undefined,
        tags: template.tags ?? [],
      });
      setSelectedNoteId(note.id);
    },
    [createNote]
  );

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

  const handleCoverChange = useCallback(
    (cover: string | null) => {
      if (selectedNoteId) {
        updateNote.mutate({ id: selectedNoteId, data: { coverColor: cover } });
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
        onShowTemplates={() => setShowTemplatePicker(true)}
      />

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <>
            {/* Breadcrumb bar */}
            <div
              className="flex items-center px-8 py-2 shrink-0"
              style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-primary)',
              }}
            >
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
                onCoverChange={handleCoverChange}
              />

              {/* Editor fills remaining space, no dividing border */}
              <NoteEditor
                content={selectedNote.content}
                noteId={selectedNote.id}
                onUpdate={handleEditorUpdate}
                onNavigateToNote={handleSelect}
              />

              {/* Backlinks panel */}
              <BacklinksPanel
                backlinks={backlinks}
                onNavigate={handleSelect}
              />
            </div>
          </>
        ) : (
          <EmptyState onCreateRoot={handleCreateRoot} />
        )}
      </div>

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreateRoot }: { onCreateRoot: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center space-y-6 py-16 px-8">
        <div
          className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <FileText
            size={40}
            style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}
          />
        </div>
        <div className="space-y-2">
          <p
            className="text-xl font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No page selected
          </p>
          <p
            className="text-sm max-w-xs mx-auto leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Select a page from the sidebar to start reading or editing, or create a fresh page to get started.
          </p>
        </div>
        <button
          onClick={onCreateRoot}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          Create first page
        </button>
      </div>
    </div>
  );
}
