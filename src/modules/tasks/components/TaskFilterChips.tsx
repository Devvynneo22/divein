import React from 'react';
import type { TaskStatus, TaskPriority } from '@/shared/types/task';

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueBefore?: string;
}

interface TaskFilterChipsProps {
  filters: TaskFilters;
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  inbox: 'Inbox',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

const PRIORITY_LABEL: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Low',
  0: 'No Priority',
};

interface ChipProps {
  label: string;
  onRemove: () => void;
}

function Chip({ label, onRemove }: ChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px 3px 10px',
        borderRadius: 12,
        backgroundColor: 'var(--color-accent-soft)',
        border: '1px solid var(--color-accent, rgba(99,102,241,0.3))',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--color-accent)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--color-accent)',
          borderRadius: 3,
          opacity: 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.backgroundColor = 'var(--color-accent-muted)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <line x1="1" y1="1" x2="7" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="1" x2="1" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

export function TaskFilterChips({ filters, onRemoveFilter, onClearAll }: TaskFilterChipsProps) {
  const chips: { key: string; value?: string; label: string }[] = [];

  if (filters.status) {
    for (const s of filters.status) {
      chips.push({ key: 'status', value: s, label: `Status: ${STATUS_LABEL[s]}` });
    }
  }

  if (filters.priority) {
    for (const p of filters.priority) {
      chips.push({ key: 'priority', value: String(p), label: `Priority: ${PRIORITY_LABEL[p]}` });
    }
  }

  if (filters.tags) {
    for (const tag of filters.tags) {
      chips.push({ key: 'tags', value: tag, label: `Tag: ${tag}` });
    }
  }

  if (filters.dueBefore) {
    chips.push({ key: 'dueBefore', label: `Due before: ${filters.dueBefore}` });
  }

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '6px 0',
      }}
    >
      {chips.map((chip, idx) => (
        <Chip
          key={`${chip.key}-${chip.value ?? idx}`}
          label={chip.label}
          onRemove={() => onRemoveFilter(chip.key, chip.value)}
        />
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClearAll}
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '3px 4px',
            borderRadius: 4,
            textDecoration: 'underline',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
