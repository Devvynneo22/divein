import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as chrono from 'chrono-node';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from './hooks/useEvents';
import { X, CheckCircle2, Circle, ArrowRight, Repeat } from 'lucide-react';
import type { CalendarEvent } from '@/shared/types/event';
import type { Task } from '@/shared/types/task';
import type { RecurrenceRule, RecurrenceFrequency } from '@/shared/types/recurrence';
import { FREQUENCY_OPTIONS } from '@/shared/types/recurrence';
import { describeRecurrence } from '@/shared/lib/recurrenceUtils';
import { eventService } from '@/shared/lib/eventService';
import { taskService } from '@/shared/lib/taskService';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'event' | 'focus_block' | 'break';
type EditScope = 'this' | 'all';

interface FormData {
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  description: string;
  eventType: EventType;
  recurrence: RecurrenceRule | null;
  durationHint: string;
}

interface QuickCreateState {
  x: number;
  y: number;
  startTime: string;
  allDay: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseEventType(description: string | null | undefined): EventType {
  if (!description) return 'event';
  if (description.startsWith('[type:focus_block]')) return 'focus_block';
  if (description.startsWith('[type:break]')) return 'break';
  return 'event';
}

function stripTypePrefix(description: string | null | undefined): string {
  if (!description) return '';
  return description.replace(/^\[type:(focus_block|break)\]\s*/, '');
}

function buildDescription(type: EventType, rawDescription: string): string | null {
  const stripped = rawDescription.trim();
  if (type === 'event') return stripped || null;
  return `[type:${type}]${stripped ? ' ' + stripped : ''}`;
}

function formatCountdown(diffMs: number): string {
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'starting now';
  if (diffMin < 60) return `in ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min event`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h === 1 ? '1 hour' : `${h} hours`} event`;
  return `${h}h ${m}m event`;
}

/** Format a Date as YYYY-MM-DDTHH:mm (datetime-local value format) */
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 4: return 'var(--color-p4)';
    case 3: return 'var(--color-p3)';
    case 2: return 'var(--color-p2)';
    case 1: return 'var(--color-p1)';
    default: return 'var(--color-accent)';
  }
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 4: return 'Urgent';
    case 3: return 'High';
    case 2: return 'Medium';
    case 1: return 'Low';
    default: return 'None';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'inbox': return 'Inbox';
    case 'todo': return 'To Do';
    case 'in_progress': return 'In Progress';
    case 'done': return 'Done';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

// ─── QuickCreatePopover ───────────────────────────────────────────────────────

interface QuickCreatePopoverProps {
  state: QuickCreateState;
  onConfirm: (text: string) => void;
  onDismiss: () => void;
}

function QuickCreatePopover({ state, onConfirm, onDismiss }: QuickCreatePopoverProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(text);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
    }
  }

  const POPOVER_W = 268;
  const x = Math.min(state.x + 10, window.innerWidth - POPOVER_W - 16);
  const y = Math.min(state.y + 10, window.innerHeight - 116);

  return (
    <>
      {/* Backdrop — click outside to dismiss */}
      <div className="fixed inset-0 z-40" onClick={onDismiss} />

      <div
        className="fixed z-50 rounded-xl p-3"
        style={{
          left: x,
          top: y,
          width: POPOVER_W,
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
          ✨ Quick create
        </p>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Team standup 10am–11am…"
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          ↵ to create · Esc to cancel
        </p>
      </div>
    </>
  );
}

// ─── RecurrenceForm ───────────────────────────────────────────────────────────

interface RecurrenceFormProps {
  recurrence: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

function RecurrenceForm({ recurrence, onChange }: RecurrenceFormProps) {
  const enabled = recurrence !== null;

  function handleToggle() {
    onChange(enabled ? null : { frequency: 'weekly', interval: 1 });
  }

  function handleFrequency(freq: RecurrenceFrequency) {
    if (!recurrence) return;
    onChange({ ...recurrence, frequency: freq });
  }

  function handleInterval(val: string) {
    if (!recurrence) return;
    const n = parseInt(val, 10);
    if (n > 0) onChange({ ...recurrence, interval: n });
  }

  function handleEndDate(val: string) {
    if (!recurrence) return;
    if (val) {
      onChange({ ...recurrence, endDate: val });
    } else {
      const { endDate: _, ...rest } = recurrence;
      onChange(rest as RecurrenceRule);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          className="rounded"
        />
        <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <Repeat size={12} /> Recurring
        </label>
      </div>

      {enabled && recurrence && (
        <div className="space-y-2 pl-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-0.5" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Frequency</label>
              <select
                value={recurrence.frequency}
                onChange={(e) => handleFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-2 py-1.5 rounded-md border text-xs outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="w-16">
              <label className="block mb-0.5" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Every</label>
              <input
                type="number"
                min={1}
                value={recurrence.interval}
                onChange={(e) => handleInterval(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md border text-xs outline-none"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>
          <div>
            <label className="block mb-0.5" style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>End Date (optional)</label>
            <input
              type="date"
              value={recurrence.endDate ?? ''}
              onChange={(e) => handleEndDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border text-xs outline-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EditScopeDialog ──────────────────────────────────────────────────────────

interface EditScopeDialogProps {
  onSelect: (scope: EditScope) => void;
  onCancel: () => void;
}

function EditScopeDialog({ onSelect, onCancel }: EditScopeDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="rounded-xl p-6 max-w-xs w-full"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup)',
        }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Edit Recurring Event
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          This event is part of a series. What would you like to edit?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect('this')}
            className="px-4 py-2.5 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          >
            Edit this event
          </button>
          <button
            onClick={() => onSelect('all')}
            className="px-4 py-2.5 rounded-lg text-sm text-white transition-colors"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            Edit all events
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EventForm ────────────────────────────────────────────────────────────────

interface EventFormProps {
  formData: FormData;
  editingId: string | null;
  editScope: EditScope | null;
  onFormDataChange: (data: FormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onClose: () => void;
}

function EventForm({
  formData,
  editingId,
  editScope,
  onFormDataChange,
  onSubmit,
  onDelete,
  onClose,
}: EventFormProps) {
  const set = (patch: Partial<FormData>) => onFormDataChange({ ...formData, ...patch });

  const EVENT_TYPE_OPTIONS: { value: EventType; label: string; emoji: string; hint: string }[] = [
    { value: 'event', label: 'Event', emoji: '📅', hint: 'Standard calendar event' },
    { value: 'focus_block', label: 'Focus Block', emoji: '🎯', hint: 'Deep work, no interruptions' },
    { value: 'break', label: 'Break', emoji: '☕', hint: 'Rest / recharge' },
  ];

  return (
    <div
      className="w-80 flex flex-col"
      style={{
        borderLeft: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: 'var(--shadow-popup)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 h-14 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {editingId
            ? editScope === 'this'
              ? 'Edit This Occurrence'
              : 'Edit Event'
            : 'New Event'}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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

      <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
        {/* Title */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            autoFocus
          />
        </div>

        {/* Event type — Feature 3 */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Type</label>
          <div className="flex gap-2">
            {EVENT_TYPE_OPTIONS.map((opt) => {
              const selected = formData.eventType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ eventType: opt.value })}
                  title={opt.hint}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selected ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
                    borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                    color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  <span style={{ fontSize: 14 }}>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* All day */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.allDay}
            onChange={(e) => set({ allDay: e.target.checked })}
            className="rounded"
          />
          <label className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>All day</label>
        </div>

        {/* Start */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Start</label>
          <input
            type={formData.allDay ? 'date' : 'datetime-local'}
            value={formData.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* End */}
        {!formData.allDay && (
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>End</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => set({ endTime: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            {/* Feature 4: duration hint */}
            {formData.durationHint && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                ⏱ {formData.durationHint}
              </p>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {/* Recurrence — hide for single-occurrence edit */}
        {editScope !== 'this' && (
          <RecurrenceForm
            recurrence={formData.recurrence}
            onChange={(r) => set({ recurrence: r })}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--color-accent)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            {editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-soft)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────

const DEFAULT_FORM: FormData = {
  title: '',
  startTime: '',
  endTime: '',
  allDay: false,
  description: '',
  eventType: 'event',
  recurrence: null,
  durationHint: '',
};

// Drag threshold: a selection wider than these is treated as a drag-to-create
const DRAG_THRESHOLD_TIMED_MS = 1_800_000;  // 30 minutes
const DRAG_THRESHOLD_ALLDAY_MS = 86_400_000; // 1 day

export function CalendarPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'withDueDate'],
    queryFn: async () => {
      const all = await taskService.list();
      return all.filter((t) => t.dueDate !== null);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<EditScope | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [pendingEventClick, setPendingEventClick] = useState<CalendarEvent | null>(null);
  const [showScopeDialog, setShowScopeDialog] = useState(false);

  // Feature 1: quick-create popover state
  const [quickCreate, setQuickCreate] = useState<QuickCreateState | null>(null);

  // Feature 2: next event countdown label
  const [nextEventLabel, setNextEventLabel] = useState('');

  // ── Feature 2: compute and refresh countdown every minute ─────────────────
  useEffect(() => {
    function updateCountdown() {
      const now = new Date();
      const cutoff = new Date(now.getTime() + 8 * 60 * 60 * 1000);

      const upcoming = events
        .filter((e) => {
          const start = new Date(e.startTime);
          return start > now && start <= cutoff;
        })
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      if (upcoming.length === 0) {
        setNextEventLabel('');
        return;
      }

      const next = upcoming[0];
      const diffMs = new Date(next.startTime).getTime() - now.getTime();
      setNextEventLabel(`📅 ${next.title} ${formatCountdown(diffMs)}`);
    }

    updateCountdown();
    const id = setInterval(updateCountdown, 60_000);
    return () => clearInterval(id);
  }, [events]);

  // ── Build FullCalendar event objects ───────────────────────────────────────

  const fcEvents = events.map((e) => {
    const evtType = parseEventType(e.description);
    const prefix = [
      e.recurrence ? '🔁' : '',
      evtType === 'focus_block' ? '🎯' : evtType === 'break' ? '☕' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const bgColor = e.color ?? 'var(--color-accent)';

    return {
      id: e.id,
      title: prefix ? `${prefix} ${e.title}` : e.title,
      start: e.startTime,
      end: e.endTime ?? undefined,
      allDay: e.allDay,
      backgroundColor: bgColor,
      borderColor: bgColor,
      extendedProps: { type: 'event' as const, event: e, evtType },
    };
  });

  const taskEvents = tasks.map((t) => {
    const hasRecurrence = !!t.recurrence;
    const taskColor =
      t.status === 'done' ? 'var(--color-success)' : getPriorityColor(t.priority);
    return {
      id: `task-${t.id}`,
      title: `✓ ${hasRecurrence ? '🔁 ' : ''}${t.title}`,
      start: t.dueDate!,
      allDay: true,
      backgroundColor: taskColor,
      borderColor: taskColor,
      classNames: t.status === 'done' ? ['task-done'] : [],
      extendedProps: { type: 'task' as const, task: t, evtType: 'event' as EventType },
    };
  });

  const allFcEvents = [...fcEvents, ...(showTasks ? taskEvents : [])];

  // ── Helpers to open forms ──────────────────────────────────────────────────

  function openNewForm(patch: Partial<FormData>) {
    setSelectedTask(null);
    setEditingId(null);
    setEditScope(null);
    setFormData({ ...DEFAULT_FORM, ...patch });
    setShowForm(true);
  }

  function openEventForm(evt: CalendarEvent, scope: EditScope) {
    const evtType = parseEventType(evt.description);
    const cleanDescription = stripTypePrefix(evt.description);
    setFormData({
      title: evt.title,
      startTime: evt.startTime.slice(0, 16),
      endTime: evt.endTime?.slice(0, 16) ?? '',
      allDay: evt.allDay,
      description: cleanDescription,
      eventType: evtType,
      recurrence: evt.recurrence ?? null,
      durationHint: '',
    });
    setEditingId(
      scope === 'all' ? eventService.getBaseId(evt.id) : evt.id,
    );
    setEditScope(scope);
    setShowForm(true);
  }

  // ── Feature 1 + 4: FullCalendar select callback ────────────────────────────
  function handleSelect(info: {
    start: Date;
    end: Date;
    startStr: string;
    allDay: boolean;
    jsEvent: MouseEvent | null;
  }) {
    const durationMs = info.end.getTime() - info.start.getTime();
    const threshold = info.allDay
      ? DRAG_THRESHOLD_ALLDAY_MS
      : DRAG_THRESHOLD_TIMED_MS;
    const isDrag = durationMs > threshold;

    if (isDrag) {
      // Feature 4: drag-to-create — open EventForm directly with duration hint
      openNewForm({
        startTime: toDatetimeLocal(info.start),
        endTime: toDatetimeLocal(info.end),
        allDay: info.allDay,
        durationHint: formatDuration(durationMs),
      });
      return;
    }

    // Feature 1: single click — show quick-create popover
    const jsEvent = info.jsEvent;
    if (jsEvent) {
      setQuickCreate({
        x: jsEvent.clientX,
        y: jsEvent.clientY,
        startTime: info.allDay ? info.startStr : toDatetimeLocal(info.start),
        allDay: info.allDay,
      });
    }
  }

  // When user confirms quick-create text
  function handleQuickCreateConfirm(text: string) {
    if (!quickCreate) return;
    setQuickCreate(null);

    const trimmed = text.trim();

    if (!trimmed) {
      // Empty input: open form with just the clicked time
      openNewForm({ startTime: quickCreate.startTime, allDay: quickCreate.allDay });
      return;
    }

    // Parse with chrono-node
    const refDate = new Date(quickCreate.startTime);
    const parsed = chrono.parse(trimmed, refDate, { forwardDate: true });

    let parsedTitle = trimmed;
    let parsedStart = quickCreate.startTime;
    let parsedEnd = '';

    if (parsed.length > 0) {
      const result = parsed[0];
      // Extract title: text before/after the parsed date expression
      const before = trimmed.slice(0, result.index).trim();
      const after = trimmed.slice(result.index + result.text.length).trim();
      parsedTitle = [before, after].filter(Boolean).join(' ') || trimmed;

      if (result.start) {
        parsedStart = toDatetimeLocal(result.start.date());
      }
      if (result.end) {
        parsedEnd = toDatetimeLocal(result.end.date());
      }
    }

    openNewForm({
      title: parsedTitle,
      startTime: parsedStart,
      endTime: parsedEnd,
      allDay: quickCreate.allDay,
    });
  }

  function handleQuickCreateDismiss() {
    setQuickCreate(null);
  }

  // ── Event click ────────────────────────────────────────────────────────────
  function handleEventClick(info: { event: { id: string; extendedProps: Record<string, unknown> } }) {
    if (info.event.extendedProps.type === 'task') {
      const task = info.event.extendedProps.task as Task;
      setSelectedTask(task);
      setShowForm(false);
      return;
    }

    setSelectedTask(null);
    const evt = info.event.extendedProps.event as CalendarEvent;

    if (eventService.isRecurringId(evt.id)) {
      setPendingEventClick(evt);
      setShowScopeDialog(true);
      return;
    }

    openEventForm(evt, 'all');
  }

  const handleScopeSelect = useCallback(
    (scope: EditScope) => {
      setShowScopeDialog(false);
      if (pendingEventClick) {
        openEventForm(pendingEventClick, scope);
        setPendingEventClick(null);
      }
    },
    [pendingEventClick],
  );

  function handleScopeCancel() {
    setShowScopeDialog(false);
    setPendingEventClick(null);
  }

  // ── Event drag ─────────────────────────────────────────────────────────────
  function handleEventDrop(info: {
    event: { id: string; startStr: string; endStr: string; allDay: boolean };
  }) {
    if (info.event.id.startsWith('task-')) {
      const taskId = info.event.id.replace('task-', '');
      void taskService.update(taskId, { dueDate: info.event.startStr });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      return;
    }

    updateEvent.mutate({
      id: info.event.id,
      data: {
        startTime: info.event.startStr,
        endTime: info.event.endStr || null,
        allDay: info.event.allDay,
      },
    });
  }

  async function handleToggleTaskStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await taskService.update(task.id, { status: newStatus });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setSelectedTask({ ...task, status: newStatus });
  }

  // ── Form submit ────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const description = buildDescription(formData.eventType, formData.description);

    if (editingId) {
      updateEvent.mutate({
        id: editingId,
        data: {
          title: formData.title.trim(),
          startTime: formData.startTime,
          endTime: formData.endTime || null,
          allDay: formData.allDay,
          description,
          recurrence: formData.recurrence,
        },
      });
    } else {
      createEvent.mutate({
        title: formData.title.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        allDay: formData.allDay,
        description: description ?? undefined,
        recurrence: formData.recurrence,
      });
    }

    setShowForm(false);
  }

  function handleDelete() {
    if (!editingId) return;
    const isRecurring = eventService.isRecurringId(editingId);
    const message = isRecurring
      ? 'Delete this event? This is part of a recurring series.'
      : 'Delete this event?';
    if (!window.confirm(message)) return;
    deleteEvent.mutate(editingId);
    setShowForm(false);
  }

  // ── Feature 3: custom eventContent for Focus Block / Break styling ─────────
  function renderEventContent(arg: {
    event: { extendedProps: Record<string, unknown>; title: string };
    timeText: string;
  }) {
    const evtType = (arg.event.extendedProps.evtType ?? 'event') as EventType;

    if (evtType === 'event') return undefined; // use default FullCalendar rendering

    const isFocus = evtType === 'focus_block';

    const containerStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      padding: '2px 4px',
      overflow: 'hidden',
      borderRadius: 3,
      position: 'relative',
    };

    if (isFocus) {
      containerStyle.backgroundImage =
        'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)';
    } else {
      // Break: desaturate via filter
      containerStyle.filter = 'saturate(0.45) brightness(1.15)';
    }

    return (
      <div style={containerStyle}>
        {arg.timeText && (
          <span style={{ fontSize: 10, opacity: 0.85, marginRight: 3 }}>{arg.timeText}</span>
        )}
        <span style={{ fontSize: 11, fontWeight: 500 }}>{arg.event.title}</span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Dialogs */}
      {showScopeDialog && (
        <EditScopeDialog onSelect={handleScopeSelect} onCancel={handleScopeCancel} />
      )}

      {/* Feature 1: Quick-create popover */}
      {quickCreate && (
        <QuickCreatePopover
          state={quickCreate}
          onConfirm={handleQuickCreateConfirm}
          onDismiss={handleQuickCreateDismiss}
        />
      )}

      {/* Page header */}
      <div
        className="flex items-center justify-between px-8 py-6 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Calendar
          </h1>

          {/* Feature 2: Next event countdown */}
          {nextEventLabel && (
            <div
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
                opacity: 0.9,
                letterSpacing: '0.01em',
              }}
            >
              {nextEventLabel}
            </div>
          )}
        </div>

        <label
          className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <input
            type="checkbox"
            checked={showTasks}
            onChange={(e) => setShowTasks(e.target.checked)}
            className="rounded"
          />
          Show tasks
        </label>
      </div>

      {/* Content row */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 px-6 py-4 overflow-auto">
          {/* FullCalendar theme overrides */}
          <style>{`
            .fc {
              --fc-bg-event-opacity: 0.3;
              --fc-border-color: var(--color-border);
              --fc-button-bg-color: var(--color-bg-tertiary);
              --fc-button-border-color: var(--color-border);
              --fc-button-text-color: var(--color-text-primary);
              --fc-button-hover-bg-color: var(--color-bg-elevated);
              --fc-button-hover-border-color: var(--color-border-hover);
              --fc-button-active-bg-color: var(--color-accent);
              --fc-button-active-border-color: var(--color-accent);
              --fc-page-bg-color: var(--color-bg-primary);
              --fc-neutral-bg-color: var(--color-bg-secondary);
              --fc-today-bg-color: var(--color-accent-soft);
              --fc-event-bg-color: var(--color-accent);
              --fc-event-border-color: var(--color-accent);
              --fc-event-text-color: white;
              --fc-list-event-hover-bg-color: var(--color-bg-tertiary);
              color: var(--color-text-primary);
              font-size: 13px;
            }
            .fc .fc-col-header-cell { background: var(--color-bg-secondary); }
            .fc .fc-daygrid-day-number { color: var(--color-text-secondary); padding: 4px 8px; }
            .fc .fc-scrollgrid { border-color: var(--color-border); }
            .fc td, .fc th { border-color: var(--color-border) !important; }
            .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; color: var(--color-text-primary); }
            .fc .fc-event.task-done { opacity: 0.5; }
            .fc .fc-event.task-done .fc-event-title { text-decoration: line-through; }
            .fc .fc-button {
              padding: 8px 16px !important;
              font-size: 13px !important;
              font-weight: 500 !important;
              border-radius: 8px !important;
            }
            .fc .fc-button-group .fc-button { border-radius: 0 !important; }
            .fc .fc-button-group .fc-button:first-child { border-radius: 8px 0 0 8px !important; }
            .fc .fc-button-group .fc-button:last-child { border-radius: 0 8px 8px 0 !important; }
            .fc .fc-toolbar { gap: 8px; }
            .fc .fc-toolbar-chunk { display: flex; align-items: center; gap: 4px; }
          `}</style>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={allFcEvents}
            editable={true}
            selectable={true}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            height="100%"
          />
        </div>

        {/* Event form panel */}
        {showForm && (
          <EventForm
            formData={formData}
            editingId={editingId}
            editScope={editScope}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Task detail panel */}
        {selectedTask && !showForm && (
          <div
            className="w-80 flex flex-col"
            style={{
              borderLeft: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              boxShadow: 'var(--shadow-popup)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 h-14 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Task Details
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
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

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {selectedTask.title}
              </h3>

              {selectedTask.recurrence && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-accent)' }}>
                  <Repeat size={12} />
                  {(() => {
                    try {
                      return describeRecurrence(JSON.parse(selectedTask.recurrence));
                    } catch {
                      return 'Recurring';
                    }
                  })()}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Status</span>
                <button
                  onClick={() => void handleToggleTaskStatus(selectedTask)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{
                    color:
                      selectedTask.status === 'done'
                        ? 'var(--color-success)'
                        : 'var(--color-text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {selectedTask.status === 'done' ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Circle size={14} />
                  )}
                  {getStatusLabel(selectedTask.status)}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Priority</span>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-md"
                  style={{
                    color: getPriorityColor(selectedTask.priority),
                    backgroundColor: 'var(--color-bg-tertiary)',
                  }}
                >
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Due Date</span>
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString()
                    : '—'}
                </span>
              </div>

              {selectedTask.description && (
                <div>
                  <span className="text-xs block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Description
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedTask.description}
                  </p>
                </div>
              )}

              <button
                onClick={() => navigate('/tasks')}
                className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
              >
                Open in Tasks
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
