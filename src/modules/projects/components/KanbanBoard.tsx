import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/shared/lib/taskService';
import type { Task, TaskStatus } from '@/shared/types/task';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'inbox', label: 'Inbox' },
  { status: 'todo', label: 'Todo' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
  { status: 'cancelled', label: 'Cancelled' },
];

export function KanbanBoard({ projectId, tasks }: KanbanBoardProps) {
  const qc = useQueryClient();

  const handleDrop = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;

      try {
        await taskService.update(taskId, { status: newStatus });
      } catch (error) {
        console.error('Failed to update task status on drop:', error);
      } finally {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['projects'] });
      }
    },
    [tasks, projectId, qc],
  );

  const tasksByStatus = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.status),
  }));

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 h-full">
      {tasksByStatus.map((col) => (
        <KanbanColumn
          key={col.status}
          status={col.status}
          label={col.label}
          tasks={col.tasks}
          onDrop={handleDrop}
        />
      ))}
    </div>
  );
}
