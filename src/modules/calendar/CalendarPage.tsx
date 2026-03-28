import { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from './hooks/useEvents';
import { X } from 'lucide-react';
import type { CalendarEvent } from '@/shared/types/event';

export function CalendarPage() {
  const { data: events = [] } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    allDay: false,
    description: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Map to FullCalendar format
  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startTime,
    end: e.endTime ?? undefined,
    allDay: e.allDay,
    backgroundColor: e.color ?? 'var(--color-accent)',
    borderColor: e.color ?? 'var(--color-accent)',
    extendedProps: { event: e },
  }));

  function handleDateClick(info: { dateStr: string; allDay: boolean }) {
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

  function handleEventClick(info: { event: { id: string; extendedProps: { event: CalendarEvent } } }) {
    const evt = info.event.extendedProps.event;
    setFormData({
      title: evt.title,
      startTime: evt.startTime.slice(0, 16), // datetime-local format
      endTime: evt.endTime?.slice(0, 16) ?? '',
      allDay: evt.allDay,
      description: evt.description ?? '',
    });
    setEditingId(evt.id);
    setShowForm(true);
  }

  function handleEventDrop(info: { event: { id: string; startStr: string; endStr: string; allDay: boolean } }) {
    updateEvent.mutate({
      id: info.event.id,
      data: {
        startTime: info.event.startStr,
        endTime: info.event.endStr || null,
        allDay: info.event.allDay,
      },
    });
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
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={fcEvents}
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
    </div>
  );
}
