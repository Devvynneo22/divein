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
      <button
        onClick={handleClick}
        aria-label="Mark as to do"
        className="transition-colors"
        style={{ color: 'var(--color-success)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-success)'; }}
      >
        <CheckCircle2 size={18} />
      </button>
    );
  }
  if (status === 'in_progress') {
    return (
      <button
        onClick={handleClick}
        aria-label="Mark as done"
        className="transition-colors"
        style={{ color: 'var(--color-accent)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-success)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
      >
        <Clock size={18} />
      </button>
    );
  }
  return (
    <button
      onClick={handleClick}
      aria-label={`Mark as ${nextStatus[status]}`}
      className="transition-colors"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
    >
      <Circle size={18} />
    </button>
  );
}

function formatDueDate(dateStr: string): { text: string; color: string } {
  const date = new Date(dateStr);
  if (isToday(date)) return { text: 'Today', color: 'var(--color-accent)' };
  if (isTomorrow(date)) return { text: 'Tomorrow', color: 'var(--color-warning)' };
  if (isPast(date)) return { text: format(date, 'MMM d'), color: 'var(--color-danger)' };
  return { text: format(date, 'MMM d'), color: 'var(--color-text-muted)' };
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  backlog: 'todo',
  inbox: 'todo',
  todo: 'in_progress',
  in_progress: 'in_review',
  in_review: 'done',
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
  const [isHovered, setIsHovered] = useState(false);

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

  const rowBg = isSelected
    ? 'var(--color-accent-soft)'
    : isHovered
    ? 'var(--color-bg-hover)'
    : 'transparent';

  const rowBorder = isSelected
    ? '1px solid var(--color-accent-muted)'
    : '1px solid transparent';

  const dueDateInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer transition-colors ${
          task.status === 'done' ? 'opacity-50' : ''
        } ${isSubtask ? 'ml-7' : ''}`}
        style={{ backgroundColor: rowBg, border: rowBorder }}
      >
        {/* Expand/collapse for parent tasks */}
        {!isSubtask && (
          <button
            onClick={hasSubtasks ? handleToggleExpand : handleAddSubtaskClick}
            className="flex-shrink-0 w-4 transition-colors"
            style={{
              color: hasSubtasks
                ? 'var(--color-text-muted)'
                : isHovered
                ? 'var(--color-text-muted)'
                : 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = hasSubtasks
                ? 'var(--color-text-primary)'
                : 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = hasSubtasks
                ? 'var(--color-text-muted)'
                : isHovered
                ? 'var(--color-text-muted)'
                : 'transparent';
            }}
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
          <Flag size={14} style={{ color: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
        )}

        {/* Title */}
        <span
          className="flex-1 text-sm truncate"
          style={{
            color: task.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>

        {/* Recurrence badge */}
        {task.recurrence && (
          <Repeat size={12} className="flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
        )}

        {/* Subtask count */}
        {hasSubtasks && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {subtasks.filter((s) => s.status === 'done').length}/{subtasks.length}
          </span>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="hidden sm:flex gap-1">
            {task.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs"
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

        {/* Due date */}
        {dueDateInfo && (
          <span className="text-xs" style={{ color: dueDateInfo.color }}>
            {dueDateInfo.text}
          </span>
        )}

        {/* Add subtask button (on hover, for parent tasks with subtasks) */}
        {!isSubtask && hasSubtasks && (
          <button
            onClick={handleAddSubtaskClick}
            className="opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
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
          className="opacity-0 group-hover:opacity-100 transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
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
            <div className="ml-7 px-4 py-2">
              <input
                autoFocus
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                onBlur={() => {
                  if (!subtaskTitle.trim()) setAddingSubtask(false);
                }}
                placeholder="Add subtask… (Enter to save, Esc to cancel)"
                className="input-base w-full text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
