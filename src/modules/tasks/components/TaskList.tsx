import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, TaskStatus } from '@/shared/types/task';
import { TaskListRow } from './TaskListRow';
import type { TaskGroup } from './taskViewUtils';
import { SkeletonRow } from '@/shared/components/Skeleton';

interface TaskListProps {
  tasks: Task[];
  groupedTasks?: TaskGroup[];
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onSelectTask: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  /** Direct toggle from checkbox (no event needed) */
  onToggleSelectById?: (id: string) => void;
  onHoverTask?: (id: string | null) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  blockedTaskIds?: Set<string>;
  /** When true, renders skeleton rows instead of data rows */
  isLoading?: boolean;
}

type SortKey = 'title' | 'priority' | 'dueDate' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; width?: string | number }[] = [
  { key: 'status', label: 'STATUS', width: 80 },
  { key: 'title', label: 'TITLE' },
  { key: 'priority', label: 'PRIORITY', width: 90 },
  { key: 'dueDate', label: 'DUE DATE', width: 100 },
];

export function TaskList({
  tasks,
  groupedTasks,
  selectedTaskId,
  selectedTaskIds = [],
  onSelectTask,
  onToggleSelect,
  onToggleSelectById,
  onHoverTask,
  onStatusChange,
  onDelete,
  blockedTaskIds,
  isLoading = false,
}: TaskListProps) {
  const [sortKey] = useState<SortKey>('createdAt');
  const [sortDir] = useState<SortDir>('desc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const lastSelectedIndexRef = useRef<number>(-1);

  const sorted = tasks;

  const handleHeaderClick = (_key: SortKey) => {
    // Sorting is controlled by the parent toolbar now.
  };

  // Build a flat list of all visible tasks for range-select purposes
  const flatTasks: Task[] = groupedTasks && groupedTasks.length > 1
    ? groupedTasks.flatMap((g) => g.tasks)
    : sorted;

  /**
   * Handle a checkbox click with optional shift-range support.
   * When shift is held, toggles the range from lastSelectedIndex to the clicked index.
   */
  const handleToggleSelectWithRange = useCallback(
    (taskId: string, shiftKey: boolean) => {
      const clickedIndex = flatTasks.findIndex((t) => t.id === taskId);
      if (clickedIndex === -1) {
        onToggleSelectById?.(taskId);
        return;
      }

      if (shiftKey && lastSelectedIndexRef.current >= 0) {
        const start = Math.min(lastSelectedIndexRef.current, clickedIndex);
        const end = Math.max(lastSelectedIndexRef.current, clickedIndex);
        const rangeIds = flatTasks.slice(start, end + 1).map((t) => t.id);
        // Add all tasks in range that aren't already selected
        rangeIds.forEach((id) => {
          if (!selectedTaskIds.includes(id)) {
            onToggleSelectById?.(id);
          }
        });
        // Don't update lastSelectedIndexRef on range-extend — anchor stays
      } else {
        onToggleSelectById?.(taskId);
        lastSelectedIndexRef.current = clickedIndex;
      }
    },
    [flatTasks, onToggleSelectById, selectedTaskIds],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!sorted.length) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, sorted.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const task = sorted[focusedIndex];
        if (task) onSelectTask(task.id);
      }
    },
    [sorted, focusedIndex, onSelectTask]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Sync focusedIndex when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId) {
      const idx = sorted.findIndex((t) => t.id === selectedTaskId);
      if (idx >= 0) setFocusedIndex(idx);
    }
  }, [selectedTaskId, sorted]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return (
      <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
    );
  };

  function renderRow(task: Task, idx: number) {
    return (
      <TaskListRow
        key={task.id}
        task={task}
        isSelected={task.id === selectedTaskId || idx === focusedIndex}
        isMultiSelected={selectedTaskIds.includes(task.id)}
        isBlocked={blockedTaskIds?.has(task.id) ?? false}
        onSelect={(e) => {
          if (onToggleSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
            onToggleSelect(task.id, e);
          } else {
            setFocusedIndex(idx);
            onSelectTask(task.id);
          }
        }}
        onToggleSelect={(id, shiftKey) => {
          handleToggleSelectWithRange(id, shiftKey ?? false);
        }}
        onMouseEnter={() => onHoverTask?.(task.id)}
        onMouseLeave={() => onHoverTask?.(null)}
        onStatusChange={(status) => onStatusChange(task.id, status)}
        onDelete={() => onDelete(task.id)}
      />
    );
  }

  return (
    <div
      role="grid"
      aria-label="Task list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        backgroundColor: 'var(--color-bg-primary)',
      }}
    >
      {/* Column headers */}
      <div
        role="row"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 32,
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          gap: 8,
        }}
      >
        {/* Checkbox column spacer */}
        <div style={{ width: 16, flexShrink: 0 }} />
        {/* Status icon spacer */}
        <div style={{ width: 18, flexShrink: 0 }} />
        <div style={{ width: 12, flexShrink: 0 }} />

        {COLUMNS.map((col) => {
          if (col.key === 'status') return null;
          const isTitle = col.key === 'title';
          return (
            <button
              key={col.key}
              role="columnheader"
              onClick={() => handleHeaderClick(col.key)}
              style={{
                flex: isTitle ? 1 : undefined,
                width: isTitle ? undefined : col.width,
                flexShrink: isTitle ? undefined : 0,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: sortKey === col.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {col.label}
              {sortIndicator(col.key)}
            </button>
          );
        })}
        {/* Spacer for delete button column */}
        <div style={{ width: 20, flexShrink: 0 }} />
      </div>

      {/* Rows */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            color: 'var(--color-text-muted)',
            fontSize: 14,
          }}
        >
          No tasks match your filters
        </div>
      ) : groupedTasks && groupedTasks.length > 1 ? (
        groupedTasks.map((group) => (
          <div key={group.key}>
            <div
              style={{
                padding: '10px 12px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                backgroundColor: 'var(--color-bg-wash)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {group.label} · {group.tasks.length}
            </div>
            {group.tasks.map((task) => {
              const idx = flatTasks.findIndex((t) => t.id === task.id);
              return renderRow(task, idx);
            })}
          </div>
        ))
      ) : (
        sorted.map((task, idx) => renderRow(task, idx))
      )}
    </div>
  );
}
