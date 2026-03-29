import React, { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus } from '@/shared/types/task';
import { TaskListRow } from './TaskListRow';
import type { TaskGroup } from './taskViewUtils';

interface TaskListProps {
  tasks: Task[];
  groupedTasks?: TaskGroup[];
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onSelectTask: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onHoverTask?: (id: string | null) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  blockedTaskIds?: Set<string>;
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
  onHoverTask,
  onStatusChange,
  onDelete,
  blockedTaskIds,
}: TaskListProps) {
  const [sortKey] = useState<SortKey>('createdAt');
  const [sortDir] = useState<SortDir>('desc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const sorted = tasks;

  const handleHeaderClick = (_key: SortKey) => {
    // Sorting is controlled by the parent toolbar now.
  };

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
        {/* Status header — fixed width to match row */}
        <div style={{ width: 18, flexShrink: 0 }} />
        <div style={{ width: 12, flexShrink: 0 }} />

        {COLUMNS.map((col) => {
          if (col.key === 'status') return null; // status is the icon area above
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
      {sorted.length === 0 ? (
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
              const idx = sorted.findIndex((t) => t.id === task.id);
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
                  onMouseEnter={() => onHoverTask?.(task.id)}
                  onMouseLeave={() => onHoverTask?.(null)}
                  onStatusChange={(status) => onStatusChange(task.id, status)}
                  onDelete={() => onDelete(task.id)}
                />
              );
            })}
          </div>
        ))
      ) : (
        sorted.map((task, idx) => (
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
            onMouseEnter={() => onHoverTask?.(task.id)}
            onMouseLeave={() => onHoverTask?.(null)}
            onStatusChange={(status) => onStatusChange(task.id, status)}
            onDelete={() => onDelete(task.id)}
          />
        ))
      )}
    </div>
  );
}
