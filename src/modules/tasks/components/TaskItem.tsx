import { useState } from 'react';
import { Circle, CheckCircle2, Clock, Trash2, Flag, ChevronRight, ChevronDown, Plus, Repeat } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { useSubtasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  /** Whether this item is itself a subtask (disables nesting) */
  isSubtask?: boolean;
  /** Drag & drop handlers (only for root tasks) */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  0: 'transparent',
  1: 'var(--color-p4)',
  2: 'var(--color-p3)',
  3: 'var(--color-p2)',
  4: 'var(--color-p1)',
};

function StatusIcon({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  if (status === 'done') {
    return (
      <button onClick={handleClick} aria-label="Mark as to do" className="text-[var(--color-success)] hover:text-[var(--color-text-secondary)] transition-colors">
        <CheckCircle2 size={18} />
      </button>
    );
  }
  if (status === 'in_progress') {
    return (
      <button onClick={handleClick} aria-label="Mark as done" className="text-[var(--color-accent)] hover:text-[var(--color-success)] transition-colors">
        <Clock size={18} />
      </button>
    );
  }
  return (
    <button onClick={handleClick} aria-label={`Mark as ${nextStatus[status]}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
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

const nextStatus: Record<TaskStatus, TaskStatus> = {
  inbox: 'todo',
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
  cancelled: 'todo',
};

export function TaskItem({
  task,
  isSelected,
  onSelect,
  onStatusChange,
  onDelete,
  isSubtask = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  const { data: subtasks = [] } = useSubtasks(isSubtask ? null : task.id);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const hasSubtasks = !isSubtask && subtasks.length > 0;

  function handleToggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  function handleAddSubtaskClick(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(true);
    setAddingSubtask(true);
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && subtaskTitle.trim()) {
      createTask.mutate({ title: subtaskTitle.trim(), parentId: task.id });
      setSubtaskTitle('');
    }
    if (e.key === 'Escape') {
      setAddingSubtask(false);
      setSubtaskTitle('');
    }
  }

  function handleSubtaskStatusChange(subtaskId: string, status: TaskStatus) {
    updateTask.mutate({ id: subtaskId, data: { status } });
  }

  function handleSubtaskDelete(subtaskId: string) {
    deleteTask.mutate(subtaskId);
  }

  return (
    <div>
      <div
        onClick={onSelect}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[var(--color-accent)] bg-opacity-10 border border-[var(--color-accent)] border-opacity-30'
            : 'hover:bg-[var(--color-bg-secondary)] border border-transparent'
        } ${task.status === 'done' ? 'opacity-50' : ''} ${isSubtask ? 'ml-6' : ''}`}
      >
        {/* Expand/collapse for parent tasks */}
        {!isSubtask && (
          <button
            onClick={hasSubtasks ? handleToggleExpand : handleAddSubtaskClick}
            className={`flex-shrink-0 w-4 transition-colors ${
              hasSubtasks
                ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                : 'text-transparent group-hover:text-[var(--color-text-muted)] hover:!text-[var(--color-accent)]'
            }`}
          >
            {hasSubtasks ? (
              expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <Plus size={14} />
            )}
          </button>
        )}

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

        {/* Recurrence badge */}
        {task.recurrence && (
          <Repeat size={12} className="flex-shrink-0 text-[var(--color-accent)]" />
        )}

        {/* Subtask count */}
        {hasSubtasks && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}
          </span>
        )}

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

        {/* Add subtask button (on hover, for parent tasks with subtasks) */}
        {!isSubtask && hasSubtasks && (
          <button
            onClick={handleAddSubtaskClick}
            className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-all"
          >
            <Plus size={14} />
          </button>
        )}

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete task"
          className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Subtasks (expanded) */}
      {!isSubtask && expanded && (
        <div>
          {subtasks.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              isSelected={false}
              onSelect={() => {}}
              onStatusChange={(status) => handleSubtaskStatusChange(sub.id, status)}
              onDelete={() => handleSubtaskDelete(sub.id)}
              isSubtask
            />
          ))}

          {/* Add subtask input */}
          {addingSubtask && (
            <div className="ml-6 px-3 py-1.5">
              <input
                autoFocus
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                onBlur={() => {
                  if (!subtaskTitle.trim()) setAddingSubtask(false);
                }}
                placeholder="Add subtask... (Enter to save, Esc to cancel)"
                className="w-full px-3 py-1.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
