import React, { useState, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
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

const PRIORITY_BORDER_COLOR: Record<number, string> = {
  4: 'var(--color-priority-urgent, #ef4444)',
  3: 'var(--color-priority-high, #f97316)',
  2: 'var(--color-priority-medium, #eab308)',
  1: 'var(--color-priority-low, #3b82f6)',
  0: 'transparent',
};

const PRIORITY_LABELS: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Low',
  0: 'None',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  inbox: 'Inbox',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_CYCLE: TaskStatus[] = [
  'backlog', 'inbox', 'todo', 'in_progress', 'in_review', 'done', 'cancelled',
];

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#6b7280',
];

function normalizeTagLabel(tag: string): string {
  return tag.trim();
}

function getTagColor(tag: string): string {
  const clean = normalizeTagLabel(tag);
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) - hash) + clean.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

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
          ? (danger ? 'var(--color-danger-soft, rgba(239,68,68,0.1))' : 'var(--color-bg-hover)')
          : 'var(--color-bg-elevated)',
        cursor: 'pointer',
        fontSize: '12px',
        color: danger
          ? 'var(--color-danger, #ef4444)'
          : 'var(--color-text-secondary)',
        transition: 'background-color 0.1s ease',
        padding: 0,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

export function TaskCard({
  task,
  isSelected,
  onSelect,
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

  const borderColor = PRIORITY_BORDER_COLOR[task.priority] ?? 'transparent';
  const overdueDate = task.dueDate ? isOverdue(task.dueDate) : false;

  const sideColor = isSelected
    ? 'var(--color-accent, #6366f1)'
    : isHovered
    ? 'var(--color-border-hover, var(--color-border))'
    : 'var(--color-border)';

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

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMoreMenu(false);
      }}
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-bg-elevated)',
        borderTop: `1px solid ${sideColor}`,
        borderRight: `1px solid ${sideColor}`,
        borderBottom: `1px solid ${sideColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '12px',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding: '12px 14px',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
        outline: isSelected ? '2px solid var(--color-accent, #6366f1)' : 'none',
        outlineOffset: '2px',
      }}
    >
      {/* Quick action buttons — visible on hover, absolute top-right */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* Status cycle */}
          <ActionButton onClick={cycleStatus} title={`Status: ${STATUS_LABELS[task.status]} → next`}>
            ↻
          </ActionButton>

          {/* Priority cycle */}
          <ActionButton
            onClick={cyclePriority}
            title={`Priority: ${PRIORITY_LABELS[task.priority]}`}
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: borderColor === 'transparent'
                  ? 'var(--color-text-muted)'
                  : borderColor,
                transform: 'rotate(45deg)',
              }}
            />
          </ActionButton>

          {/* More menu */}
          <div style={{ position: 'relative' }}>
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((v) => !v);
              }}
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
                  boxShadow: 'var(--shadow-md)',
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

      {/* Title */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          lineHeight: '1.4',
          marginBottom: task.dueDate || task.tags.length > 0 || subtaskProgress ? '8px' : 0,
          paddingRight: isHovered ? '84px' : '0',
          ...(({
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties)),
        }}
      >
        {task.title}
      </div>

      {/* Metadata row */}
      {(task.dueDate || task.tags.length > 0 || subtaskProgress) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          {/* Due date */}
          {task.dueDate && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                color: overdueDate
                  ? 'var(--color-danger, #ef4444)'
                  : 'var(--color-text-muted)',
                fontWeight: overdueDate ? 600 : 400,
                backgroundColor: overdueDate
                  ? 'var(--color-danger-soft, rgba(239,68,68,0.08))'
                  : 'transparent',
                padding: overdueDate ? '1px 5px' : '0',
                borderRadius: '4px',
              }}
            >
              📅 {formatDate(task.dueDate)}
            </span>
          )}

          {/* Tags — up to 3 */}
          {task.tags.slice(0, 3).map((tag) => {
            const label = normalizeTagLabel(tag);
            const color = getTagColor(label);
            return (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: `${color}20`,
                  color,
                  border: `1px solid ${color}40`,
                  lineHeight: 1.6,
                }}
              >
                {label}
              </span>
            );
          })}

          {/* Subtask progress */}
          {subtaskProgress && subtaskProgress.total > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '11px',
                marginLeft: 'auto',
                color:
                  subtaskProgress.done === subtaskProgress.total
                    ? 'var(--color-success, #4ade80)'
                    : 'var(--color-text-muted)',
              }}
            >
              📎 {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          )}
        </div>
      )}
    </div>
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
        color: danger ? 'var(--color-danger, #ef4444)' : 'var(--color-text-primary)',
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

export default TaskCard;
