import { useState } from 'react';
import type { Task, TaskStatus } from '@/shared/types/task';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  accentColor?: string;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox: 'var(--color-text-muted)',
  todo: 'var(--color-accent)',
  in_progress: 'var(--color-warning)',
  done: 'var(--color-success)',
  cancelled: 'var(--color-danger)',
};

export function KanbanColumn({ status, label, tasks, onDrop }: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDrop(taskId, status);
    }
  }

  return (
    <div
      className={`flex flex-col min-w-[240px] max-w-[300px] w-full rounded-xl bg-[var(--color-bg-secondary)] border transition-colors ${
        dragOver
          ? 'border-[var(--color-accent)] bg-opacity-80'
          : 'border-[var(--color-border)]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--color-border)]">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        />
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          {label}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto min-h-[100px] max-h-[calc(100vh-300px)]">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-[var(--color-text-muted)]">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', task.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {}}
            />
          ))
        )}
      </div>
    </div>
  );
}
