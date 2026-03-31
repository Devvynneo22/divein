import { useState } from 'react';
import { Star, Clock, FileText, CheckSquare, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Project, ProjectStats } from '@/shared/types/project';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  active:    { label: 'Active',    dot: '#10b981' },
  on_hold:   { label: 'On Hold',   dot: '#f59e0b' },
  completed: { label: 'Completed', dot: '#3b82f6' },
  archived:  { label: 'Archived',  dot: '#94a3b8' },
};

function progressColor(pct: number): string {
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#3b82f6';
  if (pct >= 30)  return '#f59e0b';
  return '#ef4444';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

// Extract a representative solid color from gradient string (for tints)
function extractBaseColor(color: string | null): string {
  if (!color) return '#6366f1';
  if (color.startsWith('#')) return color;
  // Extract first hex from gradient
  const match = color.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#6366f1';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onClick: () => void;
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

export function ProjectCard({ project, stats, onClick, pinned = false, onTogglePin }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);

  const accent        = project.color ?? 'linear-gradient(135deg,#6366f1,#8b5cf6)';
  const baseColor     = extractBaseColor(project.color);
  const isArchived    = project.status === 'archived';
  const statusCfg     = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
  const completionPct = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const updatedLabel  = (() => {
    try { return formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true }); }
    catch { return ''; }
  })();

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none focus:outline-none"
      style={{
        background: 'var(--color-bg-elevated)',
        border: `1px solid ${hovered ? `${baseColor}55` : 'var(--color-border)'}`,
        boxShadow: hovered
          ? `0 16px 48px ${baseColor}22, 0 4px 16px rgba(0,0,0,0.1)`
          : '0 2px 8px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        opacity: isArchived ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Gradient banner ── */}
      <div className="relative flex-shrink-0" style={{ height: '80px', background: accent }}>
        {/* Noise texture overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
          opacity: 0.6,
        }} />
        {/* Radial highlight */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.18) 0%, transparent 65%)',
        }} />

        {/* Project icon */}
        {project.icon && (
          <div
            className="absolute bottom-0 left-4 flex items-center justify-center text-2xl z-10"
            style={{
              transform: 'translateY(50%)',
              width: '44px', height: '44px',
              borderRadius: '12px',
              background: 'var(--color-bg-elevated)',
              border: `3px solid var(--color-bg-elevated)`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
              lineHeight: 1,
            }}
          >
            {project.icon}
          </div>
        )}

        {/* Pin button */}
        {onTogglePin && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(project.id); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150"
            style={{
              opacity: hovered || pinned ? 1 : 0,
              background: 'rgba(0,0,0,0.25)',
              backdropFilter: 'blur(8px)',
              color: pinned ? '#fbbf24' : 'rgba(255,255,255,0.9)',
            }}
            title={pinned ? 'Unpin' : 'Pin'}
          >
            <Star size={12} fill={pinned ? '#fbbf24' : 'none'} />
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div
        className="flex flex-col flex-1"
        style={{
          // Very subtle tint from the project color
          background: `linear-gradient(180deg, ${baseColor}08 0%, var(--color-bg-elevated) 60px)`,
          paddingTop: project.icon ? '28px' : '16px',
          padding: project.icon ? '28px 16px 16px' : '16px',
        }}
      >
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3
            className="font-bold leading-tight flex-1 min-w-0"
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusCfg.dot }}
            />
            <span
              className="text-[11px] font-semibold"
              style={{ color: statusCfg.dot }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-relaxed mb-3"
          style={{
            color: project.description ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
            fontStyle: project.description ? 'normal' : 'italic',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '32px',
          }}
        >
          {project.description || 'No description yet'}
        </p>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {stats && stats.totalTasks > 0
                ? `${stats.completedTasks} / ${stats.totalTasks} tasks`
                : 'No tasks yet'}
            </span>
            {stats && stats.totalTasks > 0 && (
              <span className="text-[11px] font-bold tabular-nums" style={{ color: progressColor(completionPct) }}>
                {completionPct}%
              </span>
            )}
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: stats && stats.totalTasks > 0 ? `${completionPct}%` : '0%',
                background: stats && stats.totalTasks > 0 ? progressColor(completionPct) : 'transparent',
                boxShadow: stats && stats.totalTasks > 0 ? `0 0 8px ${progressColor(completionPct)}88` : 'none',
              }}
            />
          </div>
        </div>

        {/* Footer meta row */}
        <div
          className="flex items-center justify-between pt-2.5"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {updatedLabel}
          </span>
          <div className="flex items-center gap-2.5">
            {stats && stats.totalNotes > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <FileText size={11} />
                {stats.totalNotes}
              </span>
            )}
            {stats && stats.totalTimeSeconds > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                <Clock size={11} />
                {formatDuration(stats.totalTimeSeconds)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

interface ProjectListRowProps {
  project: Project;
  stats?: ProjectStats;
  onClick: () => void;
  pinned?: boolean;
  onTogglePin?: (id: string) => void;
}

export function ProjectListRow({ project, stats, onClick, pinned = false, onTogglePin }: ProjectListRowProps) {
  const [hovered, setHovered] = useState(false);

  const accent      = project.color ?? 'linear-gradient(135deg,#6366f1,#8b5cf6)';
  const baseColor   = extractBaseColor(project.color);
  const isArchived  = project.status === 'archived';
  const statusCfg   = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
  const completionPct = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="relative flex items-center rounded-xl overflow-hidden cursor-pointer select-none focus:outline-none group"
      style={{
        background: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? `${baseColor}44` : 'var(--color-border)'}`,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s ease',
        opacity: isArchived ? 0.65 : 1,
        minHeight: '58px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color bar */}
      <div className="self-stretch w-1 flex-shrink-0" style={{ background: accent, minHeight: '58px' }} />

      <div className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3">
        {project.icon ? (
          <span className="text-lg flex-shrink-0 w-8 text-center">{project.icon}</span>
        ) : (
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: accent, opacity: 0.7 }} />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {project.name}
          </p>
          {project.description && (
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {project.description}
            </p>
          )}
        </div>

        <div className="hidden sm:flex flex-col gap-1 w-28 flex-shrink-0">
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
            {stats && stats.totalTasks > 0 && (
              <div className="h-full rounded-full" style={{ width: `${completionPct}%`, backgroundColor: progressColor(completionPct) }} />
            )}
          </div>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {stats ? `${stats.completedTasks}/${stats.totalTasks} tasks` : 'No tasks'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
          <span className="text-[11px] font-semibold" style={{ color: statusCfg.dot }}>{statusCfg.label}</span>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {stats && stats.totalNotes > 0 && <span className="flex items-center gap-1 text-[11px]"><FileText size={11} />{stats.totalNotes}</span>}
          {stats && stats.totalTimeSeconds > 0 && <span className="flex items-center gap-1 text-[11px]"><Clock size={11} />{formatDuration(stats.totalTimeSeconds)}</span>}
        </div>

        {onTogglePin && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(project.id); }}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ opacity: hovered || pinned ? 1 : 0, color: pinned ? '#fbbf24' : 'var(--color-text-muted)' }}
            title={pinned ? 'Unpin' : 'Pin'}
          >
            <Star size={13} fill={pinned ? '#fbbf24' : 'none'} />
          </button>
        )}
      </div>
    </div>
  );
}
