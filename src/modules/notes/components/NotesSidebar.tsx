import { useState } from 'react';
import { Search, Plus, Trash2, Star, FileText, X } from 'lucide-react';
import { useNoteTree, useFavorites, useNoteSearch, useNoteStats, useDebouncedValue } from '../hooks/useNotes';
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
}: NotesSidebarProps) {
  const [rawQuery, setRawQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const searchQuery = useDebouncedValue(rawQuery, 300);

  const { data: tree = [] } = useNoteTree();
  const { data: favorites = [] } = useFavorites();
  const { data: searchResults = [] } = useNoteSearch(searchQuery);
  const { data: stats } = useNoteStats();

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
        className="px-3 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-8 pr-8 py-2 rounded-lg text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
          {rawQuery && (
            <button
              onClick={() => setRawQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <X size={13} />
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

      {/* Bottom: Trash + New Page */}
      <div
        className="p-2 space-y-0.5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
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
