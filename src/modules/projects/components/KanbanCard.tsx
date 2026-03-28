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

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', className: 'text-[var(--color-accent)]' };
  if (isTomorrow(date)) return { text: 'Tomorrow', className: 'text-[var(--color-warning)]' };
  if (isPast(date)) return { text: format(date, 'MMM d'), className: 'text-[var(--color-danger)]' };
  return { text: format(date, 'MMM d'), className: 'text-[var(--color-text-muted)]' };
}

export function KanbanCard({ task, onDragStart, onDragEnd }: KanbanCardProps) {
  const due = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="px-3 py-2.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] cursor-grab active:cursor-grabbing hover:border-[var(--color-accent)] transition-colors shadow-sm"
    >
      {/* Title */}
      <p className="text-sm text-[var(--color-text-primary)] leading-snug mb-1.5">
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
          <span className={`flex items-center gap-0.5 text-[11px] ${due.className}`}>
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
                className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
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
