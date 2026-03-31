import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { useActivityStore } from '@/shared/stores/activityStore';
import { FileText, Search, Maximize2 } from 'lucide-react';
import { useZenModeStore, useZenShortcut } from '@/shared/stores/zenModeStore';
import {
  useNote,
  useNoteAncestors,
  useNoteChildren,
  useCreateNote,
  useUpdateNote,
  useTrashNote,
  useRestoreNote,
  useBacklinks,
  useNotes,
} from './hooks/useNotes';
import { NotesSidebar } from './components/NotesSidebar';
import { NoteEditor } from './components/NoteEditor';
import { NoteHeader } from './components/NoteHeader';
import { NoteBreadcrumb } from './components/NoteBreadcrumb';
import { BacklinksPanel } from './components/BacklinksPanel';
import { NoteRightPanel } from './components/NoteRightPanel';
import { NoteCanvas } from './components/NoteCanvas';
import { NoteGraph } from './components/NoteGraph';
import { TemplatePickerModal, type NoteTemplate } from './components/TemplatePickerModal';
import { useNoteEditor } from './hooks/useNoteEditor';
import type { Note } from '@/shared/types/note';
import { EmptyState } from '@/shared/components/EmptyState';

type NoteViewMode = 'document' | 'canvas' | 'graph';

// ─── Highlight helper ─────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        style={{
          backgroundColor: '#facc15',
          color: '#1a1a1a',
          borderRadius: 2,
          padding: '0 1px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function getSnippet(text: string | null, query: string, windowSize = 100): string {
  if (!text || !query.trim()) return '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, windowSize);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + windowSize - 40);
  const snippet = text.slice(start, end);
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '');
}

// ─── NoteSearchModal ─────────────────────────────────────────────────────────

interface NoteSearchModalProps {
  notes: Note[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

function NoteSearchModal({ notes, onSelect, onClose }: NoteSearchModalProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const results: Note[] = trimmed
    ? notes.filter((n) => {
        if (n.isTrashed) return false;
        const titleMatch = n.title.toLowerCase().includes(trimmed.toLowerCase());
        const contentMatch = n.contentText
          ? n.contentText.toLowerCase().includes(trimmed.toLowerCase())
          : false;
        return titleMatch || contentMatch;
      })
    : notes.filter((n) => !n.isTrashed).slice(0, 20);

  // Reset cursor when results change
  useEffect(() => { setCursor(0); }, [trimmed]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        const note = results[cursor];
        if (note) { onSelect(note.id); onClose(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, cursor, onClose, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          borderRadius: 14,
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '70vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Search size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes by title or content…"
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 400,
              fontFamily: 'inherit',
              color: 'var(--color-text-primary)',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '2px 5px',
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 ? (
            <div
              style={{
                padding: '24px 18px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              {trimmed ? 'No notes match your query.' : 'Start typing to search…'}
            </div>
          ) : (
            results.map((note, idx) => {
              const isActive = idx === cursor;
              const snippet = getSnippet(note.contentText, trimmed);

              return (
                <div
                  key={note.id}
                  onClick={() => { onSelect(note.id); onClose(); }}
                  onMouseEnter={() => setCursor(idx)}
                  style={{
                    padding: '10px 18px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--color-accent-soft)' : 'transparent',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    transition: 'background-color 0.1s ease',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      flexShrink: 0,
                      fontSize: 18,
                      lineHeight: 1,
                      marginTop: 2,
                      width: 22,
                      textAlign: 'center',
                    }}
                  >
                    {note.icon ? (
                      note.icon
                    ) : (
                      <FileText
                        size={16}
                        style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {highlightText(note.title, trimmed)}
                    </div>

                    {/* Meta: updated + snippet */}
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        {new Date(note.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {snippet && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--color-text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 420,
                          }}
                        >
                          {highlightText(snippet, trimmed)}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {note.tags.filter((t) => !/^(__daily__|__\w+__|(\d{4}-\d{2}-\d{2}))$/.test(t)).length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {note.tags
                          .filter((t) => !/^(__daily__|__\w+__|(\d{4}-\d{2}-\d{2}))$/.test(t))
                          .map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 10,
                                backgroundColor: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-muted)',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Keyboard hint */}
                  {isActive && (
                    <kbd
                      style={{
                        fontSize: 10,
                        color: 'var(--color-accent)',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--color-accent)',
                        borderRadius: 4,
                        padding: '2px 5px',
                        fontFamily: 'monospace',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    >
                      ↵
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '7px 18px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          {[
            { keys: '↑↓', desc: 'navigate' },
            { keys: '↵', desc: 'open' },
            { keys: 'Esc', desc: 'close' },
          ].map(({ keys, desc }) => (
            <span key={desc} style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd
                style={{
                  fontSize: 10,
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontFamily: 'monospace',
                }}
              >
                {keys}
              </kbd>
              {desc}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── NotesPage ────────────────────────────────────────────────────────────────

export function NotesPage() {
  const addActivity = useActivityStore((s) => s.addActivity);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<NoteViewMode>('document');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Zen mode — global shared store
  const zenMode = useZenModeStore((s) => s.isZen);
  const toggleZenStore = useZenModeStore((s) => s.toggleZen);
  const setZenStore = useZenModeStore((s) => s.setZen);
  useZenShortcut();

  const toggleZen = useCallback((value?: boolean) => {
    if (value !== undefined) {
      setZenStore(value);
    } else {
      toggleZenStore();
    }
  }, [toggleZenStore, setZenStore]);

  // Zen toolbar auto-hide state
  const [zenToolbarVisible, setZenToolbarVisible] = useState(true);
  const zenHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: selectedNote } = useNote(selectedNoteId);
  const { data: ancestors = [] } = useNoteAncestors(selectedNoteId);
  const { data: children = [] } = useNoteChildren(selectedNoteId);
  const { data: backlinks = [] } = useBacklinks(selectedNoteId);
  const { data: allNotes = [] } = useNotes();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();

  // ─── Editor ──────────────────────────────────────────────────────

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

  // ─── Keyboard shortcuts ──────────────────────────────────────────
  // Note: zen shortcuts (Alt+Z / Ctrl+Shift+F / Esc) handled by useZenShortcut() above

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P → search modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && !e.shiftKey) {
        e.preventDefault();
        setSearchModalOpen((v) => !v);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
      toast.info('Note created');
      addActivity({
        type: 'note_created',
        title: `Created note '${note.title}'`,
        icon: '📄',
        entityId: note.id,
        entityType: 'note',
      });
    },
    [createNote, addActivity],
  );

  const handleCreateChild = useCallback(
    async (parentId: string) => {
      const note = await createNote.mutateAsync({ title: 'Untitled', parentId });
      setExpandedIds((prev) => new Set([...prev, parentId]));
      setSelectedNoteId(note.id);
      toast.info('Note created');
      addActivity({
        type: 'note_created',
        title: `Created note 'Untitled'`,
        icon: '📄',
        entityId: note.id,
        entityType: 'note',
      });
    },
    [createNote, addActivity],
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
      trashNote.mutate(id, {
        onSuccess: () => {
          toast.warning('Moved to trash', {
            label: 'Undo',
            onClick: () => restoreNote.mutate(id),
          });
        },
      });
    },
    [selectedNoteId, trashNote, restoreNote],
  );

  // ─── Rename ──────────────────────────────────────────────────────

  const handleRename = useCallback((id: string) => {
    setRenamingId(id);
    setSelectedNoteId(id);
  }, []);

  // suppress unused warning
  void renamingId;

  // ─── Tag filter ──────────────────────────────────────────────────

  const handleTagFilter = useCallback((tag: string | null) => {
    setActiveTag(tag);
  }, []);

  // ─── Zen toolbar auto-hide ───────────────────────────────────────

  useEffect(() => {
    if (!zenMode) {
      setZenToolbarVisible(true);
      return;
    }

    // Show toolbar initially, then hide after 3s
    setZenToolbarVisible(true);
    zenHideTimer.current = setTimeout(() => setZenToolbarVisible(false), 3000);

    const handleMouseMove = (e: MouseEvent) => {
      // Show toolbar when mouse is within 80px of top
      if (e.clientY <= 80) {
        setZenToolbarVisible(true);
        if (zenHideTimer.current) clearTimeout(zenHideTimer.current);
        zenHideTimer.current = setTimeout(() => setZenToolbarVisible(false), 3000);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (zenHideTimer.current) clearTimeout(zenHideTimer.current);
    };
  }, [zenMode]);

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ position: 'relative' }}
    >
      {/* ── Zen floating toolbar ────────────────────────────────────────── */}
      {zenMode && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderRadius: 999,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))',
            opacity: zenToolbarVisible ? 1 : 0,
            pointerEvents: zenToolbarVisible ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        >
          {/* Editable title */}
          {selectedNote && (
            <input
              type="text"
              defaultValue={selectedNote.title}
              onBlur={(e) => handleTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                minWidth: 120,
                maxWidth: 300,
                fontFamily: 'inherit',
              }}
            />
          )}

          {/* Word count */}
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {selectedNote?.wordCount ?? 0} words
          </span>

          {/* Divider */}
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--color-border)' }} />

          {/* Exit zen button */}
          <button
            onClick={() => toggleZen(false)}
            title="Exit Zen Mode (Esc)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

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
          activeTag={activeTag}
          onTagFilter={handleTagFilter}
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
                    { key: 'graph',    label: '🕸️ Graph' },
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

                {/* 🔍 Search button */}
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="rounded transition-colors"
                  title="Quick search (Ctrl+P)"
                  style={{
                    marginLeft: 6,
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
                  <Search size={14} />
                </button>

                {/* Zen mode button */}
                <button
                  onClick={() => toggleZen()}
                  title="Enter Zen mode (Alt+Z)"
                  style={{
                    marginLeft: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: 'inherit',
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
                  <Maximize2 size={12} />
                  Zen
                </button>

                {/* Right panel toggle (document mode only) */}
                {viewMode === 'document' && !zenMode && (
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

            {/* Active tag banner (below breadcrumb, above content) */}
            {!zenMode && activeTag && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 32px',
                  backgroundColor: 'var(--color-accent-soft)',
                  borderBottom: '1px solid var(--color-accent)',
                  fontSize: 12,
                  color: 'var(--color-accent)',
                  fontWeight: 500,
                }}
              >
                <span>Filtered by tag:</span>
                <span
                  style={{
                    padding: '1px 7px',
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                >
                  #{activeTag}
                </span>
                <button
                  onClick={() => setActiveTag(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--color-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 14,
                    lineHeight: 1,
                    fontWeight: 700,
                  }}
                  title="Clear tag filter"
                >
                  ×
                </button>
              </div>
            )}

            {/* Main content area */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {viewMode === 'graph' ? (
                /* ── Graph mode ── */
                <div className="flex-1 min-w-0 overflow-hidden" style={{ position: 'relative' }}>
                  <NoteGraph
                    selectedNoteId={selectedNoteId}
                    onSelectNote={handleSelect}
                  />
                </div>
              ) : viewMode === 'canvas' ? (
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
                        onToggleZen={() => toggleZen()}
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
          <EmptyState
            icon="📝"
            title="Start writing"
            description="Create your first note or pick a template to get started"
            actionLabel="New Note"
            onAction={handleCreateRoot}
            secondaryLabel="Browse Templates"
            onSecondary={() => setShowTemplatePicker(true)}
          />
        )}
      </div>

      {/* Template picker modal */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Quick search modal (Ctrl+P) */}
      {searchModalOpen && (
        <NoteSearchModal
          notes={allNotes}
          onSelect={(id) => { handleSelect(id); }}
          onClose={() => setSearchModalOpen(false)}
        />
      )}
    </div>
  );
}


