import { useState } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';

interface TaskQuickActionsProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onDelete: () => void;
}

// Cycle order for status toggling
const STATUS_CYCLE: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'in_review', 'done', 'cancelled', 'backlog'];
const PRIORITY_CYCLE: TaskPriority[] = [0, 1, 2, 3, 4];

function getNextStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

function getNextPriority(current: TaskPriority): TaskPriority {
  const idx = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
}

interface ActionButtonProps {
  onMouseDown: (e: React.MouseEvent) => void;
  label: string;
  children: React.ReactNode;
}

function ActionButton({ onMouseDown, label, children }: ActionButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        transition: 'background-color 0.1s, color 0.1s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function TaskQuickActions({ task, onStatusChange, onPriorityChange, onDelete }: TaskQuickActionsProps) {
  const nextStatus = getNextStatus(task.status);
  const nextPriority = getNextPriority(task.priority);

  return (
    <div
      style={{
        position: 'absolute',
        top: 6,
        right: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 4px',
        borderRadius: 8,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10,
      }}
    >
      {/* Status cycle */}
      <ActionButton
        label={`Set status to ${nextStatus}`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onStatusChange(nextStatus);
        }}
      >
        <StatusIcon status={task.status} size={12} />
      </ActionButton>

      {/* Priority cycle */}
      <ActionButton
        label={`Set priority to ${nextPriority}`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPriorityChange(nextPriority);
        }}
      >
        <PriorityIcon priority={task.priority} size={12} />
      </ActionButton>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 14,
          backgroundColor: 'var(--color-border)',
          margin: '0 2px',
          flexShrink: 0,
        }}
      />

      {/* Delete */}
      <ActionButton
        label="Delete task"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2 3h8M5 3V2h2v1M4.5 3v6h3V3"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ActionButton>
    </div>
  );
}
