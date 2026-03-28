import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from './hooks/useEvents';
import { X, CheckCircle2, Circle, ArrowRight, Repeat } from 'lucide-react';
import type { CalendarEvent } from '@/shared/types/event';
import type { Task } from '@/shared/types/task';
import type { RecurrenceRule, RecurrenceFrequency } from '@/shared/types/recurrence';
import { FREQUENCY_OPTIONS } from '@/shared/types/recurrence';
import { describeRecurrence } from '@/shared/lib/recurrenceUtils';
import { eventService } from '@/shared/lib/eventService';
import { taskService } from '@/shared/lib/taskService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 4: return '#ef4444';
    case 3: return '#f59e0b';
    case 2: return '#3b82f6';
    case 1: return '#9ca3af';
    default: return '#6366f1';
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

// ─── Recurrence Form Component ──────────────────────────────────────────────

interface RecurrenceFormProps {
  recurrence: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

function RecurrenceForm({ recurrence, onChange }: RecurrenceFormProps) {
  const enabled = recurrence !== null;

  function handleToggle() {
    if (enabled) {
      onChange(null);
    } else {
      onChange({ frequency: 'weekly', interval: 1 });
    }
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
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
          <Repeat size={12} /> Recurring
        </label>
      </div>

      {enabled && recurrence && (
        <div className="space-y-2 pl-5">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-[var(--color-text-muted)] mb-0.5 block">Frequency</label>
              <select
                value={recurrence.frequency}
                onChange={(e) => handleFrequency(e.target.value as RecurrenceFrequency)}
                className="w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="w-16">
              <label className="text-[10px] text-[var(--color-text-muted)] mb-0.5 block">Every</label>
              <input
                type="number"
                min={1}
                value={recurrence.interval}
                onChange={(e) => handleInterval(e.target.value)}
                className="w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--color-text-muted)] mb-0.5 block">End Date (optional)</label>
            <input
              type="date"
              value={recurrence.endDate ?? ''}
              onChange={(e) => handleEndDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Scope Dialog ──────────────────────────────────────────────────────

type EditScope = 'this' | 'all';

interface EditScopeDialogProps {
  onSelect: (scope: EditScope) => void;
  onCancel: () => void;
}

function EditScopeDialog({ onSelect, onCancel }: EditScopeDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 shadow-xl max-w-xs w-full">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Edit Recurring Event</h3>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          This event is part of a series. What would you like to edit?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect('this')}
            className="px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
          >
            Edit this event
          </button>
          <button
            onClick={() => onSelect('all')}
            className="px-4 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Edit all events
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CalendarPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Task query — fetch tasks that have a due date
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'withDueDate'],
    queryFn: async () => {
      const all = await taskService.list();
      return all.filter((t) => t.dueDate !== null);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    allDay: false,
    description: '',
    recurrence: null as RecurrenceRule | null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<EditScope | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTasks, setShowTasks] = useState(true);
  const [pendingEventClick, setPendingEventClick] = useState<CalendarEvent | null>(null);
  const [showScopeDialog, setShowScopeDialog] = useState(false);

  // Map calendar events to FullCalendar format
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: (e.recurrence ? '🔁 ' : '') + e.title,
    start: e.startTime,
    end: e.endTime ?? undefined,
    allDay: e.allDay,
    backgroundColor: e.color ?? 'var(--color-accent)',
    borderColor: e.color ?? 'var(--color-accent)',
    extendedProps: { type: 'event' as const, event: e },
  }));

  // Map tasks to FullCalendar events
  const taskEvents = tasks.map((t) => {
    const hasRecurrence = !!t.recurrence;
    return {
      id: `task-${t.id}`,
      title: `✓ ${hasRecurrence ? '🔁 ' : ''}${t.title}`,
      start: t.dueDate!,
      allDay: true,
      backgroundColor: t.status === 'done' ? '#22c55e' : getPriorityColor(t.priority),
      borderColor: t.status === 'done' ? '#22c55e' : getPriorityColor(t.priority),
      classNames: t.status === 'done' ? ['task-done'] : [],
      extendedProps: { type: 'task' as const, task: t },
    };
  });

  // Combine both
  const allFcEvents = [...fcEvents, ...(showTasks ? taskEvents : [])];

  function handleDateClick(info: { dateStr: string; allDay: boolean }) {
    setSelectedTask(null);
    setFormData({
      title: '',
      startTime: info.allDay ? info.dateStr : info.dateStr,
      endTime: '',
      allDay: info.allDay,
      description: '',
      recurrence: null,
    });
    setEditingId(null);
    setEditScope(null);
    setShowForm(true);
  }

  function openEventForm(evt: CalendarEvent, scope: EditScope) {
    const baseRecurrence = evt.recurrence ?? null;
    setFormData({
      title: evt.title,
      startTime: evt.startTime.slice(0, 16),
      endTime: evt.endTime?.slice(0, 16) ?? '',
      allDay: evt.allDay,
      description: evt.description ?? '',
      recurrence: baseRecurrence,
    });
    // For "this" scope, use the occurrence ID; for "all", use the base ID
    if (scope === 'all') {
      setEditingId(eventService.getBaseId(evt.id));
    } else {
      setEditingId(evt.id);
    }
    setEditScope(scope);
    setShowForm(true);
  }

  function handleEventClick(info: { event: { id: string; extendedProps: Record<string, unknown> } }) {
    if (info.event.extendedProps.type === 'task') {
      const task = info.event.extendedProps.task as Task;
      setSelectedTask(task);
      setShowForm(false);
      return;
    }

    setSelectedTask(null);
    const evt = info.event.extendedProps.event as CalendarEvent;

    // Check if this is a recurring event — ask user scope
    if (eventService.isRecurringId(evt.id)) {
      setPendingEventClick(evt);
      setShowScopeDialog(true);
      return;
    }

    openEventForm(evt, 'all');
  }

  const handleScopeSelect = useCallback((scope: EditScope) => {
    setShowScopeDialog(false);
    if (pendingEventClick) {
      openEventForm(pendingEventClick, scope);
      setPendingEventClick(null);
    }
  }, [pendingEventClick]);

  function handleScopeCancel() {
    setShowScopeDialog(false);
    setPendingEventClick(null);
  }

  function handleEventDrop(info: { event: { id: string; startStr: string; endStr: string; allDay: boolean } }) {
    if (info.event.id.startsWith('task-')) {
      const taskId = info.event.id.replace('task-', '');
      const newDate = info.event.startStr;
      void taskService.update(taskId, { dueDate: newDate });
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingId) {
      updateEvent.mutate({
        id: editingId,
        data: {
          title: formData.title.trim(),
          startTime: formData.startTime,
          endTime: formData.endTime || null,
          allDay: formData.allDay,
          description: formData.description || null,
          recurrence: formData.recurrence,
        },
      });
    } else {
      createEvent.mutate({
        title: formData.title.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        allDay: formData.allDay,
        description: formData.description || undefined,
        recurrence: formData.recurrence,
      });
    }
    setShowForm(false);
  }

  function handleDelete() {
    if (editingId) {
      const isRecurring = eventService.isRecurringId(editingId);
      const message = isRecurring
        ? 'Delete this event? This is part of a recurring series.'
        : 'Delete this event?';
      if (!window.confirm(message)) return;
      deleteEvent.mutate(editingId);
      setShowForm(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Scope dialog for recurring events */}
      {showScopeDialog && (
        <EditScopeDialog onSelect={handleScopeSelect} onCancel={handleScopeCancel} />
      )}

      <div className="flex-1 p-4 overflow-auto">
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
            --fc-today-bg-color: rgba(59, 130, 246, 0.08);
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
          .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; }
          .fc .fc-event.task-done { opacity: 0.5; }
          .fc .fc-event.task-done .fc-event-title { text-decoration: line-through; }
        `}</style>

        {/* Show tasks toggle */}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={(e) => setShowTasks(e.target.checked)}
              className="rounded"
            />
            Show tasks
          </label>
        </div>

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
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          height="100%"
        />
      </div>

      {/* Event form panel */}
      {showForm && (
        <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
          <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              {editingId
                ? editScope === 'this'
                  ? 'Edit This Occurrence'
                  : 'Edit Event'
                : 'New Event'}
            </span>
            <button onClick={() => setShowForm(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="rounded"
              />
              <label className="text-xs text-[var(--color-text-secondary)]">All day</label>
            </div>

            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Start</label>
              <input
                type={formData.allDay ? 'date' : 'datetime-local'}
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
              />
            </div>

            {!formData.allDay && (
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block">End</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none resize-none"
              />
            </div>

            {/* Recurrence section — hide when editing single occurrence */}
            {editScope !== 'this' && (
              <RecurrenceForm
                recurrence={formData.recurrence}
                onChange={(r) => setFormData({ ...formData, recurrence: r })}
              />
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-md bg-[var(--color-danger)] bg-opacity-10 text-[var(--color-danger)] text-sm font-medium hover:bg-opacity-20 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Task detail panel */}
      {selectedTask && !showForm && (
        <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
          <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
              Task Details
            </span>
            <button onClick={() => setSelectedTask(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Title */}
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              {selectedTask.title}
            </h3>

            {/* Recurrence badge */}
            {selectedTask.recurrence && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent)]">
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

            {/* Status toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Status</span>
              <button
                onClick={() => void handleToggleTaskStatus(selectedTask)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
                style={{ color: selectedTask.status === 'done' ? '#22c55e' : 'var(--color-text-secondary)' }}
              >
                {selectedTask.status === 'done' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {getStatusLabel(selectedTask.status)}
              </button>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Priority</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  color: getPriorityColor(selectedTask.priority),
                  backgroundColor: `${getPriorityColor(selectedTask.priority)}18`,
                }}
              >
                {getPriorityLabel(selectedTask.priority)}
              </span>
            </div>

            {/* Due date */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Due Date</span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : '—'}
              </span>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div>
                <span className="text-xs text-[var(--color-text-muted)] block mb-1">Description</span>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Open in Tasks button */}
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs font-medium hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Open in Tasks
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
