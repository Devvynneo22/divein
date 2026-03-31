import { useState, useEffect } from 'react';
import { X, Check, Wand2 } from 'lucide-react';
import type { Project, ProjectStatus, CreateProjectInput, UpdateProjectInput } from '@/shared/types/project';

// ─── Gradient presets ─────────────────────────────────────────────────────────

export const GRADIENT_PRESETS: { id: string; label: string; value: string }[] = [
  { id: 'indigo',   label: 'Indigo',   value: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  { id: 'sky',      label: 'Sky',      value: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  { id: 'teal',     label: 'Teal',     value: 'linear-gradient(135deg, #14b8a6, #2dd4bf)' },
  { id: 'green',    label: 'Green',    value: 'linear-gradient(135deg, #22c55e, #4ade80)' },
  { id: 'lime',     label: 'Lime',     value: 'linear-gradient(135deg, #84cc16, #a3e635)' },
  { id: 'amber',    label: 'Amber',    value: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { id: 'orange',   label: 'Orange',   value: 'linear-gradient(135deg, #f97316, #fb923c)' },
  { id: 'rose',     label: 'Rose',     value: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { id: 'pink',     label: 'Pink',     value: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  { id: 'purple',   label: 'Purple',   value: 'linear-gradient(135deg, #a855f7, #c084fc)' },
  { id: 'slate',    label: 'Slate',    value: 'linear-gradient(135deg, #64748b, #94a3b8)' },
  { id: 'neutral',  label: 'Dark',     value: 'linear-gradient(135deg, #374151, #6b7280)' },
];

// ─── Templates ────────────────────────────────────────────────────────────────

export interface ProjectTemplate {
  id: string;
  label: string;
  emoji: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: ProjectStatus;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software-sprint',
    label: 'Software Sprint',
    emoji: '🚀',
    name: 'Software Sprint',
    description: 'Track tasks, bugs, and milestones for a development sprint.',
    icon: '🚀',
    color: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    status: 'active',
  },
  {
    id: 'marketing-campaign',
    label: 'Marketing Campaign',
    emoji: '📣',
    name: 'Marketing Campaign',
    description: 'Plan and execute marketing initiatives, content, and campaigns.',
    icon: '📣',
    color: 'linear-gradient(135deg, #f97316, #fb923c)',
    status: 'active',
  },
  {
    id: 'research-project',
    label: 'Research Project',
    emoji: '🔬',
    name: 'Research Project',
    description: 'Organize research tasks, notes, and findings in one place.',
    icon: '🔬',
    color: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    status: 'active',
  },
  {
    id: 'event-planning',
    label: 'Event Planning',
    emoji: '🎉',
    name: 'Event Planning',
    description: 'Coordinate event logistics, tasks, and timelines.',
    icon: '🎉',
    color: 'linear-gradient(135deg, #ec4899, #f472b6)',
    status: 'active',
  },
  {
    id: 'personal-goals',
    label: 'Personal Goals',
    emoji: '🎯',
    name: 'Personal Goals',
    description: 'Track personal milestones and self-improvement goals.',
    icon: '🎯',
    color: 'linear-gradient(135deg, #22c55e, #4ade80)',
    status: 'active',
  },
];

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',   label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectFormProps {
  project?: Project;
  template?: ProjectTemplate;
  onSave: (data: CreateProjectInput | UpdateProjectInput) => void;
  onCancel: () => void;
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ProjectForm({ project, template, onSave, onCancel }: ProjectFormProps) {
  const defaultColor = template?.color ?? project?.color ?? GRADIENT_PRESETS[0].value;
  const defaultIcon  = template?.icon  ?? project?.icon  ?? '';
  const defaultName  = template?.name  ?? project?.name  ?? '';
  const defaultDesc  = template?.description ?? project?.description ?? '';

  const [name, setName]               = useState(defaultName);
  const [description, setDescription] = useState(defaultDesc);
  const [color, setColor]             = useState(defaultColor);
  const [icon, setIcon]               = useState(defaultIcon);
  const [status, setStatus]           = useState<ProjectStatus>(
    project?.status === 'archived' ? 'active' : (template?.status ?? project?.status ?? 'active'),
  );
  const [nameError, setNameError] = useState('');

  // If template changes (e.g., user picks different template), re-populate
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setColor(template.color);
      setIcon(template.icon);
      setStatus(template.status);
    }
  }, [template?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {project ? 'Edit Project' : template ? `From Template: ${template.label}` : 'New Project'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg transition-all duration-150"
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
          <X size={18} />
        </button>
      </div>

      {/* ── Banner preview ── */}
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{ height: '72px', background: color }}
      >
        {icon && (
          <div
            className="absolute bottom-0 left-4 translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-md"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '2px solid var(--color-bg-primary)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* ── Name ── */}
      <div className="flex flex-col gap-1.5" style={{ marginTop: icon ? '4px' : '0' }}>
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
          placeholder="Project name"
          autoFocus
          className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: `1px solid ${nameError ? 'var(--color-danger)' : 'var(--color-border)'}`,
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = nameError
              ? 'var(--color-danger)'
              : 'var(--color-accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = nameError
              ? 'var(--color-danger)'
              : 'var(--color-border)';
          }}
        />
        {nameError && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {nameError}
          </p>
        )}
      </div>

      {/* ── Description ── */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
      </div>

      {/* ── Status ── */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
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
                backgroundColor:
                  status === opt.value ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: status === opt.value ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${status === opt.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Color picker ── */}
      <div className="flex flex-col gap-2">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
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
                boxShadow:
                  color === preset.value
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

      {/* ── Icon picker ── */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
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
          className="px-3 py-2.5 rounded-xl text-lg text-center focus:outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            width: '72px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.transform = 'none';
          }}
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

// ─── Template picker modal content ───────────────────────────────────────────

interface TemplatePickerProps {
  onSelect: (template: ProjectTemplate) => void;
  onCancel: () => void;
}

export function TemplatePicker({ onSelect, onCancel }: TemplatePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Choose a Template
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Start with a pre-filled project structure
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg transition-all duration-150"
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
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {PROJECT_TEMPLATES.map((tmpl) => (
          <TemplateRow key={tmpl.id} template={tmpl} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  onSelect,
}: {
  template: ProjectTemplate;
  onSelect: (t: ProjectTemplate) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left"
      style={{
        backgroundColor: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        transform: hovered ? 'translateX(3px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color swatch */}
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
        style={{ background: template.color }}
      >
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {template.label}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {template.description}
        </p>
      </div>
      <Wand2
        size={14}
        style={{
          color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
          transition: 'color 0.2s ease',
        }}
      />
    </button>
  );
}
