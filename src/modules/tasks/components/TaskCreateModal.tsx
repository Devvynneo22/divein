import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, ChevronDown, Check, Calendar } from 'lucide-react';
import * as chrono from 'chrono-node';
import { format, parseISO, addDays } from 'date-fns';
import type { TaskStatus, TaskPriority, CreateTaskInput } from '@/shared/types/task';

// ─── Config ───────────────────────────────────────────────────────────────────

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

// ─── NaturalDateInput ─────────────────────────────────────────────────────────

export interface NaturalDateInputProps {
  value: string | null; // ISO date string YYYY-MM-DD
  onChange: (date: string | null) => void;
  placeholder?: string;
}

export function NaturalDateInput({
  value,
  onChange,
  placeholder = 'e.g. tomorrow, next friday, Mar 5',
}: NaturalDateInputProps) {
  const [inputText, setInputText] = useState('');
  // Ref mirrors inputText to avoid stale-closure bugs in commit/setQuick
  const inputTextRef = useRef('');
  const [isFocused, setIsFocused] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  // Live-parse as user types (drives preview badge only)
  useEffect(() => {
    const trimmed = inputText.trim();
    if (!trimmed) { setParsedPreview(null); return; }
    setParsedPreview(chrono.parseDate(trimmed, new Date()) ?? null);
  }, [inputText]);

  // Commit on Enter / blur — always reads from ref to avoid stale closures
  const commit = useCallback(() => {
    const trimmed = inputTextRef.current.trim();
    if (trimmed) {
      const parsed = chrono.parseDate(trimmed, new Date());
      if (parsed) {
        onChange(format(parsed, 'yyyy-MM-dd'));
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        onChange(trimmed);
      } else {
        onChange(null); // clear on unrecognized input
      }
    }
    // Always reset working state
    inputTextRef.current = '';
    setInputText('');
    setParsedPreview(null);
  }, [onChange]);

  // Quick chip helper — clears the input then commits the supplied ISO date
  const setQuick = useCallback((iso: string | null) => {
    inputTextRef.current = '';
    setInputText('');
    setParsedPreview(null);
    onChange(iso);
    // Blur so onBlur fires (commit is a no-op since ref is empty) and isFocused resets
    inputRef.current?.blur();
  }, [onChange]);

  const formatDisplayDate = (iso: string): string => {
    try { return format(parseISO(iso), 'EEE, MMM d'); }
    catch { return iso; }
  };

  const displayValue = isFocused ? inputText : (value ? formatDisplayDate(value) : '');

  const todayISO    = format(new Date(), 'yyyy-MM-dd');
  const tomorrowISO = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const nextWeekISO = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const CHIP_STYLE: React.CSSProperties = {
    fontSize: 11,
    padding: '3px 9px',
    borderRadius: 999,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputText(e.target.value);
            inputTextRef.current = e.target.value;
          }}
          onFocus={() => {
            setIsFocused(true);
            setInputText('');
            inputTextRef.current = '';
          }}
          onBlur={() => {
            commit();
            setIsFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              inputRef.current?.blur();
            }
            if (e.key === 'Escape') {
              inputTextRef.current = '';
              setInputText('');
              setParsedPreview(null);
              inputRef.current?.blur();
            }
          }}
          style={{
            width: '100%',
            padding: '7px 32px 7px 10px',
            borderRadius: 8,
            border: `1px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
        />

        {/* Calendar icon fallback */}
        <button
          type="button"
          tabIndex={-1}
          // Prevent blur on the text input when clicking this button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = calendarInputRef.current;
            if (!el) return;
            const elAny = el as HTMLInputElement & { showPicker?: () => void };
            if (typeof elAny.showPicker === 'function') { elAny.showPicker(); } else { el.click(); }
          }}
          title="Open date picker"
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: 5,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <Calendar size={13} />
        </button>

        {/* Hidden native date input (fallback) */}
        <input
          ref={calendarInputRef}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
          tabIndex={-1}
        />
      </div>

      {/* ── Live preview / error hint ──────────────────────────────────────── */}
      {isFocused && inputText.trim() && (
        <div style={{ marginTop: 4 }}>
          {parsedPreview ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: 'var(--color-success-soft, rgba(34,197,94,0.1))',
              color: 'var(--color-success, #22c55e)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}>
              ✓ {format(parsedPreview, 'EEEE, MMM d')}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--color-danger, #ef4444)',
              opacity: 0.8,
            }}>
              Unrecognized date
            </span>
          )}
        </div>
      )}

      {/* ── Quick chips (shown while focused) ─────────────────────────────── */}
      {isFocused && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {([
            { label: 'Today',     iso: todayISO },
            { label: 'Tomorrow',  iso: tomorrowISO },
            { label: 'Next week', iso: nextWeekISO },
          ] as const).map(({ label, iso }) => (
            <button
              key={label}
              type="button"
              // onMouseDown + preventDefault keeps focus on text input until we manually blur
              onMouseDown={(e) => { e.preventDefault(); setQuick(iso); }}
              style={CHIP_STYLE}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setQuick(null); }}
            style={{ ...CHIP_STYLE, backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline dropdown ──────────────────────────────────────────────────────────

function FieldDropdown<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (v: T) => void;
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
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            width: '100%',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-tertiary)',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          {selected.color && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: selected.color, flexShrink: 0 }} />
          )}
          <span style={{ flex: 1 }}>{selected.label}</span>
          <ChevronDown size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 200,
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
                type="button"
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
                {opt.color && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />}
                <span style={{ flex: 1 }}>{opt.label}</span>
                {opt.value === value && <Check size={12} style={{ color: 'var(--color-accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function TagPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  const color = TAG_COLORS[Math.abs(label.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % TAG_COLORS.length];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: color + '33',
        color: color,
        border: `1px solid ${color}55`,
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        style={{ display: 'flex', alignItems: 'center', marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, opacity: 0.7 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ─── TaskCreateModal ──────────────────────────────────────────────────────────

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: CreateTaskInput) => void;
  defaultStatus?: TaskStatus;
}

export function TaskCreateModal({ isOpen, onClose, onCreate, defaultStatus }: TaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus ?? 'inbox');
  const [priority, setPriority] = useState<TaskPriority>(0);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [estimatedMin, setEstimatedMin] = useState('');
  const [description, setDescription] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setStatus(defaultStatus ?? 'inbox');
      setPriority(0);
      setDueDate(null);
      setTags([]);
      setTagInput('');
      setEstimatedMin('');
      setDescription('');
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen, defaultStatus]);

  // Auto-resize description
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  const handleCreate = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const input: CreateTaskInput = {
      title: trimmed,
      status,
      priority,
      dueDate: dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
      estimatedMin: estimatedMin ? parseInt(estimatedMin) : undefined,
      description: description.trim() || undefined,
    };
    onCreate(input);
    onClose();
  }, [title, status, priority, dueDate, tags, estimatedMin, description, onCreate, onClose]);

  const handleTagAdd = useCallback(() => {
    const t = sanitizeTag(tagInput);
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }, [tagInput, tags]);

  // Global Escape handler
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Task"
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-popup, 0 20px 60px rgba(0,0,0,0.25))',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            New Task
          </span>
          <button
            type="button"
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
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
                e.preventDefault();
                handleCreate();
              }
            }}
            style={{
              width: '100%',
              fontSize: 17,
              fontWeight: 500,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />

          {/* Two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <FieldDropdown
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
            <FieldDropdown
              label="Priority"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
            />

            {/* Due date — natural language input */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Due Date
              </label>
              <NaturalDateInput
                value={dueDate}
                onChange={setDueDate}
              />
            </div>

            {/* Estimate */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Estimate
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={estimatedMin}
                  onChange={(e) => setEstimatedMin(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                />
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>min</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tags
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {tags.map((tag) => (
                <TagPill key={tag} label={tag} onRemove={() => setTags((prev) => prev.filter((t) => t !== tag))} />
              ))}
              <input
                type="text"
                placeholder="Add tag, press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleTagAdd(); }
                  if (e.key === ',') { e.preventDefault(); handleTagAdd(); }
                }}
                style={{
                  flex: 1,
                  minWidth: 120,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  fontSize: 12,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; handleTagAdd(); }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </label>
            <textarea
              ref={descRef}
              placeholder="Add description... (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                minHeight: 72,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 20px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-wash)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: title.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: title.trim() ? 'white' : 'var(--color-text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => { if (title.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { if (title.trim()) e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={14} />
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
