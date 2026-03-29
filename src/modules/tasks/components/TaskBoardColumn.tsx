import React, { useState } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskCard } from './TaskCard';

interface TaskBoardColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onDrop: (taskId: string) => void;
  onCreateTask: () => void;
  onSelectTask: (id: string) => void;
  selectedTaskId: string | null;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  draggingTaskId: string | null;
  onDragStart: (taskId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  subtaskProgressMap?: Record<string, { done: number; total: number }>;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog:     'var(--color-status-backlog, #a1a1aa)',
  inbox:       'var(--color-status-inbox, #a1a1aa)',
  todo:        'var(--color-status-todo, #60a5fa)',
  in_progress: 'var(--color-status-in-progress, #fb923c)',
  in_review:   'var(--color-status-in-review, #c084fc)',
  done:        'var(--color-status-done, #4ade80)',
  cancelled:   'var(--color-status-cancelled, #f87171)',
};

const STATUS_SOFT: Record<TaskStatus, string> = {
  backlog:     'var(--color-status-backlog-soft, rgba(161,161,170,0.06))',
  inbox:       'var(--color-status-inbox-soft, rgba(161,161,170,0.06))',
  todo:        'var(--color-status-todo-soft, rgba(96,165,250,0.06))',
  in_progress: 'var(--color-status-in-progress-soft, rgba(251,146,60,0.06))',
  in_review:   'var(--color-status-in-review-soft, rgba(192,132,252,0.06))',
  done:        'var(--color-status-done-soft, rgba(74,222,128,0.06))',
  cancelled:   'var(--color-status-cancelled-soft, rgba(248,113,113,0.06))',
};

export function TaskBoardColumn({
  status,
  label,
  tasks,
  onDrop,
  onCreateTask,
  onSelectTask,
  selectedTaskId,
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  draggingTaskId,
  onDragStart,
  onDragEnd,
  subtaskProgressMap,
}: TaskBoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);

  const dotColor = STATUS_COLORS[status];
  const columnBg = STATUS_SOFT[status];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only trigger if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDrop(taskId);
    }
  };

  return (
    <div
      style={{
        width: '280px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        border: isDragOver
          ? '2px dashed var(--color-accent, #6366f1)'
          : '2px solid transparent',
        transition: 'border-color 0.15s ease',
        backgroundColor: isDragOver
          ? 'var(--color-accent-soft, rgba(99,102,241,0.06))'
          : columnBg,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 12px 8px 12px',
          flexShrink: 0,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: columnBg,
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />

        {/* Column label */}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            flex: 1,
          }}
        >
          {label}
        </span>

        {/* Task count badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '20px',
            height: '20px',
            padding: '0 6px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
            lineHeight: 1,
          }}
        >
          {tasks.length}
        </span>

        {/* Add button */}
        <button
          onClick={onCreateTask}
          title={`Add task to ${label}`}
          onMouseEnter={() => setIsAddHovered(true)}
          onMouseLeave={() => setIsAddHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isAddHovered ? 'var(--color-bg-hover)' : 'transparent',
            color: isAddHovered ? 'var(--color-accent, #6366f1)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding: 0,
            transition: 'background-color 0.1s ease, color 0.1s ease',
          }}
        >
          +
        </button>
      </div>

      {/* Cards container — vertically scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minHeight: '80px',
        }}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            onSelect={() => onSelectTask(task.id)}
            onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
            onPriorityChange={(newPriority) => onPriorityChange(task.id, newPriority)}
            onDelete={() => onDeleteTask(task.id)}
            draggable={true}
            subtaskProgress={subtaskProgressMap?.[task.id]}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', task.id);
              e.dataTransfer.effectAllowed = 'move';
              onDragStart(task.id, e);
            }}
            onDragEnd={() => onDragEnd()}
          />
        ))}

        {/* Empty drop zone hint when dragging over an empty column */}
        {tasks.length === 0 && isDragOver && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: 'var(--color-accent, #6366f1)',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Drop here
          </div>
        )}

        {/* Empty state (no drag) */}
        {tasks.length === 0 && !isDragOver && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '13px',
            }}
          >
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskBoardColumn;
