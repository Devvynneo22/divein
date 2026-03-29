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
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {project ? 'Edit Project' : 'New Project'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
          className="input-base px-3 py-2 rounded-lg text-sm"
        />
        {nameError && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{nameError}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className="input-base px-3 py-2 rounded-lg text-sm resize-none"
        />
      </div>

      {/* Color picker */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
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
                borderColor: color === c ? 'var(--color-text-primary)' : 'transparent',
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
              }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
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
          className="input-base px-3 py-2 rounded-lg text-sm w-20 text-center text-lg"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-text-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
          }}
        >
          {project ? 'Save Changes' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm transition-colors"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
