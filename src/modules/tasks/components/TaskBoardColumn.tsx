import React, { useState } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskCard } from './TaskCard';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';

// Soft WIP limit per column — show a warning if exceeded
const WIP_LIMIT = 5;

interface TaskBoardColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onDrop: (taskId: string) => void;
  onReorderWithinColumn: (taskId: string, beforeTaskId: string | null) => void;
  onCreateTask: () => void;
  onSelectTask: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onHoverTask?: (id: string | null) => void;
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  draggingTaskId: string | null;
  onDragStart: (taskId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  subtaskProgressMap?: Record<string, { done: number; total: number }>;
  blockedTaskIds?: Set<string>;
  /** When true, hides the column header (used inside swimlane cells). */
  hideHeader?: boolean;
  /** When true, uses a more compact fixed width for swimlane grid. */
  compactMode?: boolean;
}

// Status → vibrant solid color for the header accent bar
const STATUS_ACCENT: Record<TaskStatus, string> = {
  backlog:     '#94a3b8',
  inbox:       '#64748b',
  todo:        '#3b82f6',
  in_progress: '#f97316',
  in_review:   '#a855f7',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};

// Status → emoji prefix
const STATUS_EMOJI: Record<TaskStatus, string> = {
  backlog:     '📋',
  inbox:       '📥',
  todo:        '📌',
  in_progress: '⏳',
  in_review:   '🔍',
  done:        '✅',
  cancelled:   '🚫',
};

// Count badge colors per status (pill style)
const STATUS_BADGE_BG: Record<TaskStatus, string> = {
  backlog:     '#e2e8f0',
  inbox:       '#e2e8f0',
  todo:        '#dbeafe',
  in_progress: '#ffedd5',
  in_review:   '#f3e8ff',
  done:        '#dcfce7',
  cancelled:   '#fee2e2',
};
const STATUS_BADGE_TEXT: Record<TaskStatus, string> = {
  backlog:     '#64748b',
  inbox:       '#475569',
  todo:        '#1d4ed8',
  in_progress: '#c2410c',
  in_review:   '#7e22ce',
  done:        '#15803d',
  cancelled:   '#b91c1c',
};

export function TaskBoardColumn({
  status,
  label,
  tasks,
  onDrop,
  onCreateTask,
  onReorderWithinColumn,
  onSelectTask,
  onToggleSelect,
  onHoverTask,
  selectedTaskId,
  selectedTaskIds = [],
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  draggingTaskId,
  onDragStart,
  onDragEnd,
  subtaskProgressMap,
  blockedTaskIds,
  hideHeader = false,
  compactMode = false,
}: TaskBoardColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const [isMoreHovered, setIsMoreHovered] = useState(false);
  const density = useAppSettingsStore((s) => s.app.taskDensity);

  const accentColor = STATUS_ACCENT[status];
  const isWipExceeded = tasks.length > WIP_LIMIT;
  const columnCardGap = density === 'compact' ? '4px' : density === 'spacious' ? '12px' : '8px';
  const columnCardPaddingH = density === 'compact' ? '6px' : '8px';

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onDrop(taskId);
  };

  return (
    <div
      style={{
        width: compactMode ? '220px' : '300px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: compactMode ? undefined : '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        border: isDragOver
          ? `2px dashed ${accentColor}`
          : '1px solid var(--color-border)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        backgroundColor: isDragOver
          ? `${accentColor}10`
          : 'var(--color-bg-secondary)',
        boxShadow: isDragOver
          ? `0 0 0 3px ${accentColor}30, var(--shadow-md)`
          : 'var(--shadow-sm)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      {!hideHeader && (
        <div
          style={{
            flexShrink: 0,
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          {/* Accent color bar at very top */}
          <div
            style={{
              height: '3px',
              backgroundColor: accentColor,
              borderRadius: '16px 16px 0 0',
            }}
          />

          {/* Header content */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px 10px 12px',
            }}
          >
            {/* Emoji + Label */}
            <span
              style={{
                fontSize: '15px',
                lineHeight: 1,
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              {STATUS_EMOJI[status]}
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: isWipExceeded ? 'var(--color-danger, #ef4444)' : 'var(--color-text-primary)',
                flex: 1,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
              {isWipExceeded && (
                <span title={`WIP limit exceeded (limit: ${WIP_LIMIT})`} style={{ marginLeft: '5px' }}>
                  ⚠️
                </span>
              )}
            </span>

            {/* Count badge — vibrant pill */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '22px',
                height: '20px',
                padding: '0 7px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: isWipExceeded ? 'rgba(239,68,68,0.15)' : STATUS_BADGE_BG[status],
                color: isWipExceeded ? '#ef4444' : STATUS_BADGE_TEXT[status],
                lineHeight: 1,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {tasks.length}
            </span>

            {/* Add button */}
            <button
              onClick={(e) => { e.stopPropagation(); onCreateTask(); }}
              title={`Add task to ${label}`}
              onMouseEnter={() => setIsAddHovered(true)}
              onMouseLeave={() => setIsAddHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isAddHovered ? 'var(--color-bg-hover)' : 'transparent',
                color: isAddHovered ? accentColor : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: 1,
                padding: 0,
                transition: 'background-color 0.1s ease, color 0.1s ease',
                flexShrink: 0,
              }}
            >
              +
            </button>

            {/* More (···) button */}
            <button
              title="Column options"
              onMouseEnter={() => setIsMoreHovered(true)}
              onMouseLeave={() => setIsMoreHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isMoreHovered ? 'var(--color-bg-hover)' : 'transparent',
                color: isMoreHovered ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: 1,
                padding: 0,
                transition: 'background-color 0.1s ease, color 0.1s ease',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}
            >
              ···
            </button>
          </div>
        </div>
      )}

      {/* Cards container — vertically scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: columnCardPaddingH,
          display: 'flex',
          flexDirection: 'column',
          gap: columnCardGap,
          minHeight: '80px',
          paddingTop: '8px',
          paddingBottom: '8px',
        }}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId && taskId !== task.id) {
                onReorderWithinColumn(taskId, task.id);
              }
            }}
          >
            <TaskCard
              task={task}
              isSelected={selectedTaskId === task.id}
              isMultiSelected={selectedTaskIds.includes(task.id)}
              isBlocked={blockedTaskIds?.has(task.id) ?? false}
              onSelect={(e) => {
                if (onToggleSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
                  onToggleSelect(task.id, e);
                } else {
                  onSelectTask(task.id);
                }
              }}
              onMouseEnter={() => onHoverTask?.(task.id)}
              onMouseLeave={() => onHoverTask?.(null)}
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
          </div>
        ))}

        {/* Drop zone at end of non-empty column */}
        {isDragOver && tasks.length > 0 && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const taskId = e.dataTransfer.getData('text/plain');
              if (taskId) onReorderWithinColumn(taskId, null);
            }}
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: `${accentColor}30`,
              border: `2px dashed ${accentColor}`,
            }}
          />
        )}

        {/* Drop hint for empty column being dragged over */}
        {tasks.length === 0 && isDragOver && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: accentColor,
              fontSize: '13px',
              fontWeight: 600,
              border: `2px dashed ${accentColor}50`,
              borderRadius: '10px',
              margin: '4px',
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
