import React, { useState, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { useTaskSettingsStore } from '@/shared/stores/taskSettingsStore';
import { DENSITY_CONFIGS } from '../lib/densityConfig';

// Lock icon for blocked tasks
function LockIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'inline-block', flexShrink: 0 }}>
      <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill={color} />
      <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isBlocked?: boolean;
  onSelect: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleSelect?: (id: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onDelete: () => void;
  draggable?: boolean;
  subtaskProgress?: { done: number; total: number };
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

// ─── Priority ────────────────────────────────────────────────────────────────

const PRIORITY_BORDER_COLOR: Record<number, string> = {
  4: '#ef4444',
  3: '#f97316',
  2: '#eab308',
  1: '#3b82f6',
  0: 'transparent',
};

const PRIORITY_LABELS: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Low',
  0: 'None',
};

// ─── Status ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog:     'Backlog',
  inbox:       'Inbox',
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
  cancelled:   'Cancelled',
};

const STATUS_CYCLE: TaskStatus[] = [
  'backlog', 'inbox', 'todo', 'in_progress', 'in_review', 'done', 'cancelled',
];

// Solid vibrant status block colors
const STATUS_BLOCK_COLOR: Record<TaskStatus, string> = {
  backlog:     '#64748b',
  inbox:       '#6b7280',
  todo:        '#3b82f6',
  in_progress: '#f97316',
  in_review:   '#a855f7',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};

// ─── Tags — solid vibrant colors keyed by tag name ───────────────────────────

const TAG_MAP: Record<string, { bg: string; text: string }> = {
  // Technology / dev
  ios:           { bg: '#7c3aed', text: '#ffffff' },
  mobile:        { bg: '#2563eb', text: '#ffffff' },
  frontend:      { bg: '#0891b2', text: '#ffffff' },
  backend:       { bg: '#0f766e', text: '#ffffff' },
  development:   { bg: '#16a34a', text: '#ffffff' },
  devops:        { bg: '#b45309', text: '#ffffff' },
  performance:   { bg: '#d97706', text: '#ffffff' },
  analytics:     { bg: '#7c3aed', text: '#ffffff' },
  bug:           { bg: '#dc2626', text: '#ffffff' },
  // Design / research
  design:        { bg: '#db2777', text: '#ffffff' },
  research:      { bg: '#9333ea', text: '#ffffff' },
  // Business
  marketing:     { bg: '#ea580c', text: '#ffffff' },
  documentation: { bg: '#4f46e5', text: '#ffffff' },
  // Fallbacks by position in TAG_PALETTE
};

const TAG_PALETTE: Array<{ bg: string; text: string }> = [
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#2563eb', text: '#ffffff' },
  { bg: '#16a34a', text: '#ffffff' },
  { bg: '#db2777', text: '#ffffff' },
  { bg: '#ea580c', text: '#ffffff' },
  { bg: '#0891b2', text: '#ffffff' },
  { bg: '#9333ea', text: '#ffffff' },
  { bg: '#dc2626', text: '#ffffff' },
  { bg: '#0f766e', text: '#ffffff' },
  { bg: '#b45309', text: '#ffffff' },
];

function getTagStyle(tag: string, tagColors?: Record<string, string>): { bg: string; text: string } {
  const key = tag.toLowerCase().trim();
  if (tagColors && tagColors[key]) return { bg: tagColors[key], text: '#ffffff' };
  if (TAG_MAP[key]) return TAG_MAP[key];
  // Hash fallback
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}

function normalizeTagLabel(tag: string): string {
  return tag.trim();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Density config is imported from densityConfig.ts — no local constants needed.

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        border: '1px solid var(--color-border)',
        backgroundColor: hovered
          ? (danger ? 'rgba(239,68,68,0.1)' : 'var(--color-bg-hover)')
          : 'var(--color-bg-elevated)',
        cursor: 'pointer',
        fontSize: '12px',
        color: danger ? '#ef4444' : 'var(--color-text-secondary)',
        transition: 'background-color 0.1s ease',
        padding: 0,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function MoreMenuButton({
  onClick,
  children,
  danger,
}: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 12px',
        textAlign: 'left',
        fontSize: '13px',
        color: danger ? '#ef4444' : 'var(--color-text-primary)',
        background: hovered ? 'var(--color-bg-hover)' : 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.1s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ─── Assignee avatars ─────────────────────────────────────────────────────────

function AssigneeAvatars({ urls, max = 4 }: { urls: string[]; max?: number }) {
  if (!urls || urls.length === 0) return null;
  const visible = urls.slice(0, max);
  const remainder = urls.length - visible.length;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((url, i) => (
        <img
          key={url}
          src={url}
          alt={`Assignee ${i + 1}`}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            objectFit: 'cover',
            marginLeft: i === 0 ? 0 : '-7px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ))}
      {remainder > 0 && (
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: '2px solid #ffffff',
            backgroundColor: '#6366f1',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '-7px',
            flexShrink: 0,
          }}
        >
          +{remainder}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskCard({
  task,
  isSelected,
  isMultiSelected = false,
  isBlocked = false,
  onSelect,
  onToggleSelect,
  onMouseEnter: onMouseEnterProp,
  onMouseLeave: onMouseLeaveProp,
  onStatusChange,
  onPriorityChange,
  onDelete,
  draggable = false,
  subtaskProgress,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const density = useAppSettingsStore((s) => s.app.taskDensity);
  const showCoverImages = useAppSettingsStore((s) => s.app.showCoverImages);
  const showIssueKeys = useAppSettingsStore((s) => s.app.showIssueKeys);
  const tagColors = useTaskSettingsStore((s) => s.tagColors);

  const dc = DENSITY_CONFIGS[density];

  const priorityBorderColor = PRIORITY_BORDER_COLOR[task.priority] ?? 'transparent';
  const overdueDate = task.dueDate ? isOverdue(task.dueDate) : false;
  // Respect both global showCoverImages setting and density config
  const hasCover = !!(task.coverImage && showCoverImages && dc.card.showCover);
  const hasAssignees = !!(task.assignees && task.assignees.length > 0);

  const cardBg = isMultiSelected ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)';
  const cardBorderColor = isSelected || isMultiSelected
    ? 'var(--color-accent, #6366f1)'
    : isHovered
    ? 'var(--color-border-hover, #cbd5e1)'
    : 'var(--color-border, #e2e8f0)';

  const cycleStatus = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentIndex = STATUS_CYCLE.indexOf(task.status);
      const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
      onStatusChange(STATUS_CYCLE[nextIndex]);
    },
    [task.status, onStatusChange],
  );

  const cyclePriority = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = (((task.priority as number) + 1) % 5) as TaskPriority;
      onPriorityChange(next);
    },
    [task.priority, onPriorityChange],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMoreMenu(false);
      onDelete();
    },
    [onDelete],
  );

  const statusBlockColor = STATUS_BLOCK_COLOR[task.status];

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={(e) => onSelect(e)}
      onMouseEnter={() => { setIsHovered(true); onMouseEnterProp?.(); }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMoreMenu(false);
        onMouseLeaveProp?.();
      }}
      style={{
        position: 'relative',
        backgroundColor: cardBg,
        borderRadius: `${dc.card.borderRadius}px`,
        borderTop: task.priority > 0 ? `3px solid ${priorityBorderColor}` : `1px solid ${cardBorderColor}`,
        borderRight: `1px solid ${cardBorderColor}`,
        borderBottom: `1px solid ${cardBorderColor}`,
        borderLeft: `1px solid ${cardBorderColor}`,
        boxShadow: isHovered
          ? '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
        outline: (isSelected || isMultiSelected) ? '2px solid var(--color-accent, #6366f1)' : 'none',
        outlineOffset: '2px',
        overflow: 'hidden',
      }}
    >
      {/* ── Cover Image ───────────────────────────────────────────────────── */}
      {hasCover && (
        <div
          style={{
            width: '100%',
            height: '110px',
            overflow: 'hidden',
            borderRadius: `${dc.card.borderRadius - 1}px ${dc.card.borderRadius - 1}px 0 0`,
            flexShrink: 0,
          }}
        >
          <img
            src={task.coverImage}
            alt="Task cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* ── Card Body ─────────────────────────────────────────────────────── */}
      <div style={{ padding: `${dc.card.padding}px`, minHeight: dc.card.minHeight > 0 ? `${dc.card.minHeight}px` : undefined }}>

        {/* Multi-select checkbox — top-left corner, hidden until hover or selected */}
        {(isHovered || isMultiSelected) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(task.id);
            }}
            style={{
              position: 'absolute',
              top: hasCover ? '118px' : '8px',
              left: '8px',
              width: 16,
              height: 16,
              borderRadius: 4,
              border: isMultiSelected
                ? '2px solid var(--color-accent)'
                : '1.5px solid var(--color-border-hover, #94a3b8)',
              backgroundColor: isMultiSelected ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 11,
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {isMultiSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}

        {/* Quick action buttons — visible on hover */}
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              top: hasCover ? '118px' : '8px',
              right: '8px',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <ActionButton onClick={cycleStatus} title={`Status: ${STATUS_LABELS[task.status]} → next`}>
              ↻
            </ActionButton>
            <ActionButton onClick={cyclePriority} title={`Priority: ${PRIORITY_LABELS[task.priority]}`}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: priorityBorderColor === 'transparent' ? 'var(--color-text-muted)' : priorityBorderColor,
                  transform: 'rotate(45deg)',
                }}
              />
            </ActionButton>
            <div style={{ position: 'relative' }}>
              <ActionButton
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu((v) => !v); }}
                title="More options"
              >
                ···
              </ActionButton>
              {showMoreMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '28px',
                    right: 0,
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    minWidth: '120px',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}
                >
                  <MoreMenuButton onClick={handleDelete} danger>
                    🗑 Delete
                  </MoreMenuButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Issue Key + Tags row ─────────────────────────────────────── */}
        {(showIssueKeys && task.issueKey || (dc.card.showTags && task.tags.length > 0)) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '5px',
              marginBottom: '7px',
            }}
          >
            {/* Issue key */}
            {showIssueKeys && task.issueKey && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginRight: '2px',
                }}
              >
                {task.issueKey}
              </span>
            )}

            {/* Tags — solid vibrant pills (hidden in compact density) */}
            {dc.card.showTags && task.tags.slice(0, 3).map((tag) => {
              const label = normalizeTagLabel(tag);
              const style = getTagStyle(label, tagColors);
              return (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontSize: '9px',
                    fontWeight: 800,
                    backgroundColor: style.bg,
                    color: style.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    lineHeight: 1.5,
                    flexShrink: 0,
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}

        {/* ── Title ────────────────────────────────────────────────────── */}
        <div
          style={{
            fontSize: `${dc.card.titleSize}px`,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: '1.45',
            marginBottom: '10px',
            paddingRight: isHovered ? '88px' : '0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 5,
          }}
        >
          {isBlocked && (
            <span title="Blocked by unfinished tasks" style={{ flexShrink: 0, marginTop: 2 }}>
              <LockIcon size={12} color="#ef4444" />
            </span>
          )}
          <span
            style={({
              display: '-webkit-box',
              WebkitLineClamp: dc.card.titleLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } as React.CSSProperties)}
          >
            {task.title}
          </span>
        </div>

        {/* ── Description snippet (spacious only) ─────────────────── */}
        {dc.card.showDescription && task.description && (
          <div
            style={{
              fontSize: `${dc.card.metaSize}px`,
              color: 'var(--color-text-secondary)',
              lineHeight: '1.5',
              marginBottom: '8px',
              overflow: 'hidden',
              display: '-webkit-box',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'],
            } as React.CSSProperties}
          >
            {task.description.slice(0, 120)}
          </div>
        )}

        {/* Priority badge */}
        {task.priority > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px 3px 7px',
              borderRadius: '6px',
              marginBottom: '8px',
              backgroundColor: `${priorityBorderColor}18`,
              border: `1px solid ${priorityBorderColor}40`,
            }}
          >
            <span style={{ fontSize: '10px', lineHeight: 1 }}>
              {task.priority === 4 ? '🔴' : task.priority === 3 ? '🟠' : task.priority === 2 ? '🟡' : '🔵'}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: priorityBorderColor,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        )}

        {/* ── Status execution-stage block ──────────────────────────── */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '6px',
            backgroundColor: statusBlockColor,
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.4,
            }}
          >
            {STATUS_LABELS[task.status]}
          </span>
        </div>

        {/* ── Metadata row: due date, subtask progress ──────────────── */}
        {(task.dueDate || subtaskProgress) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: hasAssignees ? '8px' : '0',
            }}
          >
            {task.dueDate && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: `${dc.card.metaSize}px`,
                  color: overdueDate ? '#ef4444' : 'var(--color-text-muted)',
                  fontWeight: overdueDate ? 700 : 400,
                  backgroundColor: overdueDate ? 'rgba(239,68,68,0.08)' : 'transparent',
                  padding: overdueDate ? '2px 6px' : '0',
                  borderRadius: '4px',
                }}
              >
                📅 {formatDate(task.dueDate)}
              </span>
            )}

            {subtaskProgress && subtaskProgress.total > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginLeft: 'auto',
                }}
              >
                <span
                  style={{
                    fontSize: `${dc.card.metaSize}px`,
                    color: subtaskProgress.done === subtaskProgress.total
                      ? '#22c55e'
                      : 'var(--color-text-muted)',
                  }}
                >
                  📎 {subtaskProgress.done}/{subtaskProgress.total}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '4px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      height: '100%',
                      borderRadius: '999px',
                      backgroundColor: subtaskProgress.done === subtaskProgress.total
                        ? '#22c55e'
                        : 'var(--color-accent, #6366f1)',
                      width: `${Math.round((subtaskProgress.done / subtaskProgress.total) * 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </span>
              </span>
            )}
          </div>
        )}

        {/* ── Assignee avatars ─────────────────────────────────────── */}
        {hasAssignees && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '6px',
            }}
          >
            <AssigneeAvatars urls={task.assignees!} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
