import React, { useState, useRef, useEffect } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskCard } from './TaskCard';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { useTaskSettingsStore } from '@/shared/stores/taskSettingsStore';
import { DENSITY_CONFIGS } from '../lib/densityConfig';

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
  const [isWipIndicatorHovered, setIsWipIndicatorHovered] = useState(false);
  const [isEditingWip, setIsEditingWip] = useState(false);
  const [wipInputValue, setWipInputValue] = useState('');
  const wipInputRef = useRef<HTMLInputElement>(null);

  const density = useAppSettingsStore((s) => s.app.taskDensity);
  const dc = DENSITY_CONFIGS[density];
  const { wipLimits, setWipLimit, removeWipLimit } = useTaskSettingsStore();

  const wipLimit = wipLimits[status] ?? null;
  const count = tasks.length;
  const isWipExceeded = wipLimit !== null && count > wipLimit;
  const isWipAtLimit = wipLimit !== null && count === wipLimit;
  const hasWip = wipLimit !== null;

  const accentColor = STATUS_ACCENT[status];
  const columnCardGap = `${dc.card.gap}px`;
  const columnCardPaddingH = density === 'compact' ? '6px' : '8px';

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingWip && wipInputRef.current) {
      wipInputRef.current.focus();
      wipInputRef.current.select();
    }
  }, [isEditingWip]);

  const startWipEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWipInputValue(wipLimit !== null ? String(wipLimit) : '');
    setIsEditingWip(true);
  };

  const commitWipEdit = () => {
    const parsed = parseInt(wipInputValue.trim(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setWipLimit(status, parsed);
    } else if (wipInputValue.trim() === '' && hasWip) {
      removeWipLimit(status);
    }
    setIsEditingWip(false);
  };

  const cancelWipEdit = () => {
    setIsEditingWip(false);
  };

  const handleWipKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitWipEdit();
    else if (e.key === 'Escape') cancelWipEdit();
  };

  const handleWipRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasWip) removeWipLimit(status);
  };

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

  // Determine header background based on WIP state
  const headerGradient = isWipExceeded
    ? `linear-gradient(135deg, var(--color-danger-soft, rgba(239,68,68,0.12)) 0%, rgba(239,68,68,0.05) 100%)`
    : `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`;

  // Column border glow when exceeded
  const columnBorder = isWipExceeded
    ? `2px solid var(--color-danger, #ef4444)`
    : isDragOver
      ? `2px dashed ${accentColor}`
      : '1px solid var(--color-border)';

  const columnBoxShadow = isWipExceeded
    ? undefined
    : isDragOver
      ? `0 0 0 3px ${accentColor}30`
      : '0 2px 8px rgba(0,0,0,0.06)';

  // Count badge styling
  const countBadgeBg = isWipExceeded
    ? 'rgba(239,68,68,0.15)'
    : isWipAtLimit
      ? 'rgba(234,179,8,0.15)'
      : STATUS_BADGE_BG[status];

  const countBadgeColor = isWipExceeded
    ? 'var(--color-danger, #ef4444)'
    : isWipAtLimit
      ? 'var(--color-warning, #eab308)'
      : STATUS_BADGE_TEXT[status];

  return (
    <div
      style={{
        width: compactMode ? '220px' : `${dc.column.width}px`,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: compactMode ? undefined : '100%',
        minHeight: 0,
        borderRadius: '12px',
        overflow: 'visible',
        border: columnBorder,
        borderLeft: isWipExceeded ? `3px solid var(--color-danger, #ef4444)` : `3px solid ${accentColor}60`,
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.2s ease',
        backgroundColor: isDragOver ? `${accentColor}10` : 'var(--color-bg-secondary)',
        boxShadow: columnBoxShadow,
        animation: isWipExceeded ? 'wip-pulse 2s ease-in-out infinite' : undefined,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Pulse keyframe injected via a style tag — only once */}
      {isWipExceeded && (
        <style>{`
          @keyframes wip-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
            50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.25); }
          }
        `}</style>
      )}

      {/* Column Header */}
      {!hideHeader && (
        <div
          style={{
            flexShrink: 0,
            borderBottom: '1px solid rgba(0,0,0,0.04)',
            background: headerGradient,
            transition: 'background 0.2s ease',
            borderRadius: '11px 11px 0 0',
            overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: '3px',
              background: isWipExceeded
                ? `linear-gradient(90deg, var(--color-danger, #ef4444) 0%, rgba(239,68,68,0.5) 100%)`
                : `linear-gradient(90deg, ${accentColor} 0%, ${accentColor}80 100%)`,
              borderRadius: '11px 11px 0 0',
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
            {/* Accent Dot + Emoji */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isWipExceeded ? 'var(--color-danger, #ef4444)' : accentColor,
                  flexShrink: 0,
                }}
              />
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
            </div>

            {/* Column name */}
            <span
              style={{
                fontSize: `${dc.column.headerSize}px`,
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
                backgroundColor: countBadgeBg,
                color: countBadgeColor,
                lineHeight: 1,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {hasWip ? `${count}/${wipLimit}` : count}
            </span>

            {/* WIP limit indicator / inline editor */}
            {isEditingWip ? (
              <input
                ref={wipInputRef}
                type="number"
                min={1}
                value={wipInputValue}
                onChange={(e) => setWipInputValue(e.target.value)}
                onKeyDown={handleWipKeyDown}
                onBlur={commitWipEdit}
                placeholder="limit"
                style={{
                  width: '48px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-accent)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                  MozAppearance: 'textfield',
                }}
              />
            ) : (
              <button
                onClick={startWipEdit}
                onContextMenu={handleWipRightClick}
                onMouseEnter={() => setIsWipIndicatorHovered(true)}
                onMouseLeave={() => setIsWipIndicatorHovered(false)}
                title={hasWip ? `WIP limit: ${wipLimit} (click to edit, right-click to remove)` : 'Set WIP limit (click)'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: hasWip
                    ? `1px solid ${isWipExceeded ? 'var(--color-danger, #ef4444)' : isWipAtLimit ? 'var(--color-warning, #eab308)' : 'var(--color-border)'}`
                    : `1px dashed var(--color-border)`,
                  backgroundColor: isWipIndicatorHovered
                    ? 'var(--color-bg-hover)'
                    : hasWip
                      ? 'transparent'
                      : 'transparent',
                  color: hasWip
                    ? isWipExceeded
                      ? 'var(--color-danger, #ef4444)'
                      : isWipAtLimit
                        ? 'var(--color-warning, #eab308)'
                        : 'var(--color-text-muted)'
                    : isWipIndicatorHovered
                      ? 'var(--color-text-secondary)'
                      : 'var(--color-text-muted)',
                  fontSize: '10px',
                  fontWeight: 600,
                  lineHeight: 1,
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.1s ease',
                  fontFamily: 'inherit',
                }}
              >
                {hasWip ? `⚡${wipLimit}` : '∞'}
              </button>
            )}

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
          overflowX: 'hidden',
          padding: `8px ${columnCardPaddingH}`,
          display: 'flex',
          flexDirection: 'column',
          gap: columnCardGap,
          minHeight: '80px',
          borderRadius: '0 0 12px 12px',
          backgroundColor: 'var(--color-bg-secondary)',
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
              onToggleSelect={(id) => {
                if (onToggleSelect) {
                  onToggleSelect(id, { shiftKey: false, metaKey: true, ctrlKey: true, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
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
