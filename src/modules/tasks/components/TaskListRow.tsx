import React, { useState } from 'react';
import { isToday, isPast, format, parseISO } from 'date-fns';
import type { Task, TaskStatus } from '@/shared/types/task';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import type { TaskDensity } from '@/shared/stores/appSettingsStore';

interface TaskListRowProps {
  task: Task;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isBlocked?: boolean; // true if task has active (non-done) blockers
  onSelect: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}

const STATUS_CYCLE: TaskStatus[] = [
  'backlog',
  'inbox',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
];

const TAG_COLORS = [
  { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
  { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  { bg: 'rgba(74,222,128,0.15)', text: '#16a34a' },
  { bg: 'rgba(96,165,250,0.15)', text: '#3b82f6' },
  { bg: 'rgba(192,132,252,0.15)', text: '#a855f7' },
  { bg: 'rgba(244,114,182,0.15)', text: '#ec4899' },
  { bg: 'rgba(161,161,170,0.15)', text: '#71717a' },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function cycleStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function formatDueDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  return format(d, 'MMM d');
}

const DENSITY_ROW_HEIGHT: Record<TaskDensity, number> = {
  compact: 34,
  default: 44,
  spacious: 56,
};

const DENSITY_FONT_SIZE: Record<TaskDensity, number> = {
  compact: 13,
  default: 14,
  spacious: 15,
};

const DENSITY_BADGE_FONT_SIZE: Record<TaskDensity, number> = {
  compact: 10,
  default: 11,
  spacious: 12,
};

export function TaskListRow({
  task,
  isSelected,
  isMultiSelected = false,
  isBlocked = false,
  onSelect,
  onMouseEnter: onMouseEnterProp,
  onMouseLeave: onMouseLeaveProp,
  onStatusChange,
  onDelete,
}: TaskListRowProps) {
  const [hovered, setHovered] = useState(false);
  const density = useAppSettingsStore((s) => s.app.taskDensity);

  const isDone = task.status === 'done' || task.status === 'cancelled';
  const isOverdue = task.dueDate
    ? !isToday(parseISO(task.dueDate)) && isPast(parseISO(task.dueDate))
    : false;
  const isDueToday = task.dueDate ? isToday(parseISO(task.dueDate)) : false;

  const visibleTags = task.tags.slice(0, 2);
  const overflowCount = task.tags.length - 2;

  const dueDateColor = isOverdue
    ? 'var(--color-danger, #ef4444)'
    : isDueToday
    ? 'var(--color-accent, #6366f1)'
    : 'var(--color-text-muted)';

  const rowBg = isMultiSelected
    ? 'var(--color-accent-muted)'
    : isSelected
    ? 'var(--color-accent-soft)'
    : hovered
    ? 'var(--color-bg-hover)'
    : 'transparent';

  const rowBorderLeft =
    isMultiSelected
      ? '2px solid var(--color-accent)'
      : isSelected
      ? '2px solid var(--color-accent)'
      : '2px solid transparent';

  return (
    <div
      role="row"
      aria-selected={isSelected || isMultiSelected}
      onClick={(e) => onSelect(e)}
      onMouseEnter={() => { setHovered(true); onMouseEnterProp?.(); }}
      onMouseLeave={() => { setHovered(false); onMouseLeaveProp?.(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: DENSITY_ROW_HEIGHT[density],
        padding: '0 12px',
        cursor: 'pointer',
        backgroundColor: rowBg,
        borderLeft: rowBorderLeft,
        borderBottom: '1px solid var(--color-border)',
        transition: 'background-color 0.1s ease',
        userSelect: 'none',
      }}
    >
      {/* Status checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(cycleStatus(task.status));
        }}
        title={`Status: ${task.status} (click to cycle)`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          flexShrink: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <StatusIcon status={task.status} size={18} />
      </button>

      {/* Priority indicator */}
      <div style={{ flexShrink: 0 }}>
        <PriorityIcon priority={task.priority} size={12} />
      </div>

      {/* Title */}
      <span
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: DENSITY_FONT_SIZE[density],
          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden',
          lineHeight: '20px',
        }}
      >
        {isBlocked && (
          <span title="Blocked by unfinished tasks" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="var(--color-danger, #ef4444)" />
              <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" stroke="var(--color-danger, #ef4444)" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
        </span>
      </span>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {visibleTags.map((tag) => {
            const c = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  fontSize: DENSITY_BADGE_FONT_SIZE[density],
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: c.bg,
                  color: c.text,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
              </span>
            );
          })}
          {overflowCount > 0 && (
            <span
              style={{
                fontSize: DENSITY_BADGE_FONT_SIZE[density],
                padding: '1px 6px',
                borderRadius: 10,
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            >
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span
          style={{
            fontSize: DENSITY_BADGE_FONT_SIZE[density],
            color: dueDateColor,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            fontWeight: isDueToday ? 700 : 500,
          }}
        >
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {isDueToday && (
        <span
          style={{
            fontSize: DENSITY_BADGE_FONT_SIZE[density],
            padding: '2px 6px',
            borderRadius: 999,
            backgroundColor: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          Today
        </span>
      )}

      {/* Delete button (hover-reveal) */}
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete task"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-danger, #ef4444)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-active)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
