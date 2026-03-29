import { useState } from 'react';
import { Archive } from 'lucide-react';
import type { Project } from '@/shared/types/project';
import type { ProjectStats } from '@/shared/types/project';

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onClick: () => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '0m';
}

export function ProjectCard({ project, stats, onClick }: ProjectCardProps) {
  const accentColor = project.color ?? 'var(--color-accent)';
  const isArchived = project.status === 'archived';
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className="card card-interactive relative w-full text-left rounded-xl overflow-hidden"
      style={{
        opacity: isArchived ? 0.6 : 1,
        borderColor: hovered ? 'var(--color-border-hover)' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color accent stripe on left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="pl-4 pr-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {project.icon && (
              <span className="text-lg leading-none flex-shrink-0">{project.icon}</span>
            )}
            <span className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {project.name}
            </span>
          </div>
          {isArchived && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-tertiary)',
              }}
            >
              <Archive size={10} />
              Archived
            </span>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {project.description}
          </p>
        )}

        {/* Stats row */}
        {stats && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>{stats.totalTasks} task{stats.totalTasks !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>{stats.totalNotes} note{stats.totalNotes !== 1 ? 's' : ''}</span>
            {stats.totalTimeSeconds > 0 && (
              <>
                <span>•</span>
                <span>{formatTime(stats.totalTimeSeconds)} logged</span>
              </>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
