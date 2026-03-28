import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from './hooks/useEvents';
import { X, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { CalendarEvent } from '@/shared/types/event';
import type { Task } from '@/shared/types/task';
import { taskService } from '@/shared/lib/taskService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 4: return '#ef4444'; // urgent - red
    case 3: return '#f59e0b'; // high - amber
    case 2: return '#3b82f6'; // medium - blue
    case 1: return '#9ca3af'; // low - gray
    default: return '#6366f1'; // indigo for no priority
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
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTasks, setShowTasks] = useState(true);

  // Map calendar events to FullCalendar format
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime ?? undefined,
    allDay: e.allDay,
    backgroundColor: e.color ?? 'var(--color-accent)',
    borderColor: e.color ?? 'var(--color-accent)',
    extendedProps: { type: 'event' as const, event: e },
  }));

  // Map tasks to FullCalendar events
  const taskEvents = tasks.map((t) => ({
    id: `task-${t.id}`,
    title: `✓ ${t.title}`,
    start: t.dueDate!,
    allDay: true,
    backgroundColor: t.status === 'done' ? '#22c55e' : getPriorityColor(t.priority),
    borderColor: t.status === 'done' ? '#22c55e' : getPriorityColor(t.priority),
    classNames: t.status === 'done' ? ['task-done'] : [],
    extendedProps: { type: 'task' as const, task: t },
  }));

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
    });
    setEditingId(null);
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
    setFormData({
      title: evt.title,
      startTime: evt.startTime.slice(0, 16),
      endTime: evt.endTime?.slice(0, 16) ?? '',
      allDay: evt.allDay,
      description: evt.description ?? '',
    });
    setEditingId(evt.id);
    setShowForm(true);
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
    // Update the selected task panel
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
        },
      });
    } else {
      createEvent.mutate({
        title: formData.title.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        allDay: formData.allDay,
        description: formData.description || undefined,
      });
    }
    setShowForm(false);
  }

  function handleDelete() {
    if (editingId) {
      deleteEvent.mutate(editingId);
      setShowForm(false);
    }
  }

  return (
    <div className="flex h-full">
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
              {editingId ? 'Edit Event' : 'New Event'}
            </span>
            <button onClick={() => setShowForm(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
