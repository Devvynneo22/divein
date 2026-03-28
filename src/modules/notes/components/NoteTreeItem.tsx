import { memo, useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, FileText, Star, Trash2, FolderOpen } from 'lucide-react';
import type { NoteTreeNode } from '@/shared/types/note';

interface NoteTreeItemProps {
  node: NoteTreeNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onTrash: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onRename: (id: string) => void;
}

export const NoteTreeItem = memo(function NoteTreeItem({
  node,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreateChild,
  onTrash,
  onTogglePin,
  onRename,
}: NoteTreeItemProps) {
  const isSelected = node.id === selectedId;
  const isExpanded = expandedIds.has(node.id);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const indentPx = node.depth * 16 + 8;

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <div>
      <div
        className={`group relative flex items-center h-7 cursor-pointer rounded-md mx-1 select-none transition-colors ${
          isSelected
            ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
            : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
        }`}
        style={{ paddingLeft: indentPx }}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand/collapse chevron */}
        <button
          className={`shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-[var(--color-bg-elevated)] transition-colors mr-0.5 ${
            node.hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (node.hasChildren) onToggleExpand(node.id);
          }}
        >
          {isExpanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}
        </button>

        {/* Icon */}
        <span className="shrink-0 mr-1.5 text-sm leading-none">
          {node.icon ? (
            node.icon
          ) : isExpanded && node.hasChildren ? (
            <FolderOpen size={14} className={isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
          ) : (
            <FileText size={14} className={isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
          )}
        </span>

        {/* Title */}
        <span className="flex-1 text-xs font-medium truncate pr-1">
          {node.title}
        </span>

        {/* Hover actions */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onCreateChild(node.id)}
            title="New sub-page"
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <Plus size={11} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              title="More options"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <MoreHorizontal size={11} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl z-50 py-1">
                <MenuItem
                  onClick={() => { onRename(node.id); setShowMenu(false); }}
                  label="Rename"
                />
                <MenuItem
                  onClick={() => { onTogglePin(node.id, node.isPinned); setShowMenu(false); }}
                  label={node.isPinned ? 'Remove from Favorites' : 'Add to Favorites'}
                  icon={<Star size={12} />}
                />
                <MenuItem
                  onClick={() => { onCreateChild(node.id); setShowMenu(false); }}
                  label="New sub-page"
                  icon={<Plus size={12} />}
                />
                <div className="my-1 border-t border-[var(--color-border)]" />
                <MenuItem
                  onClick={() => { onTrash(node.id); setShowMenu(false); }}
                  label="Move to Trash"
                  icon={<Trash2 size={12} />}
                  danger
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.hasChildren && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <NoteTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateChild={onCreateChild}
              onTrash={onTrash}
              onTogglePin={onTogglePin}
              onRename={onRename}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function MenuItem({
  onClick,
  label,
  icon,
  danger,
}: {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-[var(--color-bg-tertiary)] transition-colors ${
        danger
          ? 'text-[var(--color-danger)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {icon && <span className="opacity-70">{icon}</span>}
      {label}
    </button>
  );
}
