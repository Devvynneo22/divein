import React, { useState, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskBoardColumn } from './TaskBoardColumn';
import { useTaskSettingsStore } from '@/shared/stores/taskSettingsStore';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { DENSITY_CONFIGS } from '../lib/densityConfig';

interface TaskBoardProps {
  tasks: Task[];
  selectedTaskId: string | null;
  selectedTaskIds?: string[];
  onSelectTask: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onHoverTask?: (id: string | null) => void;
  groupBy: 'status';
  swimlaneBy?: string; // 'priority' | 'project' | 'assignee' | etc.
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (status: TaskStatus) => void;
  onReorderTask: (taskId: string, newOrder: number) => void;
  subtaskProgressMap?: Record<string, { done: number; total: number }>;
  blockedTaskIds?: Set<string>;
}

const STATUS_COLUMN_ORDER: TaskStatus[] = [
  'backlog',
  'inbox',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
];

// These columns always show even if empty
const ALWAYS_SHOW: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done'];

const PRIORITY_LABELS: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Low',
  0: 'No Priority',
};
const PRIORITY_ORDER = [4, 3, 2, 1, 0];

const PRIORITY_COLORS: Record<number, string> = {
  4: 'var(--color-danger, #ef4444)',
  3: 'var(--color-p3, #f97316)',
  2: 'var(--color-warning, #eab308)',
  1: 'var(--color-accent, #3b82f6)',
  0: 'var(--color-text-muted)',
};

/** Get swimlane key + label for a task based on the swimlaneBy dimension. */
function getSwimlaneKey(task: Task, swimlaneBy: string): string {
  if (swimlaneBy === 'priority') return String(task.priority);
  if (swimlaneBy === 'project') return task.projectId ?? '__none__';
  return '__all__';
}

function getSwimlaneLabelForKey(key: string, swimlaneBy: string): string {
  if (swimlaneBy === 'priority') {
    const p = parseInt(key, 10);
    return PRIORITY_LABELS[p] ?? 'Unknown';
  }
  if (swimlaneBy === 'project') {
    return key === '__none__' ? 'No Project' : `Project ${key}`;
  }
  return 'All Tasks';
}

function getSwimlaneColor(key: string, swimlaneBy: string): string {
  if (swimlaneBy === 'priority') {
    const p = parseInt(key, 10);
    return PRIORITY_COLORS[p] ?? 'var(--color-text-muted)';
  }
  return 'var(--color-accent)';
}

interface SwimlaneRow {
  key: string;
  label: string;
  color: string;
  tasks: Task[];
}

export function TaskBoard({
  tasks,
  selectedTaskId,
  selectedTaskIds = [],
  onSelectTask,
  onToggleSelect,
  onHoverTask,
  swimlaneBy,
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  onCreateTask,
  onReorderTask,
  subtaskProgressMap,
  blockedTaskIds,
}: TaskBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const customStatuses = useTaskSettingsStore((s) => s.customStatuses);
  const density = useAppSettingsStore((s) => s.app.taskDensity);
  const dc = DENSITY_CONFIGS[density];

  // Build column list from customStatuses (or fallback to default order)
  const columnStatuses: TaskStatus[] = STATUS_COLUMN_ORDER.filter((s) => {
    const cs = customStatuses.find((cs) => cs.id === s);
    return cs !== undefined;
  });

  // Build status labels from custom statuses
  const statusLabels: Record<string, string> = {};
  for (const cs of customStatuses) {
    statusLabels[cs.id] = cs.name;
  }

  // Determine which columns to render (always show + non-empty)
  const visibleStatuses = columnStatuses.filter(
    (status) => ALWAYS_SHOW.includes(status) || tasks.some((t) => t.status === status),
  );

  const handleDrop = useCallback(
    (targetStatus: TaskStatus, taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== targetStatus) {
        onStatusChange(taskId, targetStatus);
      }
      setDraggingTaskId(null);
    },
    [tasks, onStatusChange],
  );

  const handleReorderWithinColumn = useCallback(
    (status: TaskStatus, taskId: string, beforeTaskId: string | null) => {
      const columnTasks = tasks.filter((t) => t.status === status);
      const moving = tasks.find((t) => t.id === taskId);
      if (!moving) return;

      if (moving.status !== status) {
        onStatusChange(taskId, status);
      }

      const withoutMoving = columnTasks.filter((t) => t.id !== taskId);
      const insertIndex = beforeTaskId ? withoutMoving.findIndex((t) => t.id === beforeTaskId) : withoutMoving.length;
      const finalIndex = insertIndex === -1 ? withoutMoving.length : insertIndex;

      const previous = withoutMoving[finalIndex - 1];
      const next = withoutMoving[finalIndex];

      let newOrder: number;
      if (previous && next) newOrder = (previous.sortOrder + next.sortOrder) / 2;
      else if (previous) newOrder = previous.sortOrder + 1;
      else if (next) newOrder = next.sortOrder - 1;
      else newOrder = moving.sortOrder;

      onReorderTask(taskId, newOrder);
      setDraggingTaskId(null);
    },
    [tasks, onStatusChange, onReorderTask],
  );

  const handleDragStart = useCallback((taskId: string) => {
    setDraggingTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
  }, []);

  // ── Swimlanes mode ────────────────────────────────────────────────────────

  if (swimlaneBy) {
    // Build swimlane rows
    const rowMap = new Map<string, Task[]>();

    // Pre-populate in priority order
    if (swimlaneBy === 'priority') {
      for (const p of PRIORITY_ORDER) rowMap.set(String(p), []);
    }

    for (const task of tasks) {
      const key = getSwimlaneKey(task, swimlaneBy);
      if (!rowMap.has(key)) rowMap.set(key, []);
      rowMap.get(key)!.push(task);
    }

    const swimlanes: SwimlaneRow[] = [];
    for (const [key, rowTasks] of rowMap.entries()) {
      if (rowTasks.length === 0 && swimlaneBy !== 'priority') continue;
      swimlanes.push({
        key,
        label: getSwimlaneLabelForKey(key, swimlaneBy),
        color: getSwimlaneColor(key, swimlaneBy),
        tasks: rowTasks,
      });
    }

    return (
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 24px',
          gap: 24,
        }}
      >
        {/* Column header row (sticky) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: 'var(--color-bg-primary)',
            paddingBottom: 8,
            paddingLeft: 180, // offset for swimlane label column
          }}
        >
          {visibleStatuses.map((status) => {
            const cs = customStatuses.find((c) => c.id === status);
            const color = cs ? cs.color : 'var(--color-text-muted)';
            return (
              <div
                key={status}
                style={{
                  width: 220,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingLeft: 8,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {statusLabels[status] ?? status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Swimlane rows */}
        {swimlanes.map((lane) => (
          <div key={lane.key} style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            {/* Lane header */}
            <div
              style={{
                width: 168,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                paddingTop: 12,
                paddingRight: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 3,
                    height: 32,
                    borderRadius: 2,
                    backgroundColor: lane.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {lane.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {lane.tasks.length} task{lane.tasks.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Mini columns for this swimlane */}
            {visibleStatuses.map((status) => {
              const columnTasks = lane.tasks.filter((t) => t.status === status);
              return (
                <SwimlaneCell
                  key={status}
                  status={status}
                  tasks={columnTasks}
                  allTasks={tasks}
                  selectedTaskId={selectedTaskId}
                  selectedTaskIds={selectedTaskIds}
                  onSelectTask={onSelectTask}
                  onToggleSelect={onToggleSelect}
                  onHoverTask={onHoverTask}
                  onStatusChange={onStatusChange}
                  onPriorityChange={onPriorityChange}
                  onDeleteTask={onDeleteTask}
                  onCreateTask={onCreateTask}
                  onReorderTask={onReorderTask}
                  draggingTaskId={draggingTaskId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  handleDrop={handleDrop}
                  handleReorderWithinColumn={handleReorderWithinColumn}
                  subtaskProgressMap={subtaskProgressMap}
                  blockedTaskIds={blockedTaskIds}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ── Standard board (no swimlanes) ─────────────────────────────────────────

  const tasksByStatus = columnStatuses.reduce<Partial<Record<TaskStatus, Task[]>>>(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {},
  );

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: `${dc.column.gap}px`,
        padding: '16px 24px',
        minHeight: 0,
        alignItems: 'stretch',
      }}
    >
      {visibleStatuses.map((status) => (
        <TaskBoardColumn
          key={status}
          status={status}
          label={statusLabels[status] ?? status}
          tasks={tasksByStatus[status] ?? []}
          onDrop={(taskId) => handleDrop(status, taskId)}
          onCreateTask={() => onCreateTask(status)}
          onReorderWithinColumn={(taskId, beforeTaskId) => handleReorderWithinColumn(status, taskId, beforeTaskId)}
          onSelectTask={onSelectTask}
          onToggleSelect={onToggleSelect}
          onHoverTask={onHoverTask}
          selectedTaskId={selectedTaskId}
          selectedTaskIds={selectedTaskIds}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onDeleteTask={onDeleteTask}
          draggingTaskId={draggingTaskId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          subtaskProgressMap={subtaskProgressMap}
          blockedTaskIds={blockedTaskIds}
        />
      ))}
    </div>
  );
}

// ── SwimlaneCell: a lightweight mini-column used inside swimlane rows ─────────

interface SwimlaneCellProps {
  status: TaskStatus;
  tasks: Task[];
  allTasks: Task[];
  selectedTaskId: string | null;
  selectedTaskIds: string[];
  onSelectTask: (id: string) => void;
  onToggleSelect?: (id: string, e: React.MouseEvent) => void;
  onHoverTask?: (id: string | null) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (status: TaskStatus) => void;
  onReorderTask: (taskId: string, newOrder: number) => void;
  draggingTaskId: string | null;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  handleDrop: (status: TaskStatus, taskId: string) => void;
  handleReorderWithinColumn: (status: TaskStatus, taskId: string, beforeTaskId: string | null) => void;
  subtaskProgressMap?: Record<string, { done: number; total: number }>;
  blockedTaskIds?: Set<string>;
}

function SwimlaneCell({
  status,
  tasks,
  selectedTaskId,
  selectedTaskIds,
  onSelectTask,
  onToggleSelect,
  onHoverTask,
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  onCreateTask,
  draggingTaskId,
  onDragStart,
  onDragEnd,
  handleDrop,
  handleReorderWithinColumn,
  subtaskProgressMap,
  blockedTaskIds,
}: SwimlaneCellProps) {
  return (
    <TaskBoardColumn
      status={status}
      label=""
      tasks={tasks}
      onDrop={(taskId) => handleDrop(status, taskId)}
      onCreateTask={() => onCreateTask(status)}
      onReorderWithinColumn={(taskId, beforeTaskId) => handleReorderWithinColumn(status, taskId, beforeTaskId)}
      onSelectTask={onSelectTask}
      onToggleSelect={onToggleSelect}
      onHoverTask={onHoverTask}
      selectedTaskId={selectedTaskId}
      selectedTaskIds={selectedTaskIds}
      onStatusChange={onStatusChange}
      onPriorityChange={onPriorityChange}
      onDeleteTask={onDeleteTask}
      draggingTaskId={draggingTaskId}
      onDragStart={(taskId, _e) => onDragStart(taskId)}
      onDragEnd={onDragEnd}
      subtaskProgressMap={subtaskProgressMap}
      blockedTaskIds={blockedTaskIds}
      hideHeader={true}
      compactMode={true}
    />
  );
}

export default TaskBoard;
