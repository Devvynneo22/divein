import React, { useState } from 'react';
import { isToday, isPast, format, parseISO } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';

interface TaskListRowProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
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

export function TaskListRow({
  task,
  isSelected,
  onSelect,
  onStatusChange,
  onDelete,
}: TaskListRowProps) {
  const [hovered, setHovered] = useState(false);

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

  const rowBg = isSelected
    ? 'var(--color-accent-soft)'
    : hovered
    ? 'var(--color-bg-hover)'
    : 'transparent';

  const rowBorderLeft = isSelected ? '2px solid var(--color-accent)' : '2px solid transparent';

  return (
    <div
      role="row"
      aria-selected={isSelected}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
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
          fontSize: 14,
          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: '20px',
        }}
      >
        {task.title}
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
                  fontSize: 11,
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
                fontSize: 11,
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
            fontSize: 12,
            color: dueDateColor,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {formatDueDate(task.dueDate)}
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
