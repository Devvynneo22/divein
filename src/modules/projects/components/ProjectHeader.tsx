import { useState } from 'react';
import { Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { Project } from '@/shared/types/project';

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

export function ProjectHeader({
  project,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: ProjectHeaderProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accentColor = project.color ?? 'var(--color-accent)';
  const isArchived = project.status === 'archived';

  return (
    <div className="relative">
      {/* Color accent bar at top */}
      <div
        className="h-1.5 rounded-t-none"
        style={{ backgroundColor: accentColor }}
      />

      <div className="px-6 py-4 flex items-start justify-between gap-4">
        {/* Left: icon + name + description + status */}
        <div className="flex items-start gap-3 min-w-0">
          {project.icon && (
            <span className="text-3xl leading-none mt-0.5 flex-shrink-0">
              {project.icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-2xl font-bold break-words"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {project.name}
              </h1>
              {isArchived && (
                <span
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Archive size={10} />
                  Archived
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <HeaderButton onClick={onEdit} title="Edit project">
            <Edit size={16} />
          </HeaderButton>

          {isArchived ? (
            <HeaderButton onClick={onUnarchive} title="Unarchive project">
              <ArchiveRestore size={16} />
            </HeaderButton>
          ) : (
            <HeaderButton onClick={onArchive} title="Archive project">
              <Archive size={16} />
            </HeaderButton>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs mr-1" style={{ color: 'var(--color-danger)' }}>Delete?</span>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-danger)',
                  color: 'var(--color-text-primary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete project"
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HeaderButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg transition-colors"
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
      {children}
    </button>
  );
}
