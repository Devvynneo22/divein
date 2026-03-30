import { useState, useRef } from 'react';
import { Plus, CheckSquare, Circle, Clock, Flag, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/shared/lib/taskService';
import type { Task, TaskStatus } from '@/shared/types/task';

interface ProjectTaskListProps {
  projectId: string;
  tasks: Task[];
}

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'done';

const STATUS_FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'todo',        label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
];

const PRIORITY_COLORS: Record<number, string> = {
  0: 'transparent',
  1: 'var(--color-p4, #60a5fa)',
  2: 'var(--color-p3, #facc15)',
  3: 'var(--color-p2, #fb923c)',
  4: 'var(--color-p1, #f87171)',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: '',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  inbox:       { bg: 'var(--color-bg-tertiary)',  text: 'var(--color-text-muted)',  label: 'Inbox' },
  backlog:     { bg: 'var(--color-bg-tertiary)',  text: 'var(--color-text-muted)',  label: 'Backlog' },
  todo:        { bg: 'rgba(100,116,139,0.15)',    text: '#94a3b8',                  label: 'To Do' },
  in_progress: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)',     label: 'In Progress' },
  in_review:   { bg: 'rgba(168,85,247,0.12)',     text: '#a855f7',                  label: 'In Review' },
  done:        { bg: 'var(--color-success-soft)', text: 'var(--color-success)',     label: 'Done' },
  cancelled:   { bg: 'var(--color-danger-soft)',  text: 'var(--color-danger)',      label: 'Cancelled' },
};

export function ProjectTaskList({ projectId, tasks }: ProjectTaskListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const createTask = useMutation({
    mutationFn: () =>
      taskService.create({ title: quickAddTitle.trim(), projectId, status: 'todo' }),
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
    if (statusFilter === 'todo') return t.status === 'todo' || t.status === 'inbox' || t.status === 'backlog';
    return t.status === statusFilter;
  });

  function countForFilter(key: StatusFilter): number {
    if (key === 'all') return tasks.length;
    if (key === 'todo') return tasks.filter((t) => t.status === 'todo' || t.status === 'inbox' || t.status === 'backlog').length;
    return tasks.filter((t) => t.status === key).length;
  }

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;
    createTask.mutate();
  }

  function cycleStatus(task: Task) {
    const next: TaskStatus =
      task.status === 'done'
        ? 'todo'
        : task.status === 'in_progress'
        ? 'done'
        : 'in_progress';
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
          className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
        <button
          type="submit"
          disabled={!quickAddTitle.trim()}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          <Plus size={16} />
          Add
        </button>
      </form>

      {/* Status filter tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
        {STATUS_FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className="px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5"
            style={{
              color: statusFilter === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderBottomColor: statusFilter === tab.key ? 'var(--color-accent)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (statusFilter !== tab.key) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            onMouseLeave={(e) => { if (statusFilter !== tab.key) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            {tab.label}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                backgroundColor: statusFilter === tab.key ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: statusFilter === tab.key ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {countForFilter(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <CheckSquare size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {statusFilter === 'all' ? 'No tasks yet' : `No ${statusFilter.replace('_', ' ')} tasks`}
          </p>
          {statusFilter === 'all' && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
              Use the field above to add your first task
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((task) => (
            <TaskRow key={task.id} task={task} onCycleStatus={() => cycleStatus(task)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onCycleStatus }: { task: Task; onCycleStatus: () => void }) {
  const isDone = task.status === 'done';
  const [hovered, setHovered] = useState(false);
  const pill = STATUS_PILL[task.status] ?? STATUS_PILL.inbox;

  const isOverdue =
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    !isDone &&
    task.status !== 'cancelled';

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-all duration-150"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Status icon / toggle */}
      <button
        onClick={onCycleStatus}
        className="flex-shrink-0 transition-colors"
        title="Cycle status"
        style={{ color: isDone ? 'var(--color-success)' : task.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
        onMouseEnter={(e) => { if (!isDone) e.currentTarget.style.color = 'var(--color-accent)'; }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = isDone ? 'var(--color-success)' : task.status === 'in_progress' ? 'var(--color-warning)' : 'var(--color-text-muted)';
        }}
      >
        {isDone ? (
          <CheckSquare size={16} />
        ) : task.status === 'in_progress' ? (
          <Clock size={16} />
        ) : (
          <Circle size={16} />
        )}
      </button>

      {/* Priority indicator */}
      {task.priority > 0 && (
        <span title={PRIORITY_LABELS[task.priority]}>
          <Flag
            size={12}
            className="flex-shrink-0"
            style={{ color: PRIORITY_COLORS[task.priority] }}
          />
        </span>
      )}

      {/* Title */}
      <span
        className="flex-1 min-w-0 text-sm truncate"
        style={{
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        }}
      >
        {task.title}
      </span>

      {/* Status pill */}
      <span
        className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
        style={{ backgroundColor: pill.bg, color: pill.text }}
      >
        {pill.label}
      </span>

      {/* Due date */}
      {task.dueDate && (
        <div
          className="flex items-center gap-1 flex-shrink-0"
          style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
        >
          {isOverdue && <AlertCircle size={11} />}
          <span className="text-[11px]">
            {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        </div>
      )}

      {/* Tags (on hover) */}
      {task.tags.length > 0 && hovered && (
        <div className="flex items-center gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
