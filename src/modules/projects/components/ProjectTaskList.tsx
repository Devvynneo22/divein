import { useState, useRef } from 'react';
import { Plus, CheckSquare, Circle, Clock, Flag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/shared/lib/taskService';
import type { Task, TaskStatus } from '@/shared/types/task';

interface ProjectTaskListProps {
  projectId: string;
  tasks: Task[];
}

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_COLORS: Record<number, string> = {
  0: 'var(--color-text-muted)',
  1: 'var(--color-p4)',
  2: 'var(--color-p3)',
  3: 'var(--color-p2)',
  4: 'var(--color-p1)',
};

export function ProjectTaskList({ projectId, tasks }: ProjectTaskListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const createTask = useMutation({
    mutationFn: () =>
      taskService.create({
        title: quickAddTitle.trim(),
        projectId,
        status: 'todo',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setQuickAddTitle('');
      inputRef.current?.focus();
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      taskService.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const filtered = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'todo') return t.status === 'todo' || t.status === 'inbox';
    return t.status === statusFilter;
  });

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;
    createTask.mutate();
  }

  function toggleStatus(task: Task) {
    const next: TaskStatus =
      task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    updateTask.mutate({ id: task.id, status: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={quickAddTitle}
          onChange={(e) => setQuickAddTitle(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        <button
          type="submit"
          disabled={!quickAddTitle.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Add
        </button>
      </form>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === tab.key
                ? 'text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-xs opacity-60">
                ({tasks.filter((t) =>
                  tab.key === 'todo'
                    ? t.status === 'todo' || t.status === 'inbox'
                    : t.status === tab.key,
                ).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <CheckSquare size={32} className="text-[var(--color-text-muted)] opacity-40" />
          <p className="text-sm text-[var(--color-text-muted)]">
            {statusFilter === 'all'
              ? 'No tasks in this project yet'
              : `No ${statusFilter.replace('_', ' ')} tasks`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((task) => (
            <ProjectTaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleStatus(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectTaskItemProps {
  task: Task;
  onToggle: () => void;
}

function ProjectTaskItem({ task, onToggle }: ProjectTaskItemProps) {
  const isDone = task.status === 'done';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors group">
      {/* Status toggle */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        title="Toggle status"
      >
        {isDone ? (
          <CheckSquare size={16} className="text-[var(--color-success)]" />
        ) : task.status === 'in_progress' ? (
          <Clock size={16} className="text-[var(--color-warning)]" />
        ) : (
          <Circle size={16} />
        )}
      </button>

      {/* Priority flag */}
      {task.priority > 0 && (
        <Flag
          size={12}
          className="flex-shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority] }}
        />
      )}

      {/* Title */}
      <span
        className={`flex-1 min-w-0 text-sm truncate ${
          isDone
            ? 'line-through text-[var(--color-text-muted)]'
            : 'text-[var(--color-text-primary)]'
        }`}
      >
        {task.title}
      </span>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="hidden group-hover:flex items-center gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {format(parseISO(task.dueDate), 'MMM d')}
        </span>
      )}
    </div>
  );
}
