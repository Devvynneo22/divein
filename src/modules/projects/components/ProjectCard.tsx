import { useState } from 'react';
import { Archive, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Project, ProjectStats } from '@/shared/types/project';

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onClick: () => void;
}

// Status display config — archived is kept for legacy rows
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: {
    label: 'Active',
    bg: 'var(--color-success-soft)',
    text: 'var(--color-success)',
  },
  on_hold: {
    label: 'On Hold',
    bg: 'var(--color-warning-soft)',
    text: 'var(--color-warning)',
  },
  completed: {
    label: 'Completed',
    bg: 'rgba(59,130,246,0.12)',
    text: '#3b82f6',
  },
  archived: {
    label: 'Archived',
    bg: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-muted)',
  },
};

function progressColor(pct: number): string {
  if (pct >= 100) return 'var(--color-success)';
  if (pct >= 60) return '#3b82f6';
  if (pct >= 30) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export function ProjectCard({ project, stats, onClick }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);
  const accentColor = project.color ?? 'var(--color-accent)';
  const isArchived = project.status === 'archived';
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;

  const completionPct =
    stats && stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        opacity: isArchived ? 0.65 : 1,
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top gradient strip */}
      <div
        className="h-2 w-full"
        style={{ background: accentColor }}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row: icon + name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {project.icon && (
              <span className="text-xl leading-none flex-shrink-0">{project.icon}</span>
            )}
            <h3
              className="font-bold text-base leading-tight truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {project.name}
            </h3>
          </div>
          {isArchived ? (
            <span
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
            >
              <Archive size={10} />
              Archived
            </span>
          ) : (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold whitespace-nowrap"
              style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
            >
              {statusCfg.label}
            </span>
          )}
        </div>

        {/* Description */}
        {project.description ? (
          <p
            className="text-sm line-clamp-2 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {project.description}
          </p>
        ) : (
          <p
            className="text-sm italic"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No description
          </p>
        )}

        {/* Progress bar */}
        {stats && stats.totalTasks > 0 && (
          <div className="flex flex-col gap-1">
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${completionPct}%`,
                  backgroundColor: progressColor(completionPct),
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {stats.completedTasks}/{stats.totalTasks} tasks done
              </span>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: progressColor(completionPct) }}
              >
                {completionPct}%
              </span>
            </div>
          </div>
        )}

        {/* Footer: created date + notes count */}
        <div
          className="flex items-center justify-between pt-1 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <Calendar size={11} />
            <span className="text-[11px]">
              {format(parseISO(project.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          {stats && (
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {stats.totalNotes} note{stats.totalNotes !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
