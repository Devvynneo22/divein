import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Project, ProjectStatus, CreateProjectInput, UpdateProjectInput } from '@/shared/types/project';

interface ProjectFormProps {
  project?: Project;
  onSave: (data: CreateProjectInput | UpdateProjectInput) => void;
  onCancel: () => void;
}

// 12 gradient presets (stored as the CSS gradient string used as `background`)
export const GRADIENT_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'indigo',   label: 'Indigo',    value: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { id: 'sky',      label: 'Sky',       value: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  { id: 'teal',     label: 'Teal',      value: 'linear-gradient(135deg, #14b8a6, #2dd4bf)' },
  { id: 'green',    label: 'Green',     value: 'linear-gradient(135deg, #22c55e, #4ade80)' },
  { id: 'lime',     label: 'Lime',      value: 'linear-gradient(135deg, #84cc16, #a3e635)' },
  { id: 'amber',    label: 'Amber',     value: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { id: 'orange',   label: 'Orange',    value: 'linear-gradient(135deg, #f97316, #fb923c)' },
  { id: 'rose',     label: 'Rose',      value: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { id: 'pink',     label: 'Pink',      value: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  { id: 'purple',   label: 'Purple',    value: 'linear-gradient(135deg, #a855f7, #c084fc)' },
  { id: 'slate',    label: 'Slate',     value: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  { id: 'neutral',  label: 'Dark',      value: 'linear-gradient(135deg, #374151, #6b7280)' },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const defaultColor = project?.color ?? GRADIENT_PRESETS[0].value;

  const [name, setName]               = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor]             = useState(defaultColor);
  const [icon, setIcon]               = useState(project?.icon ?? '');
  const [status, setStatus]           = useState<ProjectStatus>(
    project?.status === 'archived' ? 'active' : (project?.status ?? 'active'),
  );
  const [nameError, setNameError]     = useState('');

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
      status,
    };
    onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
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

      {/* Color strip preview */}
      <div
        className="h-2 w-full rounded-full"
        style={{ background: color }}
      />

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          autoFocus
          className="input-base px-3 py-2.5 rounded-xl text-sm"
        />
        {nameError && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{nameError}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className="input-base px-3 py-2.5 rounded-xl text-sm resize-none"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Status
        </label>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: status === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: status === opt.value ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${status === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color / Gradient picker */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Color
        </label>
        <div className="grid grid-cols-6 gap-2">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setColor(preset.value)}
              title={preset.label}
              className="relative w-8 h-8 rounded-lg transition-all duration-150 focus:outline-none"
              style={{
                background: preset.value,
                boxShadow: color === preset.value
                  ? '0 0 0 2px var(--color-bg-primary), 0 0 0 4px var(--color-accent)'
                  : 'none',
                transform: color === preset.value ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {color === preset.value && (
                <Check
                  size={12}
                  className="absolute inset-0 m-auto"
                  style={{ color: '#fff' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Icon (emoji)
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => {
            const chars = [...e.target.value];
            setIcon(chars[0] ?? '');
          }}
          placeholder="📁"
          maxLength={4}
          className="input-base px-3 py-2.5 rounded-xl text-lg text-center w-20"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          {project ? 'Save Changes' : 'Create Project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm transition-colors"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
