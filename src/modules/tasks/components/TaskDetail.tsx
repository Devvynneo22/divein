import { useState, useEffect } from 'react';
import { X, Flag, Calendar, Tag, AlignLeft, CheckCircle2, Circle, ListTodo, Repeat } from 'lucide-react';
import type { Task, UpdateTaskInput, TaskPriority, TaskStatus } from '@/shared/types/task';
import type { RecurrenceRule, RecurrenceFrequency } from '@/shared/types/recurrence';
import { FREQUENCY_OPTIONS } from '@/shared/types/recurrence';
import { describeRecurrence } from '@/shared/lib/recurrenceUtils';
import { useSubtasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';

interface TaskDetailProps {
  task: Task;
  onUpdate: (data: UpdateTaskInput) => void;
  onClose: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 0, label: 'None', color: 'var(--color-text-muted)' },
  { value: 1, label: 'Low', color: 'var(--color-p4)' },
  { value: 2, label: 'Medium', color: 'var(--color-p3)' },
  { value: 3, label: 'High', color: 'var(--color-p2)' },
  { value: 4, label: 'Urgent', color: 'var(--color-p1)' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function TaskDetail({ task, onUpdate, onClose }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  // Parse recurrence from JSON string
  const parsedRecurrence: RecurrenceRule | null = (() => {
    if (!task.recurrence) return null;
    try { return JSON.parse(task.recurrence) as RecurrenceRule; } catch { return null; }
  })();

  const { data: subtasks = [] } = useSubtasks(task.parentId === null ? task.id : null);
  const createTask = useCreateTask();
  const updateSubtask = useUpdateTask();
  const deleteSubtask = useDeleteTask();

  const isRootTask = task.parentId === null;
  const doneCount = subtasks.filter((s) => s.status === 'done').length;

  // Sync state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
  }, [task.id, task.title, task.description]);

  function handleTitleBlur() {
    if (title.trim() && title !== task.title) {
      onUpdate({ title: title.trim() });
    }
  }

  function handleDescriptionBlur() {
    const val = description.trim() || null;
    if (val !== task.description) {
      onUpdate({ description: val });
    }
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase();
      if (!task.tags.includes(newTag)) {
        onUpdate({ tags: [...task.tags, newTag] });
      }
      setTagInput('');
    }
  }

  function handleRemoveTag(tag: string) {
    onUpdate({ tags: task.tags.filter((t) => t !== tag) });
  }

  function handleSubtaskToggle(subtask: Task) {
    const newStatus: TaskStatus = subtask.status === 'done' ? 'todo' : 'done';
    updateSubtask.mutate({ id: subtask.id, data: { status: newStatus } });
  }

  function handleAddSubtask(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && subtaskInput.trim()) {
      createTask.mutate({ title: subtaskInput.trim(), parentId: task.id });
      setSubtaskInput('');
    }
  }

  function handleDeleteSubtask(id: string) {
    deleteSubtask.mutate(id);
  }

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--color-border)]">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Details</span>
        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none text-[var(--color-text-primary)]"
        />

        {/* Status */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            Status
          </label>
          <select
            value={task.status}
            onChange={(e) => onUpdate({ status: e.target.value as TaskStatus })}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            <Flag size={12} /> Priority
          </label>
          <div className="flex gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => onUpdate({ priority: p.value })}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  task.priority === p.value
                    ? 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
                style={task.priority === p.value ? { color: p.color } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            <Calendar size={12} /> Due Date
          </label>
          <input
            type="date"
            value={task.dueDate?.split('T')[0] ?? ''}
            onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
          />
        </div>

        {/* Recurrence */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            <Repeat size={12} /> Recurrence
          </label>
          {parsedRecurrence ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                <Repeat size={12} className="text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--color-text-primary)]">
                  {describeRecurrence(parsedRecurrence)}
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  value={parsedRecurrence.frequency}
                  onChange={(e) => {
                    const updated: RecurrenceRule = { ...parsedRecurrence, frequency: e.target.value as RecurrenceFrequency };
                    onUpdate({ recurrence: JSON.stringify(updated) });
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={parsedRecurrence.interval}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (n > 0) {
                      const updated: RecurrenceRule = { ...parsedRecurrence, interval: n };
                      onUpdate({ recurrence: JSON.stringify(updated) });
                    }
                  }}
                  className="w-16 px-2 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
                />
              </div>
              <button
                onClick={() => onUpdate({ recurrence: null })}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
              >
                Remove recurrence
              </button>
            </div>
          ) : (
            <button
              onClick={() => onUpdate({ recurrence: JSON.stringify({ frequency: 'weekly', interval: 1 } as RecurrenceRule) })}
              className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)] transition-colors text-left"
            >
              + Add recurrence
            </button>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            <Tag size={12} /> Tags
          </label>
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag..."
            className="w-full px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
            <AlignLeft size={12} /> Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Add a description..."
            rows={4}
            className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none resize-none"
          />
        </div>

        {/* Subtasks section (only for root tasks) */}
        {isRootTask && (
          <div>
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1.5">
              <ListTodo size={12} /> Subtasks
              {subtasks.length > 0 && (
                <span className="ml-auto text-[10px]">
                  {doneCount}/{subtasks.length} complete
                </span>
              )}
            </label>

            {/* Subtask list */}
            <div className="space-y-1 mb-2">
              {subtasks.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 px-2 py-1 rounded group hover:bg-[var(--color-bg-tertiary)]"
                >
                  <button
                    onClick={() => handleSubtaskToggle(sub)}
                    className={`flex-shrink-0 ${
                      sub.status === 'done'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
                    } transition-colors`}
                  >
                    {sub.status === 'done' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                  </button>
                  <span
                    className={`flex-1 text-xs truncate ${
                      sub.status === 'done'
                        ? 'line-through text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {sub.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <input
              type="text"
              value={subtaskInput}
              onChange={(e) => setSubtaskInput(e.target.value)}
              onKeyDown={handleAddSubtask}
              placeholder="Add subtask..."
              className="w-full px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="text-[10px] text-[var(--color-text-muted)] space-y-0.5 pt-2 border-t border-[var(--color-border)]">
          <div>Created: {new Date(task.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(task.updatedAt).toLocaleString()}</div>
          {task.completedAt && <div>Completed: {new Date(task.completedAt).toLocaleString()}</div>}
        </div>
      </div>
    </div>
  );
}
