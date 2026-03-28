import { Circle, CheckCircle2, Clock, Trash2, Flag } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  0: 'transparent',
  1: 'var(--color-p4)',
  2: 'var(--color-p3)',
  3: 'var(--color-p2)',
  4: 'var(--color-p1)',
};

function StatusIcon({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  const next: Record<TaskStatus, TaskStatus> = {
    inbox: 'todo',
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
    cancelled: 'todo',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  if (status === 'done') {
    return (
      <button onClick={handleClick} className="text-[var(--color-success)] hover:text-[var(--color-text-secondary)] transition-colors">
        <CheckCircle2 size={18} />
      </button>
    );
  }
  if (status === 'in_progress') {
    return (
      <button onClick={handleClick} className="text-[var(--color-accent)] hover:text-[var(--color-success)] transition-colors">
        <Clock size={18} />
      </button>
    );
  }
  return (
    <button onClick={handleClick} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
      <Circle size={18} />
    </button>
  );
}

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', className: 'text-[var(--color-accent)]' };
  if (isTomorrow(date)) return { text: 'Tomorrow', className: 'text-[var(--color-warning)]' };
  if (isPast(date)) return { text: format(date, 'MMM d'), className: 'text-[var(--color-danger)]' };
  return { text: format(date, 'MMM d'), className: 'text-[var(--color-text-muted)]' };
}

export function TaskItem({ task, isSelected, onSelect, onStatusChange, onDelete }: TaskItemProps) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    inbox: 'todo',
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
    cancelled: 'todo',
  };

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)] bg-opacity-10 border border-[var(--color-accent)] border-opacity-30'
          : 'hover:bg-[var(--color-bg-secondary)] border border-transparent'
      } ${task.status === 'done' ? 'opacity-50' : ''}`}
    >
      {/* Status toggle */}
      <StatusIcon status={task.status} onClick={() => onStatusChange(nextStatus[task.status])} />

      {/* Priority indicator */}
      {task.priority > 0 && (
        <Flag size={14} style={{ color: PRIORITY_COLORS[task.priority] }} />
      )}

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          task.status === 'done' ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {task.title}
      </span>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="hidden sm:flex gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span className={`text-xs ${formatDueDate(task.dueDate).className}`}>
          {formatDueDate(task.dueDate).text}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
