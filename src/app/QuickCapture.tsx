/**
 * QuickCapture — global floating modal for instant task/note/event creation.
 * Triggered by Ctrl+Space. Self-contained: manages its own open/close state.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

import { taskService } from '@/shared/lib/taskService';
import { noteService } from '@/shared/lib/noteService';
import { eventService } from '@/shared/lib/eventService';
import { parseQuickAdd } from '@/modules/tasks/lib/nlpQuickAdd';
import { toast } from '@/shared/stores/toastStore';
import type { TaskPriority } from '@/shared/types/task';

// ─── Types ────────────────────────────────────────────────────────────────────

type CaptureType = 'task' | 'note' | 'event';

// ─── Priority label helpers ───────────────────────────────────────────────────

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const PRIORITY_COLOR: Record<number, string> = {
  1: 'var(--color-p1)',
  2: 'var(--color-p2)',
  3: 'var(--color-p3)',
  4: 'var(--color-p4)',
};

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS: { type: CaptureType; emoji: string; label: string }[] = [
  { type: 'task',  emoji: '📝', label: 'Task'  },
  { type: 'note',  emoji: '📄', label: 'Note'  },
  { type: 'event', emoji: '📅', label: 'Event' },
];

// ─── NLP Preview Chips ────────────────────────────────────────────────────────

interface ParsePreviewProps {
  dueDate: string | null;
  tags: string[];
  priority: TaskPriority | null;
}

function ParsePreview({ dueDate, tags, priority }: ParsePreviewProps) {
  if (!dueDate && tags.length === 0 && priority === null) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
      {dueDate && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: '20px',
            backgroundColor: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-muted)',
          }}
        >
          📅 {format(new Date(dueDate), 'MMM d')}
        </span>
      )}
      {priority !== null && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: '20px',
            backgroundColor: `color-mix(in srgb, ${PRIORITY_COLOR[priority]} 15%, transparent)`,
            color: PRIORITY_COLOR[priority],
            border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[priority]} 30%, transparent)`,
          }}
        >
          🚩 P{5 - priority} {PRIORITY_LABEL[priority]}
        </span>
      )}
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            fontSize: '12px',
            fontWeight: 500,
            padding: '2px 10px',
            borderRadius: '20px',
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CaptureType>('task');
  const [value, setValue] = useState('');
  const [success, setSuccess] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Parse NLP (task only, live) ─────────────────────────────────────────────
  const parsed = useMemo(() => {
    if (type !== 'task' || !value.trim()) return null;
    return parseQuickAdd(value);
  }, [type, value]);

  // ── Ctrl+Space global listener ──────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey && e.code === 'Space') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Auto-focus on open ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // tiny delay to ensure element is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Reset on close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setValue('');
      setType('task');
      setSuccess(false);
      setIsCreating(false);
    }
  }, [open]);

  // ── Create handler ──────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!value.trim() || isCreating) return;
    setIsCreating(true);

    try {
      if (type === 'task') {
        const p = parseQuickAdd(value);
        await taskService.create({
          title: p.title || value.trim(),
          dueDate: p.dueDate ? p.dueDate.split('T')[0] : undefined,
          tags: p.tags,
          priority: p.priority ?? 0,
          status: 'inbox',
        });
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
        toast.success('Task created');
      } else if (type === 'note') {
        const note = await noteService.create({ title: value.trim() });
        void queryClient.invalidateQueries({ queryKey: ['notes'] });
        toast.success('Note created');
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          navigate('/notes', { state: { selectedNoteId: note.id } });
        }, 500);
        return;
      } else if (type === 'event') {
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        await eventService.create({
          title: value.trim(),
          startTime: today.toISOString(),
          allDay: true,
        });
        void queryClient.invalidateQueries({ queryKey: ['events'] });
        toast.success('Event created');
      }

      setSuccess(true);
      setTimeout(() => setOpen(false), 500);
    } catch (err) {
      toast.error('Failed to create — please try again');
      setIsCreating(false);
    }
  }, [value, type, isCreating, queryClient, navigate]);

  // ── Keyboard handler ────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const types: CaptureType[] = ['task', 'note', 'event'];
      const idx = types.indexOf(type);
      setType(types[(idx + 1) % types.length]);
      return;
    }
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      void handleCreate();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-popup)',
          }}
        >
          {/* ── Type tabs ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 px-4 pt-4 pb-3"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            {TABS.map((tab) => {
              const active = tab.type === type;
              return (
                <button
                  key={tab.type}
                  onClick={() => setType(tab.type)}
                  style={{
                    fontSize: '12px',
                    fontWeight: active ? 600 : 400,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  }}
                >
                  {tab.emoji} {tab.label}
                </button>
              );
            })}
            <span
              className="ml-auto text-[11px]"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Tab to switch
            </span>
          </div>

          {/* ── Input ─────────────────────────────────────────────────────── */}
          {success ? (
            <div
              className="flex items-center justify-center gap-2 py-8"
              style={{ color: 'var(--color-success)' }}
            >
              <CheckCircle2 size={22} />
              <span className="text-sm font-medium">Created!</span>
            </div>
          ) : (
            <>
              <div className="px-4 pt-4 pb-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Quick capture… (type and press Enter)"
                  className="w-full bg-transparent outline-none"
                  style={{
                    fontSize: '16px',
                    color: 'var(--color-text-primary)',
                    padding: '4px 0',
                  }}
                  disabled={isCreating}
                />
              </div>

              {/* NLP preview chips (task only) */}
              {parsed && (
                <ParsePreview
                  dueDate={parsed.dueDate}
                  tags={parsed.tags}
                  priority={parsed.priority}
                />
              )}

              {/* Footer */}
              <div
                className="flex items-center justify-between px-4 py-2.5 text-[11px]"
                style={{
                  borderTop: value ? '1px solid var(--color-border)' : 'none',
                  color: 'var(--color-text-muted)',
                }}
              >
                <span>↵ Create {type}</span>
                <span>Esc to close</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
