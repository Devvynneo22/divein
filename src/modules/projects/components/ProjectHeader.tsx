import { useState } from 'react';
import {
  Edit, Archive, ArchiveRestore, Trash2,
  CheckCircle2, PauseCircle, Zap, CheckSquare, FileText, Clock,
} from 'lucide-react';
import type { Project, ProjectStats } from '@/shared/types/project';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; bg: string; text: string }
> = {
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectHeaderProps {
  project: Project;
  stats?: ProjectStats;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  /** When a tab is provided, clicking a quick-stat pill calls this */
  onTabSelect?: (tab: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectHeader({
  project,
  stats,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onTabSelect,
}: ProjectHeaderProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accentColor = project.color ?? 'var(--color-accent)';
  const isArchived = project.status === 'archived';
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
  const StatusIcon = statusCfg.Icon;

  const completionPct =
    stats && stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <div className="relative">
      {/* ── Full-width cover banner (120px) ── */}
      <div
        className="w-full relative overflow-hidden"
        style={{ height: '120px', background: accentColor }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          }}
        />

        {/* Action buttons — top right of banner */}
        <div className="absolute top-3 right-4 flex items-center gap-1">
          <BannerButton onClick={onEdit} title="Edit project">
            <Edit size={14} />
          </BannerButton>

          {isArchived ? (
            <BannerButton onClick={onUnarchive} title="Unarchive project">
              <ArchiveRestore size={14} />
            </BannerButton>
          ) : (
            <BannerButton onClick={onArchive} title="Archive project">
              <Archive size={14} />
            </BannerButton>
          )}

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span
                className="text-xs font-medium mr-1"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                Delete?
              </span>
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
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <BannerButton
              onClick={() => setConfirmDelete(true)}
              title="Delete project"
              danger
            >
              <Trash2 size={14} />
            </BannerButton>
          )}
        </div>
      </div>

      {/* ── Project icon overlapping banner bottom edge ── */}
      {project.icon && (
        <div
          className="absolute left-6 flex items-center justify-center text-3xl z-10"
          style={{
            bottom: stats ? '48px' : '44px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-bg-primary)',
            border: '3px solid var(--color-bg-primary)',
            boxShadow: 'var(--shadow-md)',
            lineHeight: 1,
          }}
        >
          {project.icon}
        </div>
      )}

      {/* ── Title row ── */}
      <div
        className="flex items-end justify-between gap-4 px-6 pb-3"
        style={{ paddingTop: project.icon ? '16px' : '12px', paddingLeft: project.icon ? '88px' : '24px' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className="text-xl font-bold leading-tight break-words"
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
            <p
              className="text-sm leading-relaxed mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {project.description}
            </p>
          )}
        </div>

        {/* Completion % badge */}
        {stats && stats.totalTasks > 0 && (
          <div
            className="flex-shrink-0 text-center"
            style={{ minWidth: '52px' }}
          >
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: accentColor.includes('gradient') ? 'var(--color-accent)' : accentColor }}
            >
              {completionPct}%
            </span>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              done
            </p>
          </div>
        )}
      </div>

      {/* ── Quick stats ribbon ── */}
      {stats && (
        <QuickStatsRibbon stats={stats} onTabSelect={onTabSelect} />
      )}
    </div>
  );
}

// ─── Quick stats ribbon ───────────────────────────────────────────────────────

function QuickStatsRibbon({
  stats,
  onTabSelect,
}: {
  stats: ProjectStats;
  onTabSelect?: (tab: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-6 pb-3 flex-wrap"
    >
      <RibbonPill
        icon={<CheckSquare size={12} />}
        label={`${stats.totalTasks} task${stats.totalTasks !== 1 ? 's' : ''}`}
        onClick={onTabSelect ? () => onTabSelect('tasks') : undefined}
      />
      <RibbonDot />
      <RibbonPill
        icon={<FileText size={12} />}
        label={`${stats.totalNotes} note${stats.totalNotes !== 1 ? 's' : ''}`}
        onClick={onTabSelect ? () => onTabSelect('notes') : undefined}
      />
      {stats.totalTimeSeconds > 0 && (
        <>
          <RibbonDot />
          <RibbonPill
            icon={<Clock size={12} />}
            label={formatDuration(stats.totalTimeSeconds) + ' logged'}
            onClick={onTabSelect ? () => onTabSelect('activity') : undefined}
          />
        </>
      )}
    </div>
  );
}

function RibbonDot() {
  return (
    <span
      className="w-1 h-1 rounded-full"
      style={{ backgroundColor: 'var(--color-text-muted)', opacity: 0.5 }}
    />
  );
}

function RibbonPill({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150"
      style={{
        backgroundColor: hovered && isClickable ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
        color: hovered && isClickable ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        border: '1px solid var(--color-border)',
        cursor: isClickable ? 'pointer' : 'default',
        transform: hovered && isClickable ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Banner button helper ─────────────────────────────────────────────────────

function BannerButton({
  onClick,
  title,
  children,
  danger = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-all duration-150"
      style={{
        color: hovered
          ? danger
            ? '#fff'
            : 'rgba(255,255,255,1)'
          : 'rgba(255,255,255,0.75)',
        backgroundColor: hovered
          ? danger
            ? 'var(--color-danger)'
            : 'rgba(0,0,0,0.2)'
          : 'rgba(0,0,0,0.1)',
        backdropFilter: 'blur(4px)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}
