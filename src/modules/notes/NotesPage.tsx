import { useState, useCallback, useEffect } from 'react';
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
import { NoteRightPanel } from './components/NoteRightPanel';
import { NoteCanvas } from './components/NoteCanvas';
import { TemplatePickerModal, type NoteTemplate } from './components/TemplatePickerModal';
import { useNoteEditor } from './hooks/useNoteEditor';

type NoteViewMode = 'document' | 'canvas';


export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [viewMode, setViewMode] = useState<NoteViewMode>('document');


  const { data: selectedNote } = useNote(selectedNoteId);
  const { data: ancestors = [] } = useNoteAncestors(selectedNoteId);
  const { data: children = [] } = useNoteChildren(selectedNoteId);
  const { data: backlinks = [] } = useBacklinks(selectedNoteId);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const trashNote = useTrashNote();

  // ─── Editor (lifted from NoteEditor into this level) ─────────────────────

  const handleEditorUpdate = useCallback(
    (content: string, textContent: string, wordCount: number) => {
      if (selectedNoteId) {
        updateNote.mutate({
          id: selectedNoteId,
          data: { content, contentText: textContent, wordCount },
        });
      }
    },
    [selectedNoteId, updateNote],
  );

  const { editor, fileInputRef, triggerFileInput, handleFileChange } = useNoteEditor({
    content: selectedNote?.content ?? null,
    onUpdate: handleEditorUpdate,
    onNavigateToNote: (id) => setSelectedNoteId(id),
  });

  // Right panel is manual-only — no auto-detect

  // ─── Zen mode keyboard shortcut ───────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setZenMode((v) => !v);
      }
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zenMode]);

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
    [createNote],
  );

  const handleCreateChild = useCallback(
    async (parentId: string) => {
      const note = await createNote.mutateAsync({ title: 'Untitled', parentId });
      setExpandedIds((prev) => new Set([...prev, parentId]));
      setSelectedNoteId(note.id);
    },
    [createNote],
  );

  // ─── Update ──────────────────────────────────────────────────────

  const handleTitleChange = useCallback(
    (title: string) => {
      if (selectedNoteId && title.trim()) {
        updateNote.mutate({ id: selectedNoteId, data: { title: title.trim() } });
      }
    },
    [selectedNoteId, updateNote],
  );

  const handleIconChange = useCallback(
    (icon: string | null) => {
      if (selectedNoteId) {
        updateNote.mutate({ id: selectedNoteId, data: { icon } });
      }
    },
    [selectedNoteId, updateNote],
  );

  const handleCoverChange = useCallback(
    (cover: string | null) => {
      if (selectedNoteId) {
        updateNote.mutate({ id: selectedNoteId, data: { coverColor: cover } });
      }
    },
    [selectedNoteId, updateNote],
  );

  const handleTogglePin = useCallback(
    (id: string, isPinned: boolean) => {
      updateNote.mutate({ id, data: { isPinned: !isPinned } });
    },
    [updateNote],
  );

  // ─── Trash ───────────────────────────────────────────────────────

  const handleTrash = useCallback(
    (id: string) => {
      if (selectedNoteId === id) setSelectedNoteId(null);
      trashNote.mutate(id);
    },
    [selectedNoteId, trashNote],
  );

  // ─── Rename (inline in sidebar) ──────────────────────────────────

  const handleRename = useCallback((id: string) => {
    setRenamingId(id);
    setSelectedNoteId(id);
  }, []);

  // suppress unused warning
  void renamingId;

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* Sidebar (hidden in zen mode) */}
      {!zenMode && (
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
      )}

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <>
            {/* Breadcrumb bar (hidden in zen mode) */}
            {!zenMode && (
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

                {/* View mode toggle: Document / Canvas */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    marginLeft: 12,
                    padding: '2px',
                    borderRadius: 7,
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    flexShrink: 0,
                  }}
                >
                  {([
                    { key: 'document', label: '📄 Doc' },
                    { key: 'canvas',   label: '🎨 Canvas' },
                  ] as { key: NoteViewMode; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setViewMode(key)}
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '3px 9px',
                        borderRadius: 5,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: viewMode === key ? 'var(--color-bg-elevated)' : 'transparent',
                        color: viewMode === key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        boxShadow: viewMode === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.1s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Right panel toggle (document mode only) */}
                {viewMode === 'document' && (
                  <button
                    onClick={() => setRightPanelOpen((v) => !v)}
                    className="ml-auto rounded transition-colors"
                    title={rightPanelOpen ? 'Hide outline' : 'Show outline'}
                    style={{
                      color: 'var(--color-text-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '3px 8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 500 }}>
                      {rightPanelOpen ? '⊟ Outline' : '⊞ Outline'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Main content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {viewMode === 'canvas' ? (
                /* ── Canvas mode ── */
                <div className="flex-1 min-w-0 overflow-hidden">
                  <NoteCanvas noteId={selectedNote.id} />
                </div>
              ) : (
                <>
                  {/* ── Document mode ── */}
                  <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                      {/* Page header */}
                      {!zenMode && (
                        <NoteHeader
                          note={selectedNote}
                          childCount={children.length}
                          onTitleChange={handleTitleChange}
                          onIconChange={handleIconChange}
                          onCoverChange={handleCoverChange}
                        />
                      )}

                      {/* Editor */}
                      <NoteEditor
                        editor={editor}
                        fileInputRef={fileInputRef}
                        triggerFileInput={triggerFileInput}
                        handleFileChange={handleFileChange}
                        noteId={selectedNote.id}
                        note={selectedNote}
                        onNavigateToNote={handleSelect}
                        zenMode={zenMode}
                        onToggleZen={() => setZenMode((v) => !v)}
                        rightPanelOpen={rightPanelOpen}
                        onToggleRightPanel={() => setRightPanelOpen((v) => !v)}
                      />

                      {/* Backlinks panel */}
                      {!zenMode && (
                        <BacklinksPanel
                          backlinks={backlinks}
                          onNavigate={handleSelect}
                        />
                      )}
                    </div>
                  </div>

                  {/* Right panel */}
                  {!zenMode && rightPanelOpen && (
                    <div
                      className="shrink-0 overflow-hidden flex flex-col"
                      style={{
                        width: 240,
                        borderLeft: '1px solid var(--color-border)',
                        transition: 'width 0.2s ease',
                      }}
                    >
                      <NoteRightPanel
                        editor={editor}
                        note={selectedNote}
                        onNavigateToHeading={() => {}}
                      />
                    </div>
                  )}
                </>
              )}
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
            Select a page from the sidebar to start reading or editing, or create a fresh page
            to get started.
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
