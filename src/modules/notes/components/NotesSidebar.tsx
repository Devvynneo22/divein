import { useState } from 'react';
import { Search, Plus, Trash2, Star, FileText, X } from 'lucide-react';
import { useNoteTree, useFavorites, useNoteSearch, useNoteStats, useDebouncedValue, useNotes, useCreateOrOpenDailyNote } from '../hooks/useNotes';
import { NoteTreeItem } from './NoteTreeItem';
import { NoteSearchResults } from './NoteSearchResults';
import { TrashPanel } from './TrashPanel';
import type { NoteTreeNode } from '@/shared/types/note';

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
}

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
}: NotesSidebarProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const searchQuery = useDebouncedValue(rawQuery, 300);

  const { data: tree = [] } = useNoteTree();
  const { data: favorites = [] } = useFavorites();
  const { data: searchResults = [] } = useNoteSearch(searchQuery);
  const { data: stats } = useNoteStats();
  const { data: allNotes = [] } = useNotes();

  const dailyNoteMutation = useCreateOrOpenDailyNote();

  const dailyNotes = allNotes
    .filter((n) => n.tags.includes('__daily__') && !n.isTrashed)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const isSearching = rawQuery.trim().length > 0;

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
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelect(note.id)}
                    className="group flex items-center gap-2 py-1.5 px-2 mx-2 rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: note.id === selectedId ? 'var(--color-accent-soft)' : 'transparent',
                      color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (note.id !== selectedId) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span className="shrink-0 text-sm leading-none">📅</span>
                    <span className="text-sm truncate flex-1">{shortLabel}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="mb-3">
              <SectionHeader icon={<Star size={11} />} label="Favorites" />
              {favorites.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelect(note.id)}
                  className="group flex items-center gap-2 py-2 px-2 mx-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    backgroundColor: note.id === selectedId ? 'var(--color-accent-soft)' : 'transparent',
                    color: note.id === selectedId ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (note.id !== selectedId) {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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
                  <span className="text-sm font-medium truncate flex-1">{note.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pages tree */}
          <div>
            <SectionHeader icon={<FileText size={11} />} label="Pages" />
            {tree.length === 0 ? (
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
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
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
    </div>
  );
}
