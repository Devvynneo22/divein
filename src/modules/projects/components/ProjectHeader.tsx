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
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] break-words">
                {project.name}
              </h1>
              {isArchived && (
                <span
                  className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded-full"
                >
                  <Archive size={10} />
                  Archived
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            title="Edit project"
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <Edit size={16} />
          </button>

          {isArchived ? (
            <button
              onClick={onUnarchive}
              title="Unarchive project"
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <ArchiveRestore size={16} />
            </button>
          ) : (
            <button
              onClick={onArchive}
              title="Archive project"
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <Archive size={16} />
            </button>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--color-danger)] mr-1">Delete?</span>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 rounded-lg bg-[var(--color-danger)] text-white text-xs font-medium transition-colors hover:opacity-90"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs transition-colors hover:bg-[var(--color-bg-tertiary)]"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete project"
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
