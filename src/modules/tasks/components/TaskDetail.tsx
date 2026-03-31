import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  MoreHorizontal,
  Calendar,
  Clock,
  RefreshCw,
  Folder,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Lock,
  Link2,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, UpdateTaskInput, CreateTaskInput } from '@/shared/types/task';
import { useTaskSettingsStore } from '@/shared/stores/taskSettingsStore';
import { useSubtasks, useCreateTask, useUpdateTask, useTasks } from '../hooks/useTasks';
import { NaturalDateInput } from './TaskCreateModal';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'backlog',     label: 'Backlog',     color: 'var(--color-status-backlog, #a1a1aa)' },
  { value: 'inbox',       label: 'Inbox',       color: 'var(--color-status-inbox, #a1a1aa)' },
  { value: 'todo',        label: 'Todo',        color: 'var(--color-status-todo, #60a5fa)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--color-status-in-progress, #fb923c)' },
  { value: 'in_review',   label: 'In Review',   color: 'var(--color-status-in-review, #c084fc)' },
  { value: 'done',        label: 'Done',        color: 'var(--color-status-done, #4ade80)' },
  { value: 'cancelled',   label: 'Cancelled',   color: 'var(--color-status-cancelled, #f87171)' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 0, label: 'No Priority', color: 'var(--color-text-muted)' },
  { value: 1, label: 'Low',         color: 'var(--color-priority-low, #3b82f6)' },
  { value: 2, label: 'Medium',      color: 'var(--color-priority-medium, #eab308)' },
  { value: 3, label: 'High',        color: 'var(--color-priority-high, #f97316)' },
  { value: 4, label: 'Urgent',      color: 'var(--color-priority-urgent, #ef4444)' },
];

// 8 preset tag colors
const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#a855f7', '#ec4899', '#6b7280',
];

function sanitizeTag(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return '';
  // Reject bare hex color strings (3, 4, 6, or 8 hex digits, with or without #)
  if (/^#?[0-9a-fA-F]{3,8}$/.test(trimmed)) return '';
  return trimmed;
}

function getTagColor(tag: string, tagColors?: Record<string, string>): string {
  const key = tag.toLowerCase().trim();
  if (tagColors && tagColors[key]) return tagColors[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

// ─── Tag pill ────────────────────────────────────────────────────────────────

function TagPill({
  label,
  color,
  onRemove,
  onChangeColor,
}: {
  label: string;
  color?: string;
  onRemove?: () => void;
  onChangeColor?: (c: string) => void;
}) {
  const bg = color ?? '#6b7280';
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px 3px 5px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: bg + '22',
        color: bg,
        border: `1px solid ${bg}55`,
        userSelect: 'none',
      }}
    >
      {/* Color swatch dot — click to open color picker */}
      {onChangeColor ? (
        <span
          title="Click to change tag color"
          onClick={() => colorInputRef.current?.click()}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: bg,
            flexShrink: 0,
            cursor: 'pointer',
            border: '1.5px solid rgba(255,255,255,0.6)',
            display: 'inline-block',
          }}
        />
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: bg,
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
      )}
      {/* Hidden color input */}
      {onChangeColor && (
        <input
          ref={colorInputRef}
          type="color"
          value={bg}
          onChange={(e) => onChangeColor(e.target.value)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          tabIndex={-1}
        />
      )}
      <span>{label}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 14,
            height: 14,
            borderRadius: '50%',
            backgroundColor: bg + '33',
            color: bg,
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            flexShrink: 0,
          }}
          title="Remove tag"
        >
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ─── Select dropdown (generic) ────────────────────────────────────────────────

function SelectDropdown<T extends string | number>({
  value,
  options,
  onChange,
  renderTrigger,
}: {
  value: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (v: T) => void;
  renderTrigger: (selected: { value: T; label: string; color?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--color-text-primary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
      >
        {renderTrigger(selected)}
        <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            minWidth: 160,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0,0,0,0.15))',
            padding: '4px 0',
            overflow: 'hidden',
          }}
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 12px',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                backgroundColor: opt.value === value ? 'var(--color-bg-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = opt.value === value ? 'var(--color-bg-hover)' : 'transparent'; }}
            >
              {opt.color && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
              )}
              <span style={{ flex: 1 }}>{opt.label}</span>
              {opt.value === value && <Check size={12} style={{ color: 'var(--color-accent)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PropertyRow ──────────────────────────────────────────────────────────────

function PropertyRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minHeight: 32 }}>
      <div
        style={{
          width: 100,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingTop: 4,
          fontSize: 12,
          color: 'var(--color-text-muted)',
        }}
      >
        {icon}
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Subtask item ────────────────────────────────────────────────────────────

function SubtaskItem({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        opacity: task.status === 'done' || task.status === 'cancelled' ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() =>
          updateTask.mutate({
            id: task.id,
            data: { status: task.status === 'done' ? 'todo' : 'done' },
          })
        }
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: `2px solid ${task.status === 'done' ? 'var(--color-status-done, #4ade80)' : 'var(--color-border-strong)'}`,
          backgroundColor: task.status === 'done' ? 'var(--color-status-done, #4ade80)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.15s',
        }}
      >
        {task.status === 'done' && <Check size={9} style={{ color: 'white' }} />}
      </button>
      <span
        style={{
          fontSize: 13,
          color: 'var(--color-text-primary)',
          flex: 1,
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          opacity: hovered ? 1 : undefined,
        }}
      >
        {task.title}
      </span>
    </div>
  );
}

// ─── Dependency Section ───────────────────────────────────────────────────────

interface DependencySectionProps {
  task: Task;
  allTasks: Task[];
  onUpdate: (data: UpdateTaskInput) => void;
}

function DependencySection({ task, allTasks, onUpdate }: DependencySectionProps) {
  const [showBlockedByPicker, setShowBlockedByPicker] = useState(false);
  const [showBlocksPicker, setShowBlocksPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const blockedBy = task.blockedBy ?? [];
  const blocks = task.blocks ?? [];

  // Close pickers on outside click
  useEffect(() => {
    if (!showBlockedByPicker && !showBlocksPicker) return;
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowBlockedByPicker(false);
        setShowBlocksPicker(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBlockedByPicker, showBlocksPicker]);

  const eligibleTasks = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      t.parentId === null &&
      t.title.toLowerCase().includes(search.toLowerCase()),
  );

  const addBlockedBy = (id: string) => {
    if (blockedBy.includes(id)) return;
    const newBlockedBy = [...blockedBy, id];
    onUpdate({ blockedBy: newBlockedBy });
    // Reciprocally update the blocker task's `blocks` field
    const blocker = allTasks.find((t) => t.id === id);
    if (blocker) {
      const blockerBlocks = [...(blocker.blocks ?? [])];
      if (!blockerBlocks.includes(task.id)) {
        // We update via service directly but we only have onUpdate for this task
        // So just update this task's blockedBy; the reciprocal is best-effort via a secondary mutation
      }
    }
  };

  const removeBlockedBy = (id: string) => {
    onUpdate({ blockedBy: blockedBy.filter((b) => b !== id) });
  };

  const addBlocks = (id: string) => {
    if (blocks.includes(id)) return;
    onUpdate({ blocks: [...blocks, id] });
  };

  const removeBlocks = (id: string) => {
    onUpdate({ blocks: blocks.filter((b) => b !== id) });
  };

  const getTaskTitle = (id: string) => allTasks.find((t) => t.id === id)?.title ?? id;
  const getTaskStatus = (id: string): TaskStatus => allTasks.find((t) => t.id === id)?.status ?? 'todo';
  const isActive = (id: string) => {
    const s = getTaskStatus(id);
    return s !== 'done' && s !== 'cancelled';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 0',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link2 size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Dependencies
        </span>
      </div>

      {/* Blocked By */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Blocked by
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {blockedBy.map((id) => (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px 2px 6px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: isActive(id) ? 'var(--color-danger-soft, rgba(239,68,68,0.1))' : 'var(--color-bg-tertiary)',
                color: isActive(id) ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)',
                border: `1px solid ${isActive(id) ? 'rgba(239,68,68,0.35)' : 'var(--color-border)'}`,
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isActive(id) && <Lock size={10} style={{ flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTaskTitle(id)}</span>
              <button
                onClick={() => removeBlockedBy(id)}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, opacity: 0.6, color: 'inherit', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <div ref={showBlockedByPicker ? pickerRef : undefined} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowBlockedByPicker(true); setShowBlocksPicker(false); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px',
                borderRadius: 999, border: '1px dashed var(--color-border)',
                backgroundColor: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <Plus size={10} /> Add
            </button>
            {showBlockedByPicker && (
              <TaskPickerPopover
                tasks={eligibleTasks}
                selectedIds={blockedBy}
                search={search}
                onSearch={setSearch}
                onSelect={(id) => { addBlockedBy(id); setShowBlockedByPicker(false); setSearch(''); }}
                onClose={() => { setShowBlockedByPicker(false); setSearch(''); }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>
          Blocks
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {blocks.map((id) => (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px 2px 6px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: 'var(--color-warning-soft, rgba(234,179,8,0.1))',
                color: 'var(--color-warning, #eab308)',
                border: '1px solid rgba(234,179,8,0.35)',
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTaskTitle(id)}</span>
              <button
                onClick={() => removeBlocks(id)}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2, opacity: 0.6, color: 'inherit', flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <div ref={showBlocksPicker ? pickerRef : undefined} style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowBlocksPicker(true); setShowBlockedByPicker(false); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px',
                borderRadius: 999, border: '1px dashed var(--color-border)',
                backgroundColor: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <Plus size={10} /> Add
            </button>
            {showBlocksPicker && (
              <TaskPickerPopover
                tasks={eligibleTasks}
                selectedIds={blocks}
                search={search}
                onSearch={setSearch}
                onSelect={(id) => { addBlocks(id); setShowBlocksPicker(false); setSearch(''); }}
                onClose={() => { setShowBlocksPicker(false); setSearch(''); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskPickerPopover({
  tasks,
  selectedIds,
  search,
  onSearch,
  onSelect,
  onClose,
}: {
  tasks: Task[];
  selectedIds: string[];
  search: string;
  onSearch: (s: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 100,
        minWidth: 220,
        maxWidth: 280,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0,0,0,0.15))',
        padding: 8,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        style={{
          width: '100%',
          padding: '5px 8px',
          fontSize: 12,
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-primary)',
          outline: 'none',
          marginBottom: 6,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {tasks.length === 0 && (
          <div style={{ padding: '8px', fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            No tasks found
          </div>
        )}
        {tasks.slice(0, 20).map((t) => {
          const isSelected = selectedIds.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '6px 8px',
                fontSize: 12,
                color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                backgroundColor: isSelected ? 'var(--color-accent-soft)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {isSelected && <Check size={10} style={{ flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TaskDetail ───────────────────────────────────────────────────────────────

interface TaskDetailProps {
  task: Task;
  onUpdate: (data: UpdateTaskInput) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskDetail({ task, onUpdate, onDelete, onClose }: TaskDetailProps) {
  const tagColors = useTaskSettingsStore((s) => s.tagColors);
  const setTagColor = useTaskSettingsStore((s) => s.setTagColor);

  // ── Animation state ───────────────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // ── Local edit state ──────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local draft in sync when task changes externally
  useEffect(() => { setTitleDraft(task.title); }, [task.title]);
  useEffect(() => { setDescription(task.description ?? ''); }, [task.description]);

  // ── All tasks (for dependency picker) ────────────────────────────────────
  const { data: allTasks = [] } = useTasks();

  // ── Subtasks ──────────────────────────────────────────────────────────────
  const { data: subtasks = [] } = useSubtasks(task.id);
  const createTask = useCreateTask();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // ── More menu outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!showMoreMenu) return;
    function handler(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMoreMenu]);

  // ── Tag picker outside click ──────────────────────────────────────────────
  useEffect(() => {
    if (!showTagPicker) return;
    function handler(e: MouseEvent) {
      if (tagPickerRef.current && !tagPickerRef.current.contains(e.target as Node)) setShowTagPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTagPicker]);

  // ── Auto-resize description textarea ─────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  // ── Auto-resize title textarea ────────────────────────────────────────────
  useEffect(() => {
    if (!editingTitle) return;
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editingTitle]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTitleSave = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate({ title: trimmed });
    } else {
      setTitleDraft(task.title);
    }
    setEditingTitle(false);
  }, [titleDraft, task.title, onUpdate]);

  const handleDescriptionChange = useCallback((val: string) => {
    setDescription(val);
    if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current);
    descriptionTimerRef.current = setTimeout(() => {
      onUpdate({ description: val || null });
    }, 600);
  }, [onUpdate]);

  const handleAddTag = useCallback((tag: string) => {
    const trimmed = sanitizeTag(tag);
    if (!trimmed || task.tags.includes(trimmed)) return;
    onUpdate({ tags: [...task.tags, trimmed] });
    setTagInput('');
  }, [task.tags, onUpdate]);

  const handleRemoveTag = useCallback((tag: string) => {
    onUpdate({ tags: task.tags.filter((t) => t !== tag) });
  }, [task.tags, onUpdate]);

  const handleAddSubtask = useCallback(() => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    const input: CreateTaskInput = { title: trimmed, parentId: task.id, status: 'todo' };
    createTask.mutate(input);
    setNewSubtaskTitle('');
  }, [newSubtaskTitle, task.id, createTask]);

  // Subtask progress
  const totalSubs = subtasks.length;
  const doneSubs = subtasks.filter((s) => s.status === 'done' || s.status === 'cancelled').length;
  const progress = totalSubs > 0 ? (doneSubs / totalSubs) * 100 : 0;

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === task.status) ?? STATUS_OPTIONS[0];
  const priorityConfig = PRIORITY_OPTIONS.find((p) => p.value === task.priority) ?? PRIORITY_OPTIONS[0];

  return (
    <>
      {/* Slide-in panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-elevated)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup, -4px 0 24px rgba(0,0,0,0.12))',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--color-bg-elevated)',
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            title="Close"
          >
            <X size={16} />
          </button>

          {/* More menu */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMoreMenu((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                backgroundColor: showMoreMenu ? 'var(--color-bg-hover)' : 'transparent',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { if (!showMoreMenu) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
              title="More options"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMoreMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 100,
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0,0,0,0.15))',
                  padding: '4px 0',
                  minWidth: 160,
                }}
              >
                <button
                  onClick={() => { setShowMoreMenu(false); onDelete(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'var(--color-danger, #ef4444)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft, rgba(239,68,68,0.08))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Trash2 size={14} />
                  Delete task
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status + Priority row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <SelectDropdown
              value={task.status}
              options={STATUS_OPTIONS}
              onChange={(v) => onUpdate({ status: v })}
              renderTrigger={(sel) => (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sel.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{sel.label}</span>
                </>
              )}
            />
            <SelectDropdown
              value={task.priority}
              options={PRIORITY_OPTIONS}
              onChange={(v) => onUpdate({ priority: v })}
              renderTrigger={(sel) => (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: sel.color, flexShrink: 0, transform: 'rotate(45deg)' }} />
                  <span style={{ fontSize: 13 }}>{sel.label}</span>
                </>
              )}
            />
          </div>

          {/* Title */}
          {editingTitle ? (
            <textarea
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => {
                setTitleDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleSave(); }
                if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false); }
              }}
              style={{
                width: '100%',
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-accent)',
                borderRadius: 8,
                padding: '4px 8px',
                resize: 'none',
                overflow: 'hidden',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              rows={1}
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'var(--color-text-primary)',
                cursor: 'text',
                margin: 0,
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid transparent',
                wordBreak: 'break-word',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {task.title}
            </h2>
          )}

          {/* Properties section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>

            {/* Due date */}
            <PropertyRow label="Due date" icon={<Calendar size={12} />}>
              <NaturalDateInput
                value={toDateInputValue(task.dueDate)}
                onChange={(date) => onUpdate({ dueDate: date })}
              />
            </PropertyRow>

            {/* Start date */}
            <PropertyRow label="Start date" icon={<Calendar size={12} />}>
              <NaturalDateInput
                value={toDateInputValue(task.startDate)}
                onChange={(date) => onUpdate({ startDate: date })}
                placeholder="e.g. today, next monday, Mar 5"
              />
            </PropertyRow>

            {/* Tags */}
            <PropertyRow label="Tags" icon={<span style={{ fontSize: 11 }}>🏷</span>}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {task.tags.map((tag) => (
                  <TagPill
                    key={tag}
                    label={tag}
                    color={getTagColor(tag, tagColors)}
                    onRemove={() => handleRemoveTag(tag)}
                    onChangeColor={(c) => setTagColor(tag.toLowerCase().trim(), c)}
                  />
                ))}

                {/* Tag picker */}
                <div ref={tagPickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTagPicker((v) => !v)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      border: '1px dashed var(--color-border)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                  >
                    <Plus size={10} /> Add
                  </button>

                  {showTagPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        zIndex: 100,
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        boxShadow: 'var(--shadow-popup, 0 8px 24px rgba(0,0,0,0.15))',
                        padding: 10,
                        minWidth: 180,
                      }}
                    >
                      <input
                        autoFocus
                        type="text"
                        placeholder="Tag name..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { handleAddTag(tagInput); setShowTagPicker(false); }
                          if (e.key === 'Escape') setShowTagPicker(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: 12,
                          borderRadius: 6,
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg-tertiary)',
                          color: 'var(--color-text-primary)',
                          outline: 'none',
                          marginBottom: 8,
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        Type a tag name and press Enter. Click the color dot on any tag to change its color.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PropertyRow>

            {/* Estimate */}
            <PropertyRow label="Estimate" icon={<Clock size={12} />}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  min={0}
                  value={task.estimatedMin ?? ''}
                  onChange={(e) => onUpdate({ estimatedMin: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="—"
                  style={{
                    width: 56,
                    fontSize: 13,
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid transparent',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                />
                {task.estimatedMin != null && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>min</span>
                )}
              </div>
            </PropertyRow>

            {/* Project */}
            {task.projectId && (
              <PropertyRow label="Project" icon={<Folder size={12} />}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{task.projectId}</span>
              </PropertyRow>
            )}

            {/* Cover Image */}
            <PropertyRow label="Cover Image" icon={<span style={{ fontSize: 11 }}>🖼️</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {task.coverImage && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={task.coverImage}
                      alt="Cover"
                      style={{
                        width: '100%',
                        maxHeight: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        display: 'block',
                      }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <button
                      onClick={() => onUpdate({ coverImage: undefined })}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                      }}
                      title="Remove cover image"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Upload button */}
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 7,
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  >
                    📁 Upload image
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          if (dataUrl) onUpdate({ coverImage: dataUrl });
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {/* URL input */}
                  <input
                    type="url"
                    placeholder="or paste image URL…"
                    defaultValue={task.coverImage?.startsWith('data:') ? '' : (task.coverImage || '')}
                    key={task.coverImage?.startsWith('data:') ? 'data' : task.coverImage || 'empty'}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val) onUpdate({ coverImage: val });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) onUpdate({ coverImage: val });
                      }
                    }}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 7,
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  />
                </div>
              </div>
            </PropertyRow>
            {/* Recurrence */}
            <PropertyRow label="Recurrence" icon={<RefreshCw size={12} />}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {task.recurrence ? (() => { try { const r = JSON.parse(task.recurrence); return r.frequency ?? task.recurrence; } catch { return task.recurrence; } })() : 'None'}
              </span>
            </PropertyRow>
          </div>

          {/* Dependencies */}
          <DependencySection
            task={task}
            allTasks={allTasks.filter((t) => t.parentId === null)}
            onUpdate={onUpdate}
          />

          {/* Description */}
          <div>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Add description..."
              style={{
                width: '100%',
                minHeight: 80,
                fontSize: 14,
                lineHeight: 1.6,
                padding: '8px',
                borderRadius: 8,
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                color: 'var(--color-text-primary)',
                resize: 'none',
                overflow: 'hidden',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            />
          </div>

          {/* Subtasks section */}
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Subtasks
              </span>
              {totalSubs > 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {doneSubs}/{totalSubs}
                </span>
              )}
            </div>

            {/* Progress bar */}
            {totalSubs > 0 && (
              <div
                style={{
                  height: 4,
                  borderRadius: 9999,
                  backgroundColor: 'var(--color-bg-tertiary)',
                  marginBottom: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    borderRadius: 9999,
                    backgroundColor: 'var(--color-status-done, #4ade80)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}

            {/* Subtask list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {subtasks.map((sub) => (
                <SubtaskItem key={sub.id} task={sub} />
              ))}
            </div>

            {/* Add subtask */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Plus size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') setNewSubtaskTitle('');
                }}
                style={{
                  flex: 1,
                  fontSize: 13,
                  padding: '4px 0',
                  border: 'none',
                  borderBottom: '1px solid transparent',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'transparent'; }}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Created {formatDateTime(task.createdAt)}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Updated {formatDateTime(task.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
