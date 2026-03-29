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
  const [isHovered, setIsHovered] = useState(false);
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
        className="group relative flex items-center cursor-pointer select-none transition-colors mx-2 rounded-lg"
        style={{
          paddingLeft: indentPx,
          paddingTop: '6px',
          paddingBottom: '6px',
          paddingRight: '4px',
          backgroundColor: isSelected
            ? 'var(--color-accent-soft)'
            : isHovered
            ? 'var(--color-bg-hover)'
            : 'transparent',
          color: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(node.id)}
      >
        {/* Expand/collapse chevron */}
        <button
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors mr-0.5"
          style={{
            opacity: node.hasChildren ? 1 : 0,
            pointerEvents: node.hasChildren ? 'auto' : 'none',
            color: 'var(--color-text-muted)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (node.hasChildren) onToggleExpand(node.id);
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {isExpanded ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronRight size={13} />
          )}
        </button>

        {/* Icon */}
        <span className="shrink-0 mr-2 text-sm leading-none">
          {node.icon ? (
            node.icon
          ) : isExpanded && node.hasChildren ? (
            <FolderOpen
              size={15}
              style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            />
          ) : (
            <FileText
              size={15}
              style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            />
          )}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-medium truncate pr-1">
          {node.title}
        </span>

        {/* Hover actions */}
        <div
          className="flex items-center gap-0.5 shrink-0 mr-0.5 transition-opacity"
          style={{ opacity: isHovered || showMenu ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onCreateChild(node.id)}
            title="New sub-page"
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <Plus size={12} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((v) => !v)}
              title="More options"
              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <MoreHorizontal size={12} />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1.5 z-50"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
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
                <div
                  className="my-1"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                />
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
      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
      style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        if (!danger) e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-secondary)';
      }}
    >
      {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
      {label}
    </button>
  );
}
