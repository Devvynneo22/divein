import React, { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus } from '@/shared/types/task';
import { TaskListRow } from './TaskListRow';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'title' | 'priority' | 'dueDate' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

function sortTasks(tasks: Task[], key: SortKey, dir: SortDir): Task[] {
  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'title':
        cmp = a.title.localeCompare(b.title);
        break;
      case 'priority':
        cmp = b.priority - a.priority;
        break;
      case 'dueDate': {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        cmp = da - db;
        break;
      }
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'createdAt':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

const COLUMNS: { key: SortKey; label: string; width?: string | number }[] = [
  { key: 'status', label: 'STATUS', width: 80 },
  { key: 'title', label: 'TITLE' },
  { key: 'priority', label: 'PRIORITY', width: 90 },
  { key: 'dueDate', label: 'DUE DATE', width: 100 },
];

export function TaskList({
  tasks,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
  onDelete,
}: TaskListProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const sorted = sortTasks(tasks, sortKey, sortDir);

  const handleHeaderClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
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
      ) : (
        sorted.map((task, idx) => (
          <TaskListRow
            key={task.id}
            task={task}
            isSelected={task.id === selectedTaskId || idx === focusedIndex}
            onSelect={() => {
              setFocusedIndex(idx);
              onSelectTask(task.id);
            }}
            onStatusChange={(status) => onStatusChange(task.id, status)}
            onDelete={() => onDelete(task.id)}
          />
        ))
      )}
    </div>
  );
}
