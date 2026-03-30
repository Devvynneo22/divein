import { useState } from 'react';
import { Edit, Archive, ArchiveRestore, Trash2, CheckCircle2, PauseCircle, Zap } from 'lucide-react';
import type { Project } from '@/shared/types/project';

interface ProjectHeaderProps {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; Icon: React.ElementType; bg: string; text: string }> = {
  active: {
    label: 'Active',
    Icon: Zap,
    bg: 'var(--color-success-soft)',
    text: 'var(--color-success)',
  },
  on_hold: {
    label: 'On Hold',
    Icon: PauseCircle,
    bg: 'var(--color-warning-soft)',
    text: 'var(--color-warning)',
  },
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    bg: 'rgba(59,130,246,0.12)',
    text: '#3b82f6',
  },
  archived: {
    label: 'Archived',
    Icon: Archive,
    bg: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-muted)',
  },
};

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
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
  const StatusIcon = statusCfg.Icon;

  return (
    <div className="relative">
      {/* Full-width color bar */}
      <div
        className="h-2 w-full"
        style={{ background: accentColor }}
      />

      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
        {/* Left: icon + title + description + status badge */}
        <div className="flex items-start gap-4 min-w-0">
          {project.icon && (
            <div
              className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
              style={{ background: accentColor }}
            >
              {project.icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1
                className="text-2xl font-bold leading-tight break-words"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {project.name}
              </h1>
              <span
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
                style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
              >
                <StatusIcon size={11} />
                {statusCfg.label}
              </span>
            </div>
            {project.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <HeaderButton onClick={onEdit} title="Edit project">
            <Edit size={15} />
          </HeaderButton>

          {isArchived ? (
            <HeaderButton onClick={onUnarchive} title="Unarchive project">
              <ArchiveRestore size={15} />
            </HeaderButton>
          ) : (
            <HeaderButton onClick={onArchive} title="Archive project">
              <Archive size={15} />
            </HeaderButton>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs mr-1" style={{ color: 'var(--color-danger)' }}>Delete?</span>
              <button
                onClick={onDelete}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                Cancel
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
              <Trash2 size={15} />
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
