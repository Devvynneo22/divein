import { useState, useEffect } from 'react';
import { X, Flag, Calendar, Tag, AlignLeft } from 'lucide-react';
import type { Task, UpdateTaskInput, TaskPriority, TaskStatus } from '@/shared/types/task';

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
