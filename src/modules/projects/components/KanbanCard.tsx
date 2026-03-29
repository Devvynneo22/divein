import { useState } from 'react';
import { Flag, Calendar } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import type { Task, TaskPriority } from '@/shared/types/task';

interface KanbanCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  0: 'transparent',
  1: 'var(--color-p4)',
  2: 'var(--color-p3)',
  3: 'var(--color-p2)',
  4: 'var(--color-p1)',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  0: '',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

function formatDueDate(dateStr: string): { text: string; color: string } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', color: 'var(--color-accent)' };
  if (isTomorrow(date)) return { text: 'Tomorrow', color: 'var(--color-warning)' };
  if (isPast(date)) return { text: format(date, 'MMM d'), color: 'var(--color-danger)' };
  return { text: format(date, 'MMM d'), color: 'var(--color-text-muted)' };
}

export function KanbanCard({ task, onDragStart, onDragEnd }: KanbanCardProps) {
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="card px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
      style={{
        borderColor: hovered ? 'var(--color-accent)' : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title */}
      <p className="text-sm leading-snug mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {task.title}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority */}
        {task.priority > 0 && (
          <span className="flex items-center gap-0.5" title={PRIORITY_LABELS[task.priority]}>
            <Flag size={12} style={{ color: PRIORITY_COLORS[task.priority] }} />
          </span>
        )}

        {/* Due date */}
        {due && (
          <span
            className="flex items-center gap-0.5 text-[11px]"
            style={{ color: due.color }}
          >
            <Calendar size={10} />
            {due.text}
          </span>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
