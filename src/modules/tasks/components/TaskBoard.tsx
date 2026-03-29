import React, { useState, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskBoardColumn } from './TaskBoardColumn';

interface TaskBoardProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  groupBy: 'status';
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTask: (status: TaskStatus) => void;
  subtaskProgressMap?: Record<string, { done: number; total: number }>;
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

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog:     'Backlog',
  inbox:       'Inbox',
  todo:        'Todo',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
  cancelled:   'Cancelled',
};

// These columns always show even if empty
const ALWAYS_SHOW: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done'];

export function TaskBoard({
  tasks,
  selectedTaskId,
  onSelectTask,
  onStatusChange,
  onPriorityChange,
  onDeleteTask,
  onCreateTask,
  subtaskProgressMap,
}: TaskBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Group tasks by status
  const tasksByStatus = STATUS_COLUMN_ORDER.reduce<Record<TaskStatus, Task[]>>(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );

  // Determine which columns to render
  const visibleStatuses = STATUS_COLUMN_ORDER.filter(
    (status) => ALWAYS_SHOW.includes(status) || tasksByStatus[status].length > 0,
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

  const handleDragStart = useCallback(
    (taskId: string) => {
      setDraggingTaskId(taskId);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
  }, []);

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Scrollable board row */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          padding: '16px 24px 0 24px',
          alignItems: 'flex-start',
          minHeight: '100%',
          flex: 1,
        }}
      >
        {visibleStatuses.map((status) => (
          <TaskBoardColumn
            key={status}
            status={status}
            label={STATUS_LABELS[status]}
            tasks={tasksByStatus[status]}
            onDrop={(taskId) => handleDrop(status, taskId)}
            onCreateTask={() => onCreateTask(status)}
            onSelectTask={onSelectTask}
            selectedTaskId={selectedTaskId}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
            onDeleteTask={onDeleteTask}
            draggingTaskId={draggingTaskId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            subtaskProgressMap={subtaskProgressMap}
          />
        ))}
      </div>
    </div>
  );
}

export default TaskBoard;
