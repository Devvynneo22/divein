import { useState } from 'react';
import { X } from 'lucide-react';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/shared/types/project';

interface ProjectFormProps {
  project?: Project;
  onSave: (data: CreateProjectInput | UpdateProjectInput) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(project?.icon ?? '');
  const [nameError, setNameError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required');
      return;
    }
    setNameError('');
    const data: CreateProjectInput | UpdateProjectInput = {
      name: trimmed,
      description: description.trim() || undefined,
      color: color || undefined,
      icon: icon.trim() || undefined,
    };
    onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Form header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {project ? 'Edit Project' : 'New Project'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        {nameError && (
          <p className="text-xs text-[var(--color-danger)]">{nameError}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
        />
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: color === c ? 'white' : 'transparent',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
          Icon (emoji)
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => {
            // Only take the first character (emoji or char)
            const val = e.target.value;
            const chars = [...val]; // spread handles multi-byte emoji
            setIcon(chars[0] ?? '');
          }}
          placeholder="📁"
          maxLength={4}
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors w-20 text-center text-lg"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
        >
          {project ? 'Save Changes' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
