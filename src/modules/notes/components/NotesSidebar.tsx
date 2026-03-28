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
      <div className="w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
        <TrashPanel onBack={() => setShowTrash(false)} />
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      {/* Search */}
      <div className="p-2 border-b border-[var(--color-border)]">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-7 pr-7 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          {rawQuery && (
            <button
              onClick={() => setRawQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
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
        <div className="flex-1 overflow-y-auto">
          {/* Favorites */}
          {favorites.length > 0 && (
            <div className="pt-3 pb-1">
              <SectionHeader icon={<Star size={11} />} label="Favorites" />
              {favorites.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelect(note.id)}
                  className={`group flex items-center gap-1.5 h-7 px-3 mx-1 rounded-md cursor-pointer transition-colors ${
                    note.id === selectedId
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                      : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <span className="shrink-0 text-sm leading-none">
                    {note.icon ?? (
                      <FileText
                        size={13}
                        className={note.id === selectedId ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
                      />
                    )}
                  </span>
                  <span className="text-xs font-medium truncate flex-1">{note.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pages tree */}
          <div className="pt-3 pb-1">
            <SectionHeader icon={<FileText size={11} />} label="Pages" />
            {tree.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
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
      <div className="border-t border-[var(--color-border)] p-2 space-y-1">
        <button
          onClick={() => setShowTrash(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <Trash2 size={13} />
          <span>Trash</span>
          {stats && stats.trashed > 0 && (
            <span className="ml-auto text-[10px] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded-full">
              {stats.trashed}
            </span>
          )}
        </button>

        <button
          onClick={onCreateRoot}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
        >
          <Plus size={13} />
          <span>New Page</span>
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 mb-0.5">
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
    </div>
  );
}
