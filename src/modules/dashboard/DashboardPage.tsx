import React, { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Calendar,
  FileText,
  Target,
  Plus,
  ArrowRight,
  Play,
  Square,
  Layers,
  Check,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Timer,
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
import { useTotalDueToday } from '@/modules/flashcards/hooks/useFlashcards';
import { SkeletonStatCard } from '@/shared/components/Skeleton';

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

const cardBase: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: '14px',
  boxShadow: 'var(--shadow-sm)',
  padding: '22px 24px',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
};

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  emoji?: string;
  label: string;
  badge?: string | number;
  action?: string;
  onAction?: () => void;
}

function SectionHeader({ emoji, label, badge, action, onAction }: SectionHeaderProps) {
  const [btnHovered, setBtnHovered] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {emoji && <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </span>
        {badge !== undefined && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              borderRadius: '10px',
              padding: '2px 8px',
              minWidth: '20px',
              textAlign: 'center',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: btnHovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '3px 6px',
            borderRadius: '6px',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
        >
          {action}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
  sub?: string;
}

function EmptyState({ message, sub }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        gap: '6px',
        color: 'var(--color-text-muted)',
      }}
    >
      <span style={{ fontSize: '22px' }}>{message}</span>
      {sub && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', opacity: 0.7 }}>{sub}</span>}
    </div>
  );
}

// ─── Hero Band ────────────────────────────────────────────────────────────────

interface HeroBandProps {
  now: Date;
  tasksDue: number;
  habitsTotal: number;
  eventsToday: number;
  userName?: string;
}

function HeroBand({ now, tasksDue, habitsTotal, eventsToday, userName = 'Devvyn' }: HeroBandProps) {
  const greeting = getGreeting();
  const clockStr = format(now, 'HH:mm');
  const dateStr = format(now, 'EEEE, MMMM d');

  const glanceParts: string[] = [];
  if (tasksDue > 0) glanceParts.push(`${tasksDue} task${tasksDue !== 1 ? 's' : ''} due`);
  if (habitsTotal > 0) glanceParts.push(`${habitsTotal} habit${habitsTotal !== 1 ? 's' : ''}`);
  if (eventsToday > 0) glanceParts.push(`${eventsToday} event${eventsToday !== 1 ? 's' : ''} today`);
  const glanceStr = glanceParts.length > 0 ? glanceParts.join(' · ') : 'Nothing scheduled — enjoy your day ✨';

  return (
    <div
      style={{
        borderRadius: '18px',
        border: '1px solid var(--color-border)',
        background:
          'radial-gradient(ellipse at 15% 50%, var(--color-accent-soft) 0%, transparent 65%), var(--color-bg-secondary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '32px 40px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Left: greeting + date + glance */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: '30px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: '0 0 4px',
            lineHeight: 1.2,
          }}
        >
          {greeting}, {userName} 👋
        </h1>
        <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
          {dateStr}
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: '5px 14px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'inline-block', flexShrink: 0 }} />
          {glanceStr}
        </div>
      </div>

      {/* Right: live clock */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', 'Cascadia Code', monospace",
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text-primary)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {clockStr}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {format(now, 'z')}
        </div>
      </div>
    </div>
  );
}

// ─── Premium Stat Cards ───────────────────────────────────────────────────────

interface PremiumStatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  accentColor: string;
  onClick?: () => void;
}

function PremiumStatCard({ icon, value, label, sub, accentColor, onClick }: PremiumStatCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardBase,
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        cursor: onClick ? 'pointer' : 'default',
        width: '100%',
        textAlign: 'left',
        borderLeft: `4px solid ${hovered ? accentColor : accentColor + '60'}`,
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        borderColor: hovered ? accentColor : 'var(--color-border)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: accentColor + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0,
          transition: 'background-color 0.2s',
        }}
      >
        {icon}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '30px',
            fontWeight: 700,
            lineHeight: 1.1,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', opacity: 0.75 }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Quick Capture ────────────────────────────────────────────────────────────

interface QuickCaptureProps {
  onSubmit: (value: string) => void;
}

function QuickCapture({ onSubmit }: QuickCaptureProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
    if (e.key === 'Escape') {
      setValue('');
      e.currentTarget.blur();
    }
  }

  function handleAdd() {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  }

  return (
    <div
      style={{
        borderRadius: '14px',
        padding: focused ? '2px' : '1px',
        background: focused
          ? 'linear-gradient(135deg, var(--color-accent), var(--color-success))'
          : 'var(--color-border)',
        marginBottom: '24px',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          gap: '12px',
        }}
      >
        <Plus size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Capture a thought, task, or idea…"
          style={{
            flex: 1,
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
          }}
        />
        <kbd
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: '5px',
            padding: '2px 6px',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          ⌘N
        </kbd>
        <button
          onClick={handleAdd}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            padding: '7px 18px',
            borderRadius: '20px',
            border: 'none',
            background: btnHovered
              ? 'linear-gradient(135deg, var(--color-accent-hover), var(--color-accent))'
              : 'linear-gradient(135deg, var(--color-accent), var(--color-success))',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: btnHovered ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Today's Tasks ────────────────────────────────────────────────────────────

const priorityDotColor: Record<number, string> = {
  0: 'transparent',
  1: 'var(--color-text-muted)',
  2: 'var(--color-warning)',
  3: 'var(--color-danger)',
  4: 'var(--color-danger)',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const map: Record<string, [string, string]> = {
    todo: ['var(--color-bg-tertiary)', 'var(--color-text-muted)'],
    in_progress: ['var(--color-accent-soft)', 'var(--color-accent)'],
    in_review: ['var(--color-warning-soft)', 'var(--color-warning)'],
    backlog: ['var(--color-bg-tertiary)', 'var(--color-text-muted)'],
    inbox: ['var(--color-bg-tertiary)', 'var(--color-text-muted)'],
    done: ['var(--color-success-soft)', 'var(--color-success)'],
  };
  const [bg, color] = map[status] ?? ['var(--color-bg-tertiary)', 'var(--color-text-muted)'];
  return {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    backgroundColor: bg,
    color,
    borderRadius: '5px',
    padding: '2px 6px',
    flexShrink: 0,
  };
};

interface TaskRowProps {
  task: Task;
  completing: boolean;
  onComplete: (e: React.MouseEvent) => void;
  onClick: () => void;
  isOverdue?: boolean;
  isCompleted?: boolean;
}

function TaskRow({ task, completing, onComplete, onClick, isOverdue, isCompleted }: TaskRowProps) {
  const [hovered, setHovered] = useState(false);
  const dotColor = priorityDotColor[task.priority] ?? 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '9px',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
        transition: 'background-color 0.12s',
        opacity: isCompleted ? 0.55 : 1,
      }}
    >
      {/* Priority dot */}
      <div
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          border: dotColor === 'transparent' ? '1.5px solid var(--color-border)' : 'none',
        }}
      />

      {/* Checkbox */}
      <button
        onClick={onComplete}
        disabled={completing || isCompleted}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: `2px solid ${isCompleted ? 'var(--color-success)' : (dotColor === 'transparent' ? 'var(--color-border)' : dotColor)}`,
          backgroundColor: isCompleted || completing ? 'var(--color-success)' : 'transparent',
          flexShrink: 0,
          cursor: isCompleted ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          if (!isCompleted) e.currentTarget.style.backgroundColor = 'var(--color-success-soft)';
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = isCompleted || completing ? 'var(--color-success)' : 'transparent';
        }}
        aria-label="Complete task"
      >
        {(completing || isCompleted) && <Check size={10} color="white" />}
      </button>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: '13.5px',
          color: isCompleted
            ? 'var(--color-text-muted)'
            : isOverdue
            ? 'var(--color-danger)'
            : 'var(--color-text-primary)',
          textDecoration: isCompleted ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {task.title}
      </span>

      {/* Status badge */}
      {!isCompleted && task.status !== 'todo' && (
        <span style={statusBadgeStyle(task.status)}>{task.status.replace('_', ' ')}</span>
      )}

      {/* Tag */}
      {task.tags.length > 0 && !isCompleted && (
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

interface TodaysTasksProps {
  activeTasks: Task[];
  completedTasks: Task[];
  onNavigate: () => void;
}

function TodaysTasks({ activeTasks, completedTasks, onNavigate }: TodaysTasksProps) {
  const updateTask = useUpdateTask();
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const overdue = activeTasks.filter((t) => t.dueDate != null && t.dueDate < todayStr);
  const dueToday = activeTasks.filter((t) => t.dueDate === todayStr);

  function handleComplete(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    setCompletingIds((s) => new Set(s).add(task.id));
    updateTask.mutate(
      { id: task.id, data: { status: 'done', completedAt: new Date().toISOString() } },
      {
        onSettled: () =>
          setCompletingIds((s) => {
            const n = new Set(s);
            n.delete(task.id);
            return n;
          }),
      }
    );
  }

  const totalCount = activeTasks.length;

  return (
    <div style={cardBase}>
      <SectionHeader
        emoji="📋"
        label="Today's Tasks"
        badge={totalCount}
        action="View all →"
        onAction={onNavigate}
      />

      {totalCount === 0 && completedTasks.length === 0 ? (
        <EmptyState message="Nothing due today 🎉" sub="You're all caught up — great work!" />
      ) : (
        <div>
          {overdue.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--color-danger)',
                  marginBottom: '4px',
                  paddingLeft: '27px',
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
                  onClick={onNavigate}
                  isOverdue
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
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    margin: '12px 0 4px',
                    paddingLeft: '27px',
                  }}
                >
                  Due Today
                </div>
              )}
              {dueToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  completing={completingIds.has(task.id)}
                  onComplete={(e) => handleComplete(task, e)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 500,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {completedTasks.length} completed
              </button>

              {showCompleted && (
                <div style={{ marginTop: '4px' }}>
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      completing={false}
                      onComplete={(e) => e.stopPropagation()}
                      onClick={onNavigate}
                      isCompleted
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Upcoming Events ──────────────────────────────────────────────────────────

interface EventRowProps {
  event: CalendarEvent;
}

function EventRow({ event }: EventRowProps) {
  const [hovered, setHovered] = useState(false);
  const timeStr = event.allDay ? 'All day' : format(parseISO(event.startTime), 'h:mm a');
  const eventColor = event.color ?? 'var(--color-accent)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '9px 10px',
        borderRadius: '9px',
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      {/* Colored left bar */}
      <div
        style={{
          width: '3px',
          height: '36px',
          borderRadius: '2px',
          backgroundColor: eventColor,
          flexShrink: 0,
        }}
      />
      {/* Time pill */}
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          backgroundColor: eventColor + '20',
          color: eventColor,
          borderRadius: '6px',
          padding: '3px 8px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {timeStr}
      </span>
      {/* Title */}
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
        {event.title}
      </span>
    </div>
  );
}

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onNavigate: () => void;
}

function UpcomingEvents({ events, onNavigate }: UpcomingEventsProps) {
  return (
    <div style={cardBase}>
      <SectionHeader
        emoji="📅"
        label="Upcoming Events"
        action="View calendar →"
        onAction={onNavigate}
      />
      {events.length === 0 ? (
        <EmptyState message="No events scheduled 🗓️" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Habits Today ─────────────────────────────────────────────────────────────

interface HabitCheckRowProps {
  habit: HabitWithStatus;
  onToggle: (e: React.MouseEvent) => void;
}

function HabitCheckRow({ habit, onToggle }: HabitCheckRowProps) {
  const [hovered, setHovered] = useState(false);
  const color = habit.color ?? 'var(--color-accent)';
  const icon = habit.icon ?? '✅';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '9px',
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
        transition: 'background-color 0.12s, opacity 0.2s',
        opacity: habit.isCompletedToday ? 0.6 : 1,
      }}
    >
      {/* Emoji icon */}
      <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>{icon}</span>

      {/* Name */}
      <span
        style={{
          flex: 1,
          fontSize: '13.5px',
          color: habit.isCompletedToday ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          textDecoration: habit.isCompletedToday ? 'line-through' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {habit.name}
      </span>

      {/* Streak badge */}
      {habit.streak > 1 && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-warning)',
            backgroundColor: 'var(--color-warning-soft)',
            borderRadius: '8px',
            padding: '2px 7px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          🔥 {habit.streak}
        </span>
      )}

      {/* Checkbox/checkmark */}
      <button
        onClick={onToggle}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: `2px solid ${habit.isCompletedToday ? 'var(--color-success)' : color}`,
          backgroundColor: habit.isCompletedToday ? 'var(--color-success)' : 'transparent',
          flexShrink: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          if (!habit.isCompletedToday) e.currentTarget.style.backgroundColor = 'var(--color-success-soft)';
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          e.currentTarget.style.backgroundColor = habit.isCompletedToday ? 'var(--color-success)' : 'transparent';
        }}
        aria-label={habit.isCompletedToday ? 'Uncheck habit' : 'Check habit'}
      >
        {habit.isCompletedToday && <Check size={12} color="white" />}
      </button>
    </div>
  );
}

interface HabitsTodayProps {
  habits: HabitWithStatus[];
  onNavigate: () => void;
}

function HabitsToday({ habits, onNavigate }: HabitsTodayProps) {
  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const completed = habits.filter((h) => h.isCompletedToday).length;
  const total = habits.length;

  function handleToggle(habit: HabitWithStatus, e: React.MouseEvent) {
    e.stopPropagation();
    if (habit.isCompletedToday) {
      uncheckIn.mutate({ habitId: habit.id, date: todayStr });
    } else {
      checkIn.mutate({ habitId: habit.id, date: todayStr });
    }
  }

  return (
    <div style={cardBase}>
      <SectionHeader
        emoji="🔄"
        label="Today's Habits"
        badge={total > 0 ? `${completed}/${total} done` : undefined}
        action="All habits →"
        onAction={onNavigate}
      />

      {total === 0 ? (
        <EmptyState message="No habits for today" sub="Set up habits to track your streaks" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {habits.map((habit) => (
            <HabitCheckRow key={habit.id} habit={habit} onToggle={(e) => handleToggle(habit, e)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recent Notes ─────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

function NoteCard({ note, onClick }: NoteCardProps) {
  const [hovered, setHovered] = useState(false);
  const icon = note.icon ?? '📄';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        borderRadius: '12px',
        width: '180px',
        minWidth: '180px',
        textAlign: 'left',
        cursor: 'pointer',
        border: '1px solid var(--color-border)',
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.4,
        }}
      >
        {note.title || 'Untitled'}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 'auto' }}>
        {relativeTime(note.updatedAt)}
      </span>
    </button>
  );
}

interface RecentNotesProps {
  notes: Note[];
  onNavigate: () => void;
  onOpenNote: (id: string) => void;
}

function RecentNotes({ notes, onNavigate, onOpenNote }: RecentNotesProps) {
  return (
    <div style={cardBase}>
      <SectionHeader
        emoji="📝"
        label="Recent Notes"
        action="Open notes →"
        onAction={onNavigate}
      />
      {notes.length === 0 ? (
        <EmptyState message="No notes yet" sub="Start writing your first note" />
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollbarWidth: 'none',
          }}
        >
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onClick={() => onOpenNote(note.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Timer Widget ─────────────────────────────────────────────────────────────

function TimerWidget() {
  const navigate = useNavigate();
  const timer = useTimerStore();
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!timer.isRunning) return;
    const id = setInterval(forceUpdate, 1000);
    return () => clearInterval(id);
  }, [timer.isRunning]);

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

  const statusColor = timer.isRunning ? 'var(--color-success)' : 'var(--color-text-muted)';

  return (
    <div style={cardBase}>
      <SectionHeader
        emoji="⏱️"
        label="Timer"
        action="Open timer →"
        onAction={() => navigate('/timer')}
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
            boxShadow: timer.isRunning ? `0 0 0 4px ${statusColor}30` : 'none',
            transition: 'all 0.3s',
          }}
        />

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: "'SF Mono', 'Fira Code', monospace",
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatSeconds(displaySecs)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {timer.isRunning
              ? timer.isPomodoroMode
                ? `${phaseLabel[timer.phase] ?? timer.phase} — Pomodoro #${timer.pomodoroCount + 1}`
                : 'Stopwatch running'
              : 'Timer idle'}
          </div>
        </div>

        <div style={{ flexShrink: 0 }}>
          {timer.isRunning ? (
            <button
              onClick={() => timer.stop()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                backgroundColor: 'var(--color-danger-soft)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-danger)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
                e.currentTarget.style.color = 'var(--color-danger)';
              }}
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
                borderRadius: '9px',
                backgroundColor: 'var(--color-accent)',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
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

  // ─── Data hooks ───────────────────────────────────────────────────────────────
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks();
  const { data: allNotes = [], isLoading: notesLoading } = useNotes({ isTrashed: false, isArchived: false });
  const { data: habitStatuses = [] } = useTodayStatus();
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();
  const { data: totalCardsDue = 0, isLoading: cardsLoading } = useTotalDueToday();

  // True while any of the four stat-card data sources is still loading
  const statsLoading = tasksLoading || notesLoading || projectsLoading || cardsLoading;

  const windowStart = startOfDay(now).toISOString();
  const windowEnd = addDays(now, 7).toISOString();
  const { data: upcomingEvents = [] } = useEvents(windowStart, windowEnd);

  // ─── Derived data ─────────────────────────────────────────────────────────────
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const tomorrowStart = addDays(startOfDay(now), 1).toISOString();

  // Active (non-done) tasks due today or overdue
  const activeFocusTasks = allTasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      t.dueDate != null &&
      t.dueDate <= todayStr
  );

  // Completed today
  const completedTodayTasks = allTasks.filter(
    (t) => t.status === 'done' && t.completedAt != null && t.completedAt >= todayStart
  );

  // Stat card: tasks done today count
  const tasksDoneToday = completedTodayTasks.length;

  // Active projects count
  const activeProjects = allProjects.filter((p) => p.status === 'active').length;

  // Notes this week
  const notesThisWeek = allNotes.filter((n) => new Date(n.createdAt) >= weekStart).length;

  // Recent notes (last 4)
  const recentNotes: Note[] = [...allNotes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);

  // Upcoming events: next 5, sorted
  const sortedEvents: CalendarEvent[] = [...upcomingEvents]
    .filter((ev) => ev.allDay || !isBefore(parseISO(ev.startTime), now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  // Today's events for glance
  const todayEventCount = upcomingEvents.filter(
    (ev) => ev.allDay || (ev.startTime >= todayStart && ev.startTime < tomorrowStart)
  ).length;

  // Quick capture handler
  const createTask = useCreateTask();
  function handleCapture(value: string) {
    createTask.mutate({
      title: value,
      dueDate: format(now, 'yyyy-MM-dd'),
      status: 'todo',
    });
  }

  const habitsTotal = habitStatuses.length;

  return (
    <div
      style={{
        padding: '28px 44px 64px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Hero Band ──────────────────────────────────────────────────────── */}
      <HeroBand
        now={now}
        tasksDue={activeFocusTasks.length}
        habitsTotal={habitsTotal}
        eventsToday={todayEventCount}
      />

      {/* ─── Stat Cards ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        {statsLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <PremiumStatCard
              icon={<CheckSquare size={20} />}
              value={activeFocusTasks.length}
              label="Tasks Due Today"
              sub={tasksDoneToday > 0 ? `${tasksDoneToday} completed today` : 'None completed yet'}
              accentColor="var(--color-accent)"
              onClick={() => navigate('/tasks')}
            />
            <PremiumStatCard
              icon={<FileText size={20} />}
              value={allNotes.length}
              label="Notes"
              sub={`${notesThisWeek} this week`}
              accentColor="var(--color-warning)"
              onClick={() => navigate('/notes')}
            />
            <PremiumStatCard
              icon={<Layers size={20} />}
              value={activeProjects}
              label="Active Projects"
              sub={`${allProjects.length} total`}
              accentColor="var(--color-success)"
              onClick={() => navigate('/projects')}
            />
            <PremiumStatCard
              icon={<Brain size={20} />}
              value={totalCardsDue}
              label="Cards Due"
              sub={totalCardsDue > 0 ? 'Review now →' : 'All caught up ✓'}
              accentColor="var(--color-danger)"
              onClick={() => navigate('/flashcards')}
            />
          </>
        )}
      </div>

      {/* ─── Quick Capture ───────────────────────────────────────────────────── */}
      <QuickCapture onSubmit={handleCapture} />

      {/* ─── Two-column layout ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left column — Tasks + Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TodaysTasks
            activeTasks={activeFocusTasks}
            completedTasks={completedTodayTasks}
            onNavigate={() => navigate('/tasks')}
          />
          <UpcomingEvents events={sortedEvents} onNavigate={() => navigate('/calendar')} />
        </div>

        {/* Right column — Habits + Notes + Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <HabitsToday habits={habitStatuses} onNavigate={() => navigate('/habits')} />
          <RecentNotes
            notes={recentNotes}
            onNavigate={() => navigate('/notes')}
            onOpenNote={(id) => navigate(`/notes/${id}`)}
          />
          <TimerWidget />
        </div>
      </div>
    </div>
  );
}
