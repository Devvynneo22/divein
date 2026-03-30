import React, { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Calendar,
  FileText,
  Target,
  Clock,
  Plus,
  ArrowRight,
  Play,
  Square,
  Timer,
  Layers,
  Check,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import {
  format,
  formatDistanceToNow,
  startOfDay,
  startOfWeek,
  parseISO,
  isBefore,
  addDays,
} from 'date-fns';

import { useTasks, useUpdateTask, useCreateTask } from '@/modules/tasks/hooks/useTasks';
import { useNotes } from '@/modules/notes/hooks/useNotes';
import { useTodayStatus, useCheckIn, useUncheckIn } from '@/modules/habits/hooks/useHabits';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useEvents } from '@/modules/calendar/hooks/useEvents';

import type { Task } from '@/shared/types/task';
import type { Note } from '@/shared/types/note';
import type { HabitWithStatus } from '@/shared/types/habit';
import type { CalendarEvent } from '@/shared/types/event';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Shared design primitives ─────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-sm)',
  padding: '20px',
  transition: 'box-shadow 0.15s ease',
};

interface SectionHeaderProps {
  label: string;
  badge?: string | number;
  action?: string;
  onAction?: () => void;
  accentColor?: string;
}

function SectionHeader({ label, badge, action, onAction, accentColor = 'var(--color-accent)' }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '3px',
            height: '14px',
            backgroundColor: accentColor,
            borderRadius: '2px',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--color-text-muted)',
          }}
        >
          {label}
        </span>
        {badge !== undefined && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
              borderRadius: '10px',
              padding: '1px 7px',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          {action}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 16px',
        gap: '10px',
        color: 'var(--color-text-muted)',
      }}
    >
      <div style={{ opacity: 0.4 }}>{icon}</div>
      <span style={{ fontSize: '13px', textAlign: 'center' }}>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '4px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-soft)',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)')
          }
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ─── Quick Stats ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  onClick?: () => void;
}

function StatCard({ icon, value, label, color, onClick }: StatCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...card,
        padding: '18px 20px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        cursor: onClick ? 'pointer' : 'default',
        width: '100%',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {label}
        </div>
      </div>
    </button>
  );
}

// ─── Today's Focus widget ─────────────────────────────────────────────────────

interface TodaysFocusProps {
  tasks: Task[];
}

function TodaysFocus({ tasks }: TodaysFocusProps) {
  const navigate = useNavigate();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const [quickAdd, setQuickAdd] = useState('');
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  function handleComplete(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    setCompletingIds((s) => new Set(s).add(task.id));
    updateTask.mutate(
      { id: task.id, data: { status: 'done', completedAt: new Date().toISOString() } },
      { onSettled: () => setCompletingIds((s) => { const n = new Set(s); n.delete(task.id); return n; }) }
    );
  }

  function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && quickAdd.trim()) {
      createTask.mutate({
        title: quickAdd.trim(),
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'todo',
      });
      setQuickAdd('');
    }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < todayStr);
  const dueToday = tasks.filter((t) => t.dueDate === todayStr);

  const priorityColor: Record<number, string> = {
    0: 'var(--color-text-muted)',
    1: 'var(--color-text-muted)',
    2: 'var(--color-warning)',
    3: 'var(--color-danger)',
    4: 'var(--color-danger)',
  };

  return (
    <div style={card}>
      <SectionHeader
        label="Today's Focus"
        badge={tasks.length}
        action="All tasks"
        onAction={() => navigate('/tasks')}
        accentColor="var(--color-accent)"
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          message="All clear — nothing due today."
          actionLabel="+ New task"
          onAction={() => navigate('/tasks')}
        />
      ) : (
        <div>
          {overdue.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-danger)',
                  marginBottom: '4px',
                  paddingLeft: '4px',
                }}
              >
                Overdue
              </div>
              {overdue.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completing={completingIds.has(task.id)}
                  onComplete={(e) => handleComplete(task, e)}
                  onClick={() => navigate('/tasks')}
                  priorityColor={priorityColor}
                  overdue
                />
              ))}
            </div>
          )}

          {dueToday.length > 0 && (
            <div>
              {overdue.length > 0 && (
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    marginBottom: '4px',
                    marginTop: '8px',
                    paddingLeft: '4px',
                  }}
                >
                  Due today
                </div>
              )}
              {dueToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completing={completingIds.has(task.id)}
                  onComplete={(e) => handleComplete(task, e)}
                  onClick={() => navigate('/tasks')}
                  priorityColor={priorityColor}
                  overdue={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Quick Add */}
      <div style={{ marginTop: '12px', position: 'relative' }}>
        <Plus
          size={14}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder="Add task for today… (Enter)"
          style={{
            width: '100%',
            padding: '8px 10px 8px 30px',
            fontSize: '13px',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        />
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  completing: boolean;
  onComplete: (e: React.MouseEvent) => void;
  onClick: () => void;
  priorityColor: Record<number, string>;
  overdue: boolean;
}

function TaskRow({ task, completing, onComplete, onClick, priorityColor, overdue }: TaskRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <button
        onClick={onComplete}
        disabled={completing}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: `2px solid ${priorityColor[task.priority] ?? 'var(--color-border)'}`,
          backgroundColor: completing ? 'var(--color-success)' : 'transparent',
          flexShrink: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = 'var(--color-success-soft)';
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = completing ? 'var(--color-success)' : 'transparent';
        }}
        aria-label="Complete task"
      >
        {completing && <Check size={10} color="white" />}
      </button>
      <span
        style={{
          flex: 1,
          fontSize: '13.5px',
          color: overdue ? 'var(--color-danger)' : 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {task.title}
      </span>
      {task.tags.length > 0 && (
        <span
          style={{
            fontSize: '11px',
            padding: '1px 7px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {task.tags[0]}
        </span>
      )}
    </div>
  );
}

// ─── Recent Notes widget ──────────────────────────────────────────────────────

interface RecentNotesProps {
  notes: Note[];
}

function RecentNotes({ notes }: RecentNotesProps) {
  const navigate = useNavigate();

  return (
    <div style={card}>
      <SectionHeader
        label="Recent Notes"
        action="All notes"
        onAction={() => navigate('/notes')}
        accentColor="var(--color-warning)"
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          message="No notes yet. Start writing."
          actionLabel="New note"
          onAction={() => navigate('/notes')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onClick={() => navigate(`/notes/${note.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteRow({ note, onClick }: { note: Note; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const icon = note.icon ?? '📄';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 8px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        border: 'none',
        textAlign: 'left',
        width: '100%',
        transition: 'background-color 0.12s',
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          flex: 1,
          fontSize: '13.5px',
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {note.title || 'Untitled'}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
        {relativeTime(note.updatedAt)}
      </span>
    </button>
  );
}

// ─── Habit Ring widget ────────────────────────────────────────────────────────

interface HabitRingWidgetProps {
  habits: HabitWithStatus[];
}

function HabitRingWidget({ habits }: HabitRingWidgetProps) {
  const navigate = useNavigate();
  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const completed = habits.filter((h) => h.isCompletedToday).length;
  const total = habits.length;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = total > 0 ? circumference * (1 - completed / total) : circumference;

  function handleToggle(habit: HabitWithStatus, e: React.MouseEvent) {
    e.stopPropagation();
    if (habit.isCompletedToday) {
      uncheckIn.mutate({ habitId: habit.id, date: todayStr });
    } else {
      checkIn.mutate({ habitId: habit.id, date: todayStr });
    }
  }

  return (
    <div style={card}>
      <SectionHeader
        label="Habits"
        action="All habits"
        onAction={() => navigate('/habits')}
        accentColor="var(--color-success)"
      />

      {total === 0 ? (
        <EmptyState
          icon={<Target size={32} />}
          message="No habits tracked yet."
          actionLabel="Build habits"
          onAction={() => navigate('/habits')}
        />
      ) : (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          {/* Ring */}
          <div style={{ flexShrink: 0 }}>
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle
                cx="42"
                cy="42"
                r={radius}
                fill="none"
                stroke="var(--color-bg-tertiary)"
                strokeWidth="7"
              />
              <circle
                cx="42"
                cy="42"
                r={radius}
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 42 42)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              <text
                x="42"
                y="38"
                textAnchor="middle"
                fill="var(--color-text-primary)"
                fontSize="15"
                fontWeight="700"
              >
                {completed}/{total}
              </text>
              <text
                x="42"
                y="52"
                textAnchor="middle"
                fill="var(--color-text-muted)"
                fontSize="10"
              >
                done
              </text>
            </svg>
          </div>

          {/* Checklist */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {habits.slice(0, 5).map((habit) => (
              <HabitCheckRow
                key={habit.id}
                habit={habit}
                onToggle={(e) => handleToggle(habit, e)}
              />
            ))}
            {habits.length > 5 && (
              <button
                onClick={() => navigate('/habits')}
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '2px 0',
                }}
              >
                +{habits.length - 5} more
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HabitCheckRow({
  habit,
  onToggle,
}: {
  habit: HabitWithStatus;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = habit.color ?? 'var(--color-accent)';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 6px',
        borderRadius: '6px',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: `2px solid ${color}`,
          backgroundColor: habit.isCompletedToday ? color : 'transparent',
          flexShrink: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.15s',
        }}
        aria-label={habit.isCompletedToday ? 'Uncheck habit' : 'Check habit'}
      >
        {habit.isCompletedToday && <Check size={10} color="white" />}
      </button>
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          color: habit.isCompletedToday ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          textDecoration: habit.isCompletedToday ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {habit.name}
      </span>
      {habit.streak > 1 && (
        <span style={{ fontSize: '11px', color: 'var(--color-warning)' }}>🔥 {habit.streak}</span>
      )}
    </div>
  );
}

// ─── Upcoming Events widget ───────────────────────────────────────────────────

interface UpcomingEventsProps {
  events: CalendarEvent[];
}

function UpcomingEvents({ events }: UpcomingEventsProps) {
  const navigate = useNavigate();

  return (
    <div style={card}>
      <SectionHeader
        label="Upcoming"
        badge={events.length}
        action="Calendar"
        onAction={() => navigate('/calendar')}
        accentColor="var(--color-accent)"
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} />}
          message="Nothing coming up soon."
          actionLabel="Add event"
          onAction={() => navigate('/calendar')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const [hovered, setHovered] = useState(false);
  const timeStr = event.allDay
    ? 'All day'
    : format(parseISO(event.startTime), 'h:mm a');
  const eventColor = event.color ?? 'var(--color-accent)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 8px',
        borderRadius: '8px',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <div
        style={{
          width: '3px',
          alignSelf: 'stretch',
          backgroundColor: eventColor,
          borderRadius: '2px',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13.5px',
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {event.title}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
          {timeStr}
        </div>
      </div>
    </div>
  );
}

// ─── Timer widget ─────────────────────────────────────────────────────────────

function TimerWidget() {
  const navigate = useNavigate();
  const timer = useTimerStore();
  // Force re-render every second when timer is running
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!timer.isRunning) return;
    const id = setInterval(forceUpdate, 1000);
    return () => clearInterval(id);
  }, [timer.isRunning]);

  // Compute live display seconds from epoch to avoid drift
  const displaySecs = (() => {
    if (!timer.isRunning || timer._startEpoch === null) {
      return timer.isPomodoroMode ? timer.secondsRemaining : timer.secondsElapsed;
    }
    const delta = Math.round((Date.now() - timer._startEpoch) / 1000);
    if (timer.isPomodoroMode) {
      return Math.max(0, timer._baseRemaining - delta);
    }
    return timer._baseElapsed + delta;
  })();

  const phaseLabel: Record<string, string> = {
    work: 'Focus',
    short_break: 'Short Break',
    long_break: 'Long Break',
  };

  const isPomodoro = timer.isPomodoroMode;
  const statusColor = timer.isRunning ? 'var(--color-success)' : 'var(--color-text-muted)';

  return (
    <div style={card}>
      <SectionHeader
        label="Timer"
        action="Open timer"
        onAction={() => navigate('/timer')}
        accentColor="var(--color-accent)"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Status dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            flexShrink: 0,
            boxShadow: timer.isRunning ? `0 0 0 3px ${statusColor}30` : 'none',
            transition: 'all 0.3s',
          }}
        />

        <div style={{ flex: 1 }}>
          {/* Time display */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatSeconds(displaySecs)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {timer.isRunning
              ? isPomodoro
                ? `${phaseLabel[timer.phase] ?? timer.phase} — Pomodoro #${timer.pomodoroCount + 1}`
                : 'Stopwatch running'
              : 'Timer idle'}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {timer.isRunning ? (
            <button
              onClick={() => timer.stop()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-danger-soft)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-danger)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)')
              }
            >
              <Square size={13} />
              Stop
            </button>
          ) : (
            <button
              onClick={() => navigate('/timer')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = 'var(--color-accent)')
              }
            >
              <Play size={13} />
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main DashboardPage ───────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const now = useLiveClock();

  // ─── Data hooks ──────────────────────────────────────────────────────────────
  const { data: allTasks = [] } = useTasks();
  const { data: allNotes = [] } = useNotes({ isTrashed: false, isArchived: false });
  const { data: habitStatuses = [] } = useTodayStatus();
  const { data: allProjects = [] } = useProjects();

  // Events: from now to 7 days ahead
  const windowStart = startOfDay(now).toISOString();
  const windowEnd = addDays(now, 7).toISOString();
  const { data: upcomingEvents = [] } = useEvents(windowStart, windowEnd);

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  // Today's Focus: not done, due today or overdue
  const focusTasks = allTasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      t.dueDate != null &&
      t.dueDate <= todayStr
  );

  // Tasks done today
  const tasksDoneToday = allTasks.filter(
    (t) => t.completedAt != null && t.completedAt >= todayStart
  ).length;

  // Active projects
  const activeProjects = allProjects.filter((p) => p.status === 'active').length;

  // Max habit streak from today
  const maxStreak = habitStatuses.reduce((m, h) => Math.max(m, h.streak ?? 0), 0);

  // Notes created this week
  const notesThisWeek = allNotes.filter(
    (n) => new Date(n.createdAt) >= weekStart
  ).length;

  // Recent notes (last 5, not trashed)
  const recentNotes: Note[] = [...allNotes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  // Upcoming events: sorted by start, next 3
  const sortedEvents: CalendarEvent[] = [...upcomingEvents]
    .filter((ev) => !isBefore(parseISO(ev.startTime), now) || ev.allDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);

  return (
    <div
      style={{
        padding: '32px 48px 64px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Sparkles size={24} style={{ color: 'var(--color-warning)' }} />
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {getGreeting()}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            {format(now, 'EEEE, MMMM d, yyyy')}
          </span>
          <span
            style={{
              fontSize: '14px',
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {format(now, 'h:mm:ss a')}
          </span>
        </div>
      </div>

      {/* ─── Quick Stats row ─────────────────────────────────────────────────── */}
      <div
        className="dashboard-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          icon={<CheckSquare size={18} />}
          value={tasksDoneToday}
          label="Tasks done today"
          color="var(--color-accent)"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          icon={<Layers size={18} />}
          value={activeProjects}
          label="Active projects"
          color="var(--color-success)"
          onClick={() => navigate('/projects')}
        />
        <StatCard
          icon={<Target size={18} />}
          value={maxStreak > 0 ? `${maxStreak}d` : habitStatuses.filter((h) => h.isCompletedToday).length}
          label={maxStreak > 0 ? 'Best streak' : 'Habits done'}
          color="var(--color-warning)"
          onClick={() => navigate('/habits')}
        />
        <StatCard
          icon={<BookOpen size={18} />}
          value={notesThisWeek}
          label="Notes this week"
          color="var(--color-danger)"
          onClick={() => navigate('/notes')}
        />
      </div>

      {/* ─── Main two-column grid ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TodaysFocus tasks={focusTasks} />
          <UpcomingEvents events={sortedEvents} />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RecentNotes notes={recentNotes} />
          <HabitRingWidget habits={habitStatuses} />
          <TimerWidget />
        </div>
      </div>
    </div>
  );
}
