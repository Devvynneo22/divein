import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, Star, FileText, X, Tag } from 'lucide-react';
import {
  useNoteTree,
  useFavorites,
  useNoteSearch,
  useNoteStats,
  useDebouncedValue,
  useNotes,
  useCreateOrOpenDailyNote,
  useUpdateNote,
} from '../hooks/useNotes';
import { SkeletonRow } from '@/shared/components/Skeleton';
import { NoteTreeItem } from './NoteTreeItem';
import { NoteSearchResults } from './NoteSearchResults';
import { TrashPanel } from './TrashPanel';
import type { Note, NoteTreeNode } from '@/shared/types/note';

interface NotesSidebarProps {
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateRoot: () => void;
  onCreateChild: (parentId: string) => void;
  onTrash: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onRename: (id: string) => void;
  onShowTemplates: () => void;
  // Tag filter
  activeTag: string | null;
  onTagFilter: (tag: string | null) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SYSTEM_TAG_RE = /^(__daily__|__\w+__|(\d{4}-\d{2}-\d{2}))$/;

function isSystemTag(tag: string): boolean {
  return SYSTEM_TAG_RE.test(tag);
}

function tagHue(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function tagColor(tag: string): string {
  return `hsl(${tagHue(tag)}, 65%, 55%)`;
}

// ─── RenameInput ─────────────────────────────────────────────────────────────

interface RenameInputProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function RenameInput({ value, onChange, onCommit, onCancel }: RenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        e.stopPropagation();
      }}
      onBlur={onCommit}
      onClick={(e) => e.stopPropagation()}
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontFamily: 'inherit',
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-accent)',
        borderRadius: 4,
        padding: '1px 5px',
        outline: 'none',
        lineHeight: 1.4,
      }}
    />
  );
}

// ─── NotesSidebar ────────────────────────────────────────────────────────────

export function NotesSidebar({
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateRoot,
  onCreateChild,
  onTrash,
  onTogglePin,
  onRename,
  onShowTemplates,
  activeTag,
  onTagFilter,
}: NotesSidebarProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const searchQuery = useDebouncedValue(rawQuery, 300);

  const { data: tree = [], isLoading: treeLoading } = useNoteTree();
  const { data: favorites = [] } = useFavorites();
  const { data: searchResults = [] } = useNoteSearch(searchQuery);
  const { data: stats } = useNoteStats();
  const { data: allNotes = [], isLoading: notesLoading } = useNotes();
  const isNotesLoading = treeLoading || notesLoading;
  const updateNote = useUpdateNote();

  const dailyNoteMutation = useCreateOrOpenDailyNote();

  const dailyNotes = allNotes
    .filter((n) => n.tags.includes('__daily__') && !n.isTrashed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Aggregate unique user tags + counts
  const tagCounts = new Map<string, number>();
  for (const note of allNotes) {
    if (note.isTrashed) continue;
    for (const tag of note.tags) {
      if (!isSystemTag(tag)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
  }
  const userTags = Array.from(tagCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  // Notes filtered by active tag (for tag-filter view)
  const tagFilteredNotes = activeTag
    ? allNotes.filter((n) => !n.isTrashed && n.tags.includes(activeTag))
    : [];

  const isSearching = rawQuery.trim().length > 0;

  // ─── Inline rename helpers ───────────────────────────────────────

  const startRename = useCallback((note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingNoteId(note.id);
    setRenameValue(note.title);
  }, []);

  const commitRename = useCallback((id: string) => {
    if (renameValue.trim()) {
      updateNote.mutate({ id, data: { title: renameValue.trim() } });
    }
    setRenamingNoteId(null);
  }, [renameValue, updateNote]);

  const cancelRename = useCallback(() => {
    setRenamingNoteId(null);
  }, []);

  // ─── Trash view ────────────────────────────────────────────────

  if (showTrash) {
    return (
      <div
        className="w-[280px] shrink-0 flex flex-col"
        style={{
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <TrashPanel onBack={() => setShowTrash(false)} />
      </div>
    );
  }

  return (
    <div
      className="w-[280px] shrink-0 flex flex-col"
      style={{
        borderRight: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      {/* Search */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 9,
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          />
          <input
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search pages..."
            style={{
              width: '100%',
              paddingLeft: 28,
              paddingRight: rawQuery ? 28 : 10,
              paddingTop: 6,
              paddingBottom: 6,
              borderRadius: 7,
              fontSize: 13,
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.4,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
          {rawQuery && (
            <button
              onClick={() => setRawQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tag filter banner */}
        {activeTag && !isSearching && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
              padding: '4px 8px',
              borderRadius: 6,
              backgroundColor: 'var(--color-accent-soft)',
              border: '1px solid var(--color-accent)',
            }}
          >
            <Tag size={10} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-accent)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              #{activeTag}
            </span>
            <button
              onClick={() => onTagFilter(null)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              title="Clear tag filter"
            >
              <X size={11} />
            </button>
          </div>
        )}
      </div>

      {isSearching ? (
        <div className="flex-1 overflow-y-auto">
          <NoteSearchResults
            results={searchResults}
            query={searchQuery}
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect(id);
              setRawQuery('');
            }}
            onClear={() => setRawQuery('')}
          />
        </div>
      ) : activeTag ? (
        /* ── Tag-filtered note list ── */
        <div className="flex-1 overflow-y-auto py-2">
          <SectionHeader
            icon={<Tag size={11} />}
            label={`#${activeTag}`}
            extra={
              <button
                onClick={() => onTagFilter(null)}
                title="Clear filter"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: 'auto',
                  marginRight: 4,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <X size={11} />
              </button>
            }
          />
          {tagFilteredNotes.length === 0 ? (
            <div
              className="px-4 py-3 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              No notes with this tag
            </div>
          ) : (
            tagFilteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelect(note.id)}
                className="group flex items-center gap-2 py-1.5 px-2 mx-2 rounded-lg cursor-pointer"
                style={{
                  backgroundColor: note.id === selectedId ? 'var(--color-accent-soft)' : 'transparent',
                  color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span className="shrink-0 text-sm leading-none">
                  {note.icon ?? (
                    <FileText
                      size={13}
                      style={{ color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                    />
                  )}
                </span>
                <span className="text-sm truncate flex-1">{note.title}</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2">
          {/* Daily Notes — recent */}
          {dailyNotes.length > 0 && (
            <div className="mb-3">
              <SectionHeader icon={<span style={{ fontSize: 10 }}>📅</span>} label="Daily Notes" />
              {dailyNotes.map((note) => {
                const dateTag = note.tags.find((t) => /^\d{4}-\d{2}-\d{2}$/.test(t));
                const shortLabel = dateTag
                  ? new Date(dateTag + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : note.title;
                const isRenaming = renamingNoteId === note.id;

                return (
                  <div
                    key={note.id}
                    onClick={() => { if (!isRenaming) onSelect(note.id); }}
                    onDoubleClick={(e) => startRename(note, e)}
                    className="group flex items-center gap-2 py-1.5 px-2 mx-2 rounded-lg cursor-pointer"
                    style={{
                      backgroundColor: note.id === selectedId ? 'var(--color-accent-soft)' : 'transparent',
                      color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className="shrink-0 text-sm leading-none">📅</span>
                    {isRenaming ? (
                      <RenameInput
                        value={renameValue}
                        onChange={setRenameValue}
                        onCommit={() => commitRename(note.id)}
                        onCancel={cancelRename}
                      />
                    ) : (
                      <span className="text-sm truncate flex-1">{shortLabel}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="mb-3">
              <SectionHeader icon={<Star size={11} />} label="Favorites" />
              {favorites.map((note) => {
                const isRenaming = renamingNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => { if (!isRenaming) onSelect(note.id); }}
                    onDoubleClick={(e) => startRename(note, e)}
                    className="group flex items-center gap-2 py-2 px-2 mx-2 rounded-lg cursor-pointer"
                    style={{
                      backgroundColor: note.id === selectedId ? 'var(--color-accent-soft)' : 'transparent',
                      color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (note.id !== selectedId) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (note.id !== selectedId) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span className="shrink-0 text-sm leading-none">
                      {note.icon ?? (
                        <FileText
                          size={14}
                          style={{ color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                        />
                      )}
                    </span>
                    {isRenaming ? (
                      <RenameInput
                        value={renameValue}
                        onChange={setRenameValue}
                        onCommit={() => commitRename(note.id)}
                        onCancel={cancelRename}
                      />
                    ) : (
                      <span className="text-sm font-medium truncate flex-1">{note.title}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tags */}
          {userTags.length > 0 && (
            <div className="mb-3">
              <SectionHeader icon={<Tag size={11} />} label="Tags" />
              {userTags.map(([tag, count]) => {
                const isActive = activeTag === tag;
                const color = tagColor(tag);
                return (
                  <div
                    key={tag}
                    onClick={() => onTagFilter(isActive ? null : tag)}
                    className="group flex items-center gap-2 py-1.5 px-2 mx-2 rounded-lg cursor-pointer"
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent-soft)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Colored dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                    />
                    <span
                      className="text-sm truncate flex-1"
                      style={{
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      #{tag}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        backgroundColor: isActive ? 'transparent' : 'var(--color-bg-elevated)',
                        padding: '1px 5px',
                        borderRadius: 10,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                    {isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onTagFilter(null); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--color-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                        title="Clear filter"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pages tree */}
          <div>
            <SectionHeader icon={<FileText size={11} />} label="Pages" />
            {isNotesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 8px' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <div
                className="px-4 py-3 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                No pages yet
              </div>
            ) : (
              tree.map((node: NoteTreeNode) => (
                <NoteTreeItem
                  key={node.id}
                  node={node}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onCreateChild={onCreateChild}
                  onTrash={onTrash}
                  onTogglePin={onTogglePin}
                  onRename={onRename}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div
        className="p-2 space-y-0.5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {/* Daily Note */}
        <button
          onClick={async () => {
            const note = await dailyNoteMutation.mutateAsync();
            onSelect(note.id);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-accent)';
            e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: 14 }}>📅</span>
          <span>Today's Note</span>
        </button>

        {/* Templates */}
        <button
          onClick={onShowTemplates}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: 14 }}>📋</span>
          <span>Templates</span>
        </button>

        <button
          onClick={() => setShowTrash(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Trash2 size={14} />
          <span>Trash</span>
          {stats && stats.trashed > 0 && (
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-muted)',
              }}
            >
              {stats.trashed}
            </span>
          )}
        </button>

        <button
          onClick={onCreateRoot}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-accent)';
            e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Plus size={14} />
          <span>New Page</span>
        </button>
      </div>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-4 mb-1"
      style={{ color: 'var(--color-text-muted)' }}
    >
      <span>{icon}</span>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      {extra}
    </div>
  );
}
