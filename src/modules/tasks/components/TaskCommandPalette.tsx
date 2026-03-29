/**
 * TaskCommandPalette — context-sensitive Cmd+K palette for a single task.
 *
 * Opens when the user presses Cmd+K / Ctrl+K with a task focused/hovered.
 * Supports: Set Status, Set Priority, Set Due Date, Delete.
 *
 * Uses the `cmdk` (Command component) package already installed in the project.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import {
  CheckCircle,
  Flag,
  Calendar,
  Trash2,
  ArrowRight,
  X,
  ChevronLeft,
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'inbox',      label: 'Inbox' },
  { value: 'todo',       label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'done',       label: 'Done' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 0, label: 'No Priority' },
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Urgent' },
];

type SubPage = 'root' | 'status' | 'priority' | 'dueDate';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TaskCommandPaletteProps {
  task: Task;
  onSetStatus: (status: TaskStatus) => void;
  onSetPriority: (priority: TaskPriority) => void;
  onSetDueDate: (date: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TaskCommandPalette({
  task,
  onSetStatus,
  onSetPriority,
  onSetDueDate,
  onDelete,
  onClose,
}: TaskCommandPaletteProps) {
  const [subPage, setSubPage] = useState<SubPage>('root');
  const [dateInput, setDateInput] = useState(task.dueDate?.split('T')[0] ?? '');
  const dateRef = useRef<HTMLInputElement>(null);

  // Focus date input when subPage switches to dueDate
  useEffect(() => {
    if (subPage === 'dueDate') {
      setTimeout(() => dateRef.current?.focus(), 50);
    }
  }, [subPage]);

  const handleBackspace = useCallback(
    (e: React.KeyboardEvent) => {
      // Let cmdk handle search; only intercept empty-search backspace to go back
      if (
        e.key === 'Backspace' &&
        subPage !== 'root' &&
        (e.currentTarget as HTMLInputElement).value === ''
      ) {
        e.preventDefault();
        setSubPage('root');
      }
    },
    [subPage]
  );

  // Close on Escape (bubbles up from cmdk automatically, but also handle manually)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (subPage !== 'root') setSubPage('root');
        else onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [subPage, onClose]);

  const pageTitle: Record<SubPage, string> = {
    root: 'Task actions',
    status: 'Set Status',
    priority: 'Set Priority',
    dueDate: 'Set Due Date',
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Palette container */}
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 9999,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          animation: 'palette-open 0.18s cubic-bezier(0.34, 1.26, 0.64, 1)',
        }}
      >
        <style>{`
          @keyframes palette-open {
            from { opacity: 0; transform: translateX(-50%) scale(0.96); }
            to   { opacity: 1; transform: translateX(-50%) scale(1); }
          }
          /* cmdk base resets */
          [cmdk-root] { outline: none; }
          [cmdk-input] {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            font-size: 14px;
            color: var(--color-text-primary);
            font-family: inherit;
          }
          [cmdk-input]::placeholder { color: var(--color-text-muted); }
          [cmdk-list] {
            max-height: 340px;
            overflow-y: auto;
            overscroll-behavior: contain;
          }
          [cmdk-item] {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 14px;
            font-size: 13px;
            cursor: pointer;
            user-select: none;
            border-radius: 8px;
            margin: 2px 6px;
            color: var(--color-text-primary);
            font-family: inherit;
            transition: background 0.08s ease;
            outline: none;
          }
          [cmdk-item][data-selected='true'] {
            background-color: var(--color-bg-hover);
          }
          [cmdk-item][data-disabled='true'] {
            opacity: 0.4;
            cursor: not-allowed;
          }
          [cmdk-group-heading] {
            padding: 8px 14px 4px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--color-text-muted);
          }
          [cmdk-empty] {
            padding: 24px;
            text-align: center;
            font-size: 13px;
            color: var(--color-text-muted);
          }
          [cmdk-separator] {
            height: 1px;
            background-color: var(--color-border);
            margin: 4px 0;
          }
        `}</style>

        {/* Header — breadcrumb + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px 0',
          }}
        >
          {subPage !== 'root' && (
            <button
              onClick={() => setSubPage('root')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                borderRadius: 6,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                flexShrink: 0,
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <span
            style={{
              flex: 1,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {pageTitle[subPage]}
          </span>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Task context */}
        <div
          style={{
            padding: '6px 14px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <StatusIcon status={task.status} size={14} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {task.title}
          </span>
        </div>

        {/* ── cmdk root ──────────────────────────────────────────────────── */}
        <Command>
          {/* Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <Command.Input
              placeholder={
                subPage === 'root'
                  ? 'Search actions…'
                  : subPage === 'status'
                  ? 'Search statuses…'
                  : subPage === 'priority'
                  ? 'Search priorities…'
                  : 'Enter date…'
              }
              onKeyDown={handleBackspace}
              autoFocus
            />
          </div>

          <Command.List>
            <Command.Empty>No matching actions</Command.Empty>

            {/* ── Root page ──────────────────────────────────────────────── */}
            {subPage === 'root' && (
              <>
                <Command.Group heading="Actions">
                  <Command.Item
                    onSelect={() => setSubPage('status')}
                  >
                    <CheckCircle size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    Set Status…
                    <ArrowRight size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
                  </Command.Item>

                  <Command.Item
                    onSelect={() => setSubPage('priority')}
                  >
                    <Flag size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    Set Priority…
                    <ArrowRight size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
                  </Command.Item>

                  <Command.Item
                    onSelect={() => setSubPage('dueDate')}
                  >
                    <Calendar size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    Set Due Date…
                    <ArrowRight size={12} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />
                  </Command.Item>
                </Command.Group>

                <Command.Separator />

                <Command.Group heading="Danger Zone">
                  <Command.Item
                    onSelect={() => { onDelete(); onClose(); }}
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={14} style={{ flexShrink: 0 }} />
                    Delete Task
                  </Command.Item>
                </Command.Group>
              </>
            )}

            {/* ── Status sub-page ─────────────────────────────────────────── */}
            {subPage === 'status' && (
              <Command.Group heading="Status">
                {STATUSES.map((s) => (
                  <Command.Item
                    key={s.value}
                    onSelect={() => {
                      onSetStatus(s.value);
                      onClose();
                    }}
                  >
                    <StatusIcon status={s.value} size={14} />
                    {s.label}
                    {task.status === s.value && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          color: 'var(--color-accent)',
                          fontWeight: 600,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* ── Priority sub-page ──────────────────────────────────────── */}
            {subPage === 'priority' && (
              <Command.Group heading="Priority">
                {PRIORITIES.map((p) => (
                  <Command.Item
                    key={p.value}
                    onSelect={() => {
                      onSetPriority(p.value);
                      onClose();
                    }}
                  >
                    <PriorityIcon priority={p.value} size={14} />
                    {p.label}
                    {task.priority === p.value && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          color: 'var(--color-accent)',
                          fontWeight: 600,
                        }}
                      >
                        Current
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* ── Due date sub-page ──────────────────────────────────────── */}
            {subPage === 'dueDate' && (
              <div style={{ padding: '12px 14px 8px' }}>
                <input
                  ref={dateRef}
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: 'inherit',
                    marginBottom: 10,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onSetDueDate(dateInput || null);
                      onClose();
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { onSetDueDate(dateInput || null); onClose(); }}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: 'none',
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
                  >
                    Apply
                  </button>
                  {task.dueDate && (
                    <button
                      onClick={() => { onSetDueDate(null); onClose(); }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'transparent',
                        color: 'var(--color-danger)',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </Command.List>
        </Command>

        {/* Footer hint */}
        <div
          style={{
            padding: '6px 14px 10px',
            display: 'flex',
            gap: 14,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {[
            ['↑↓', 'Navigate'],
            ['↵', 'Select'],
            ['⌫', 'Back'],
            ['Esc', 'Close'],
          ].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-muted)' }}>
              <kbd
                style={{
                  padding: '1px 5px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  fontSize: 11,
                  fontFamily: 'inherit',
                }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
