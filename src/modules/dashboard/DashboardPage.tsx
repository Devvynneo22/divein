import React, { useState, useEffect, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalyticsPage } from '@/modules/analytics/AnalyticsPage';
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
  TrendingUp,
  TrendingDown,
  Flame,
  Clock,
  Activity,
  Minus,
  Zap,
} from 'lucide-react';
import {
  format,
  formatDistanceToNow,
  startOfDay,
  startOfWeek,
  endOfWeek,
  parseISO,
  isBefore,
  addDays,
  isToday,
  isTomorrow,
  differenceInMinutes,
  differenceInHours,
} from 'date-fns';

import { useTasks, useUpdateTask, useCreateTask } from '@/modules/tasks/hooks/useTasks';
import { useNotes } from '@/modules/notes/hooks/useNotes';
import { useTodayStatus, useCheckIn, useUncheckIn } from '@/modules/habits/hooks/useHabits';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useEvents } from '@/modules/calendar/hooks/useEvents';
import { useTotalDueToday } from '@/modules/flashcards/hooks/useFlashcards';
import { useSuggestionStore } from '@/shared/stores/suggestionStore';
import { SuggestionBanner } from '@/shared/components/SuggestionBanner';

import type { Task } from '@/shared/types/task';
import type { Note } from '@/shared/types/note';
import type { HabitWithStatus } from '@/shared/types/habit';
import type { CalendarEvent } from '@/shared/types/event';
import type { Project } from '@/shared/types/project';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function getTimeGradient(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 8) {
    // Sunrise: warm orange/pink
    return 'linear-gradient(135deg, #ff9a5c 0%, #ff6b9d 40%, #c75cff 100%)';
  } else if (h >= 8 && h < 16) {
    // Daylight: bright blue
    return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 60%, #a1ffce 100%)';
  } else if (h >= 16 && h < 19) {
    // Sunset: warm orange/purple
    return 'linear-gradient(135deg, #f7971e 0%, #ff4757 40%, #8e2de2 100%)';
  } else {
    // Night: deep blue/indigo
    return 'linear-gradient(135deg, #1a1a4e 0%, #2d3561 40%, #4a1942 100%)';
  }
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

function getEventRelativeLabel(event: CalendarEvent, now: Date): string {
  if (event.allDay) {
    const start = parseISO(event.startTime);
    if (isToday(start)) return 'Today';
    if (isTomorrow(start)) return 'Tomorrow';
    return format(start, 'EEE, MMM d');
  }
  const start = parseISO(event.startTime);
  if (isBefore(start, now)) return 'Now';
  const mins = differenceInMinutes(start, now);
  if (mins < 60) return `In ${mins}m`;
  const hrs = differenceInHours(start, now);
  if (hrs < 24) return `In ${hrs}h`;
  if (isTomorrow(start)) return `Tomorrow ${format(start, 'h:mm a')}`;
  return format(start, 'EEE, MMM d');
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Design primitives ────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: '14px',
  boxShadow: 'var(--shadow-sm)',
  padding: '22px 24px',
  transition: 'box-shadow 0.2s ease',
};

const priorityColors: Record<number, string> = {
  0: 'var(--color-text-muted)',
  1: 'var(--color-text-muted)',
  2: 'var(--color-warning)',
  3: 'var(--color-danger)',
  4: 'var(--color-danger)',
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
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {emoji && <span style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</span>}
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
        {badge !== undefined && (
          <span style={{
            fontSize: '11px', fontWeight: 600,
            backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)',
            borderRadius: '10px', padding: '2px 8px',
          }}>{badge}</span>
        )}
      </div>
      {action && onAction && (
        <button
          onClick={onAction}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '12px', color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '3px 6px', borderRadius: '6px', fontWeight: 500,
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

// ─── Time-based Gradient Accent Strip ─────────────────────────────────────────

function TimeGradientStrip() {
  const gradient = getTimeGradient();
  return (
    <div style={{
      height: '4px',
      borderRadius: '2px 2px 0 0',
      background: gradient,
      marginBottom: 0,
    }} />
  );
}

// ─── Hero Band ────────────────────────────────────────────────────────────────

interface HeroBandProps {
  now: Date;
  tasksDueToday: number;
  tasksCompletedToday: number;
}

function HeroBand({ now, tasksDueToday, tasksCompletedToday }: HeroBandProps) {
  const greeting = getGreeting();
  const clockStr = format(now, 'HH:mm');
  const dateStr = format(now, 'EEEE, MMMM d, yyyy');
  const gradient = getTimeGradient();

  const allDone = tasksDueToday === 0;
  const motivationalLine = allDone
    ? 'All caught up! 🎉'
    : `You have ${tasksDueToday} task${tasksDueToday !== 1 ? 's' : ''} today`;

  return (
    <div style={{
      borderRadius: '18px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
      marginBottom: '24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Gradient strip */}
      <div style={{ height: '5px', background: gradient }} />
      
      <div style={{
        background: 'var(--color-bg-elevated)',
        padding: '28px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '32px', fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: '0 0 6px', lineHeight: 1.2,
          }}>
            {greeting}, Devvyn 👋
          </h1>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            {dateStr}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            backgroundColor: allDone ? 'var(--color-success-soft)' : 'var(--color-accent-soft)',
            border: `1px solid ${allDone ? 'var(--color-success)' : 'var(--color-accent)'}`,
            borderRadius: '20px', padding: '5px 14px',
            fontSize: '13px',
            color: allDone ? 'var(--color-success)' : 'var(--color-accent)',
            fontWeight: 500,
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: allDone ? 'var(--color-success)' : 'var(--color-accent)',
              display: 'inline-block', flexShrink: 0,
            }} />
            {motivationalLine}
            {!allDone && tasksCompletedToday > 0 && (
              <span style={{ opacity: 0.8 }}>· {tasksCompletedToday} done ✓</span>
            )}
          </div>
        </div>

        {/* Right: clock */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '60px', fontWeight: 700,
            fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-text-primary)',
            lineHeight: 1, letterSpacing: '-0.02em',
          }}>
            {clockStr}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Capture ────────────────────────────────────────────────────────────

function QuickCapture({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);

  function submit() {
    if (value.trim()) { onSubmit(value.trim()); setValue(''); }
  }

  return (
    <div style={{
      borderRadius: '14px',
      padding: focused ? '2px' : '1px',
      background: focused
        ? 'linear-gradient(135deg, var(--color-accent), var(--color-success))'
        : 'var(--color-border)',
      marginBottom: '28px',
      transition: 'all 0.2s',
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderRadius: '12px',
        display: 'flex', alignItems: 'center',
        padding: '13px 16px', gap: '12px',
      }}>
        <Plus size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          type="text" value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') { setValue(''); e.currentTarget.blur(); }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Capture a task, thought, or idea… (Enter to add)"
          style={{
            flex: 1, fontSize: '14px',
            color: 'var(--color-text-primary)',
            backgroundColor: 'transparent', border: 'none', outline: 'none',
          }}
        />
        <button
          onClick={submit}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            padding: '7px 18px', borderRadius: '20px', border: 'none',
            background: btnHovered
              ? 'linear-gradient(135deg, var(--color-accent-hover), var(--color-accent))'
              : 'linear-gradient(135deg, var(--color-accent), var(--color-success))',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Today's Focus (Priority Tasks) ──────────────────────────────────────────

interface FocusTaskRowProps {
  task: Task;
  completing: boolean;
  onComplete: (e: React.MouseEvent) => void;
  onClick: () => void;
  projects: Project[];
  confettiId: string | null;
}

function FocusTaskRow({ task, completing, onComplete, onClick, projects, confettiId }: FocusTaskRowProps) {
  const [hovered, setHovered] = useState(false);
  const isDone = task.status === 'done';
  const dotColor = priorityColors[task.priority] ?? 'var(--color-text-muted)';
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const showConfetti = confettiId === task.id;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 10px', borderRadius: '9px',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
        opacity: isDone ? 0.55 : 1,
        position: 'relative',
      }}
    >
      {/* Priority dot */}
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        backgroundColor: task.priority === 0 ? 'transparent' : dotColor,
        border: task.priority === 0 ? '1.5px solid var(--color-border)' : 'none',
        flexShrink: 0,
      }} />

      {/* Checkbox */}
      <button
        onClick={onComplete}
        disabled={completing || isDone}
        style={{
          width: '18px', height: '18px', borderRadius: '50%',
          border: `2px solid ${isDone ? 'var(--color-success)' : dotColor}`,
          backgroundColor: isDone || completing ? 'var(--color-success)' : 'transparent',
          flexShrink: 0, cursor: isDone ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.stopPropagation(); if (!isDone) e.currentTarget.style.backgroundColor = 'var(--color-success-soft)'; }}
        onMouseLeave={(e) => { e.stopPropagation(); e.currentTarget.style.backgroundColor = isDone || completing ? 'var(--color-success)' : 'transparent'; }}
        aria-label="Complete task"
      >
        {(completing || isDone) && <Check size={10} color="white" />}
      </button>

      {/* Confetti burst */}
      {showConfetti && (
        <span style={{
          position: 'absolute', left: '28px', fontSize: '16px',
          animation: 'none', pointerEvents: 'none',
        }}>🎉</span>
      )}

      {/* Title */}
      <span style={{
        flex: 1, fontSize: '13.5px',
        color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        textDecoration: isDone ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        transition: 'text-decoration 0.2s',
      }}>
        {task.title}
      </span>

      {/* Due time */}
      {task.dueDate && !isDone && (
        <span style={{
          fontSize: '11px', color: 'var(--color-text-muted)',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {format(parseISO(task.dueDate), 'MMM d')}
        </span>
      )}

      {/* Project chip */}
      {project && !isDone && (
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
          backgroundColor: project.color ? project.color + '22' : 'var(--color-accent-soft)',
          color: project.color ?? 'var(--color-accent)',
          flexShrink: 0, maxWidth: '90px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {project.icon ? `${project.icon} ` : ''}{project.name}
        </span>
      )}
    </div>
  );
}

interface TodaysFocusProps {
  tasks: Task[];
  completedTasks: Task[];
  allTasks: Task[];
  projects: Project[];
  onNavigate: () => void;
}

function TodaysFocus({ tasks, completedTasks, allTasks, projects, onNavigate }: TodaysFocusProps) {
  const updateTask = useUpdateTask();
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [confettiId, setConfettiId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const totalToday = tasks.length + completedTasks.length;
  const doneCount = completedTasks.length;
  const progressPct = totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0;

  // Sort: priority desc, then due date
  const sorted = [...tasks].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return (a.dueDate ?? '').localeCompare(b.dueDate ?? '');
  });
  const visible = sorted.slice(0, 8);
  const hasMore = sorted.length > 8;

  function handleComplete(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    setCompletingIds((s) => new Set(s).add(task.id));
    setConfettiId(task.id);
    setTimeout(() => setConfettiId(null), 1500);
    updateTask.mutate(
      { id: task.id, data: { status: 'done', completedAt: new Date().toISOString() } },
      { onSettled: () => setCompletingIds((s) => { const n = new Set(s); n.delete(task.id); return n; }) }
    );
  }

  return (
    <div style={card}>
      <SectionHeader
        emoji="🎯"
        label="Today's Focus"
        badge={tasks.length}
        action={`View all ${allTasks.filter(t => t.status !== 'done').length} tasks →`}
        onAction={onNavigate}
      />

      {/* Progress bar */}
      {totalToday > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {doneCount} of {totalToday} completed
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: progressPct === 100 ? 'var(--color-success)' : 'var(--color-accent)' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{
            height: '6px', borderRadius: '3px',
            backgroundColor: 'var(--color-bg-tertiary)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '3px',
              background: progressPct === 100
                ? 'linear-gradient(90deg, var(--color-success), var(--color-accent))'
                : 'linear-gradient(90deg, var(--color-accent), var(--color-success))',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {tasks.length === 0 && completedTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>All caught up!</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>No tasks due today.</div>
        </div>
      ) : (
        <div>
          {visible.map((task) => (
            <FocusTaskRow
              key={task.id}
              task={task}
              completing={completingIds.has(task.id)}
              onComplete={(e) => handleComplete(task, e)}
              onClick={onNavigate}
              projects={projects}
              confettiId={confettiId}
            />
          ))}

          {hasMore && (
            <button
              onClick={onNavigate}
              style={{
                fontSize: '12px', color: 'var(--color-accent)',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 10px', borderRadius: '6px',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              + {sorted.length - 8} more tasks
            </button>
          )}

          {completedTasks.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', color: 'var(--color-text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 10px', borderRadius: '6px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {completedTasks.length} completed today
              </button>
              {showCompleted && completedTasks.map((task) => (
                <FocusTaskRow
                  key={task.id}
                  task={task}
                  completing={false}
                  onComplete={(e) => e.stopPropagation()}
                  onClick={onNavigate}
                  projects={projects}
                  confettiId={null}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Upcoming Events ──────────────────────────────────────────────────────────

// ─── Event Row ────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: CalendarEvent;
  now: Date;
}

function EventRow({ event: ev, now }: EventRowProps) {
  const [rowHovered, setRowHovered] = useState(false);
  const color = ev.color ?? 'var(--color-accent)';
  const timeStr = ev.allDay
    ? 'All day'
    : `${format(parseISO(ev.startTime), 'h:mm a')}${ev.endTime ? ` – ${format(parseISO(ev.endTime), 'h:mm a')}` : ''}`;
  const relLabel = getEventRelativeLabel(ev, now);

  return (
    <div
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '9px 10px', borderRadius: '9px',
        backgroundColor: rowHovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <div style={{ width: '3px', height: '38px', borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '90px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color, whiteSpace: 'nowrap' }}>{relLabel}</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{timeStr}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.title}
        </div>
        {ev.location && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
            📍 {ev.location}
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingEvents({ events, onNavigate }: { events: CalendarEvent[]; onNavigate: () => void }) {
  const now = new Date();

  return (
    <div style={card}>
      <SectionHeader emoji="📅" label="Upcoming Events" action="Calendar →" onAction={onNavigate} />
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🗓️</div>
          <div style={{ fontSize: '13px' }}>No upcoming events</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>Enjoy the free time!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Habit Check-in Strip ─────────────────────────────────────────────────────

interface HabitCircleProps {
  habit: HabitWithStatus;
  onToggle: () => void;
}

function HabitCircle({ habit, onToggle }: HabitCircleProps) {
  const [hovered, setHovered] = useState(false);
  const color = habit.color ?? 'var(--color-accent)';
  const icon = habit.icon ?? '✅';
  const isMeasurable = habit.unit != null;
  const progress = isMeasurable
    ? Math.min(1, (habit.todayEntry?.value ?? 0) / habit.target)
    : habit.isCompletedToday ? 1 : 0;

  const size = 56;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        cursor: 'pointer', flexShrink: 0, width: '68px',
        opacity: habit.isCompletedToday ? 0.75 : 1,
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.15s, opacity 0.2s',
      }}
      title={habit.name}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* SVG ring */}
        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="3"
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        {/* Icon */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '18px', lineHeight: 1,
          backgroundColor: habit.isCompletedToday ? color + '22' : 'var(--color-bg-tertiary)',
          width: '36px', height: '36px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background-color 0.2s',
        }}>
          {icon}
        </div>
        {/* Checkmark overlay */}
        {habit.isCompletedToday && (
          <div style={{
            position: 'absolute', bottom: '-2px', right: '-2px',
            width: '18px', height: '18px', borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-bg-elevated)',
          }}>
            <Check size={9} color="white" />
          </div>
        )}
      </div>
      {/* Name */}
      <span style={{
        fontSize: '10px', color: 'var(--color-text-muted)',
        textAlign: 'center', lineHeight: 1.2,
        overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', width: '100%',
      }}>
        {habit.name}
      </span>
      {/* Streak */}
      {habit.streak > 1 && (
        <span style={{
          fontSize: '10px', color: 'var(--color-warning)',
          fontWeight: 600, marginTop: '-4px',
        }}>
          🔥 {habit.streak}
        </span>
      )}
    </div>
  );
}

function HabitCheckInStrip({ habits, onNavigate }: { habits: HabitWithStatus[]; onNavigate: () => void }) {
  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const completed = habits.filter((h) => h.isCompletedToday).length;

  function handleToggle(habit: HabitWithStatus) {
    if (habit.isCompletedToday) {
      uncheckIn.mutate({ habitId: habit.id, date: todayStr });
    } else {
      checkIn.mutate({ habitId: habit.id, date: todayStr });
    }
  }

  return (
    <div style={card}>
      <SectionHeader
        emoji="🔄"
        label="Habit Check-in"
        badge={habits.length > 0 ? `${completed}/${habits.length}` : undefined}
        action="All habits →"
        onAction={onNavigate}
      />
      {habits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No habits set up yet
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: '12px', overflowX: 'auto',
          paddingBottom: '8px', scrollbarWidth: 'none',
        }}>
          {habits.map((habit) => (
            <HabitCircle key={habit.id} habit={habit} onToggle={() => handleToggle(habit)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Active Projects Snapshot ─────────────────────────────────────────────────

interface ProjectMiniCardProps {
  project: Project;
  tasks: Task[];
  onClick: () => void;
}

function ProjectMiniCard({ project, tasks, onClick }: ProjectMiniCardProps) {
  const [hovered, setHovered] = useState(false);
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const total = projectTasks.length;
  const done = projectTasks.filter((t) => t.status === 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = project.color ?? 'var(--color-accent)';

  const statusMap: Record<string, [string, string]> = {
    active: ['var(--color-success-soft)', 'var(--color-success)'],
    on_hold: ['var(--color-warning-soft)', 'var(--color-warning)'],
    completed: ['var(--color-accent-soft)', 'var(--color-accent)'],
    archived: ['var(--color-bg-tertiary)', 'var(--color-text-muted)'],
  };
  const [statusBg, statusColor] = statusMap[project.status] ?? ['var(--color-bg-tertiary)', 'var(--color-text-muted)'];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', textAlign: 'left', width: '100%',
        padding: '12px 14px', borderRadius: '10px',
        border: `1px solid ${hovered ? color : 'var(--color-border)'}`,
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>{project.icon ?? '📁'}</span>
        <span style={{
          flex: 1, fontSize: '13px', fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {project.name}
        </span>
        <span style={{
          fontSize: '10px', padding: '2px 7px', borderRadius: '8px',
          backgroundColor: statusBg, color: statusColor, fontWeight: 600,
          textTransform: 'capitalize', flexShrink: 0,
        }}>
          {project.status.replace('_', ' ')}
        </span>
      </div>
      {/* Progress */}
      <div style={{ marginTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{done}/{total} tasks</span>
          <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{pct}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: '2px',
            backgroundColor: color, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
    </button>
  );
}

function ActiveProjectsSnapshot({ projects, tasks, onNavigate, onProject }: {
  projects: Project[];
  tasks: Task[];
  onNavigate: () => void;
  onProject: (id: string) => void;
}) {
  const active = projects.filter((p) => p.status === 'active').slice(0, 4);

  return (
    <div style={card}>
      <SectionHeader
        emoji="🚀"
        label="Active Projects"
        badge={projects.filter((p) => p.status === 'active').length}
        action="View all →"
        onAction={onNavigate}
      />
      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No active projects
        </div>
      ) : (
        active.map((p) => (
          <ProjectMiniCard key={p.id} project={p} tasks={tasks} onClick={() => onProject(p.id)} />
        ))
      )}
    </div>
  );
}

// ─── Recent Notes ─────────────────────────────────────────────────────────────

// ─── Note Row ─────────────────────────────────────────────────────────────────

function NoteRow({ note, onNote }: { note: Note; onNote: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const snippet = note.contentText?.split('\n')[0]?.slice(0, 80) ?? '';
  return (
    <button
      onClick={() => onNote(note.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '9px 10px', borderRadius: '9px', textAlign: 'left',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        border: 'none', cursor: 'pointer', width: '100%',
        transition: 'background-color 0.12s',
      }}
    >
      <span style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
        {note.icon ?? '📄'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {note.title || 'Untitled'}
        </div>
        {snippet && (
          <div style={{
            fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {snippet}
          </div>
        )}
      </div>
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '2px' }}>
        {relativeTime(note.updatedAt)}
      </span>
    </button>
  );
}

function RecentNotes({ notes, onNavigate, onNote }: {
  notes: Note[];
  onNavigate: () => void;
  onNote: (id: string) => void;
}) {
  return (
    <div style={card}>
      <SectionHeader emoji="📝" label="Recent Notes" action="All notes →" onAction={onNavigate} />
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No notes yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} onNote={onNote} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Productivity Insights ────────────────────────────────────────────────────

interface InsightStatProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'flat';
  accentColor?: string;
}

function InsightStat({ icon, value, label, trend, accentColor = 'var(--color-accent)' }: InsightStatProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '12px', borderRadius: '10px',
      backgroundColor: 'var(--color-bg-tertiary)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: accentColor, display: 'flex', alignItems: 'center' }}>{icon}</span>
        {trend && (
          <span style={{
            color: trend === 'up' ? 'var(--color-success)' : trend === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center',
          }}>
            {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
          </span>
        )}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

interface ProductivityInsightsProps {
  tasksCompletedThisWeek: number;
  tasksCompletedLastWeek: number;
  longestStreak: number;
  focusHoursThisWeek: number;
  cardsDueToday: number;
}

function ProductivityInsights({
  tasksCompletedThisWeek,
  tasksCompletedLastWeek,
  longestStreak,
  focusHoursThisWeek,
  cardsDueToday,
}: ProductivityInsightsProps) {
  const taskTrend: 'up' | 'down' | 'flat' =
    tasksCompletedThisWeek > tasksCompletedLastWeek ? 'up'
    : tasksCompletedThisWeek < tasksCompletedLastWeek ? 'down'
    : 'flat';

  return (
    <div style={card}>
      <SectionHeader emoji="📊" label="Productivity Insights" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <InsightStat
          icon={<CheckSquare size={14} />}
          value={tasksCompletedThisWeek}
          label="Tasks this week"
          trend={taskTrend}
          accentColor="var(--color-accent)"
        />
        <InsightStat
          icon={<Flame size={14} />}
          value={longestStreak}
          label="Best streak"
          accentColor="var(--color-warning)"
        />
        <InsightStat
          icon={<Clock size={14} />}
          value={`${focusHoursThisWeek.toFixed(1)}h`}
          label="Focus this week"
          accentColor="var(--color-success)"
        />
        <InsightStat
          icon={<Brain size={14} />}
          value={cardsDueToday}
          label="Cards due today"
          accentColor="var(--color-danger)"
        />
      </div>
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
    return timer.isPomodoroMode
      ? Math.max(0, timer._baseRemaining - delta)
      : timer._baseElapsed + delta;
  })();

  const phaseLabel: Record<string, string> = {
    work: 'Focus', short_break: 'Short Break', long_break: 'Long Break',
  };

  return (
    <div style={card}>
      <SectionHeader emoji="⏱️" label="Timer" action="Open →" onAction={() => navigate('/timer')} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: timer.isRunning ? 'var(--color-success)' : 'var(--color-text-muted)',
          boxShadow: timer.isRunning ? '0 0 0 4px var(--color-success-soft)' : 'none',
          flexShrink: 0, transition: 'all 0.3s',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '26px', fontWeight: 700,
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
          }}>
            {formatSeconds(displaySecs)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '1px' }}>
            {timer.isRunning
              ? timer.isPomodoroMode
                ? `${phaseLabel[timer.phase] ?? timer.phase} — #${timer.pomodoroCount + 1}`
                : 'Stopwatch running'
              : 'Timer idle'}
          </div>
        </div>
        {timer.isRunning ? (
          <button
            onClick={() => timer.stop()}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px',
              backgroundColor: 'var(--color-danger-soft)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
          >
            <Square size={12} /> Stop
          </button>
        ) : (
          <button
            onClick={() => navigate('/timer')}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '7px 12px', borderRadius: '8px',
              backgroundColor: 'var(--color-accent)',
              border: 'none', color: '#fff', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            <Play size={12} /> Start
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  timestamp: string;
  icon: React.ReactNode;
  description: string;
  type: 'task' | 'note' | 'habit' | 'timer' | 'flashcard';
}

const activityTypeColor: Record<string, string> = {
  task: 'var(--color-accent)',
  note: 'var(--color-warning)',
  habit: 'var(--color-success)',
  timer: 'var(--color-danger)',
  flashcard: 'var(--color-p3)',
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const [hovered, setHovered] = useState(false);
  const color = activityTypeColor[item.type] ?? 'var(--color-accent)';
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 10px', borderRadius: '8px',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.12s',
      }}
    >
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        backgroundColor: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.description}
        </div>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
        {relativeTime(item.timestamp)}
      </span>
    </div>
  );
}

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div style={{ ...card, marginTop: '24px' }}>
        <SectionHeader emoji="⚡" label="Activity Timeline" />
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No activity yet today
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...card, marginTop: '24px' }}>
      <SectionHeader emoji="⚡" label="Activity Timeline" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Tab Bar ────────────────────────────────────────────────────────

type DashboardTab = 'day' | 'analytics';

function DashboardTabBar({
  active,
  onChange,
}: {
  active: DashboardTab;
  onChange: (t: DashboardTab) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginBottom: '24px',
      backgroundColor: 'var(--color-bg-tertiary)',
      borderRadius: '12px',
      padding: '4px',
      border: '1px solid var(--color-border)',
      width: 'fit-content',
    }}>
      {([
        { key: 'day', label: '📊 My Day' },
        { key: 'analytics', label: '📈 Analytics' },
      ] as { key: DashboardTab; label: string }[]).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '7px 18px',
            borderRadius: '9px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.15s',
            backgroundColor: active === key ? 'var(--color-bg-elevated)' : 'transparent',
            color: active === key ? 'var(--color-accent)' : 'var(--color-text-muted)',
            boxShadow: active === key ? 'var(--shadow-sm)' : 'none',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main DashboardPage ───────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const now = useLiveClock();
  const [dashTab, setDashTab] = useState<DashboardTab>('day');

  // ─── All hooks at top level ────────────────────────────────────────────────
  const { data: allTasks = [] } = useTasks();
  const { data: allNotes = [] } = useNotes({ isTrashed: false, isArchived: false });
  const { data: habitStatuses = [] } = useTodayStatus();
  const { data: allProjects = [] } = useProjects();
  const { data: totalCardsDue = 0 } = useTotalDueToday();
  const timer = useTimerStore();

  const windowStart = startOfDay(now).toISOString();
  const windowEnd = addDays(now, 2).toISOString();
  const { data: upcomingEvents = [] } = useEvents(windowStart, windowEnd);

  const createTask = useCreateTask();
  const generateSuggestions = useSuggestionStore((s) => s.generateSuggestions);

  // Generate suggestions on mount and when data changes
  useEffect(() => {
    if (allTasks.length > 0 || habitStatuses.length > 0) {
      generateSuggestions({
        tasks: allTasks,
        habits: habitStatuses,
        events: upcomingEvents,
        flashcardsDueToday: totalCardsDue,
        focusMinutesToday: Math.floor(timer.secondsElapsed / 60),
        projects: allProjects,
      });
    }
  }, [allTasks, habitStatuses, upcomingEvents, totalCardsDue, timer.secondsElapsed, allProjects, generateSuggestions]);

  // ─── Derived data ──────────────────────────────────────────────────────────
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayStart = startOfDay(now).toISOString();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);

  // Tasks due today or high priority (P3/P4) and not done
  const focusTasks = allTasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.status !== 'cancelled' &&
      (
        (t.dueDate != null && t.dueDate <= todayStr) ||
        t.priority >= 3
      )
  );

  // Completed today
  const completedTodayTasks = allTasks.filter(
    (t) => t.status === 'done' && t.completedAt != null && t.completedAt >= todayStart
  );

  // Recent notes (last 5)
  const recentNotes = [...allNotes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  // Upcoming events (next 5, not past)
  const sortedEvents = [...upcomingEvents]
    .filter((ev) => ev.allDay || !isBefore(parseISO(ev.startTime), now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  // Productivity insights
  const tasksCompletedThisWeek = allTasks.filter(
    (t) => t.status === 'done' && t.completedAt != null && t.completedAt >= weekStart.toISOString()
  ).length;

  const tasksCompletedLastWeek = allTasks.filter(
    (t) =>
      t.status === 'done' &&
      t.completedAt != null &&
      t.completedAt >= lastWeekStart.toISOString() &&
      t.completedAt <= lastWeekEnd.toISOString()
  ).length;

  const longestStreak = habitStatuses.reduce((max, h) => Math.max(max, h.streak), 0);

  // Focus hours this week from timer — use today's elapsed as a proxy for now
  // (Timer store doesn't persist weekly sessions, show current session)
  const focusHoursThisWeek = timer.secondsElapsed > 0
    ? Math.round(timer.secondsElapsed / 360) / 10
    : 0;

  // Activity timeline
  const activityItems: ActivityItem[] = [];

  // Completed tasks today
  completedTodayTasks.forEach((t) => {
    if (t.completedAt) {
      activityItems.push({
        id: `task-${t.id}`,
        timestamp: t.completedAt,
        icon: <Check size={13} />,
        description: `Completed "${t.title}"`,
        type: 'task',
      });
    }
  });

  // Notes created/updated today
  allNotes
    .filter((n) => n.updatedAt >= todayStart || n.createdAt >= todayStart)
    .forEach((n) => {
      const isNew = n.createdAt >= todayStart;
      activityItems.push({
        id: `note-${n.id}`,
        timestamp: n.updatedAt,
        icon: <FileText size={13} />,
        description: `${isNew ? 'Created' : 'Updated'} note "${n.title || 'Untitled'}"`,
        type: 'note',
      });
    });

  // Habit completions today
  habitStatuses
    .filter((h) => h.isCompletedToday && h.todayEntry)
    .forEach((h) => {
      activityItems.push({
        id: `habit-${h.id}`,
        timestamp: h.todayEntry!.createdAt,
        icon: <Zap size={13} />,
        description: `Checked in "${h.name}"${h.streak > 1 ? ` 🔥 ${h.streak} day streak` : ''}`,
        type: 'habit',
      });
    });

  // Sort by timestamp desc, take top 10
  activityItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const topActivity = activityItems.slice(0, 10);

  function handleCapture(value: string) {
    createTask.mutate({ title: value, dueDate: todayStr, status: 'todo' });
  }

  // Analytics tab
  if (dashTab === 'analytics') {
    return (
      <div style={{ minHeight: '100%' }}>
        <div style={{ padding: '32px 40px 0', maxWidth: '1440px', margin: '0 auto' }}>
          <DashboardTabBar active={dashTab} onChange={setDashTab} />
        </div>
        <AnalyticsPage />
      </div>
    );
  }

  return (
    <div style={{
      padding: '32px 40px 64px',
      maxWidth: '1440px',
      margin: '0 auto',
      minHeight: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Tab Bar */}
      <DashboardTabBar active={dashTab} onChange={setDashTab} />

      {/* Smart Suggestions */}
      <SuggestionBanner />

      {/* Hero */}
      <HeroBand
        now={now}
        tasksDueToday={focusTasks.length}
        tasksCompletedToday={completedTodayTasks.length}
      />

      {/* Quick Capture */}
      <QuickCapture onSubmit={handleCapture} />

      {/* 2-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60fr 40fr',
        gap: '20px',
        alignItems: 'start',
      }}>
        {/* ── Left Column (60%) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TodaysFocus
            tasks={focusTasks}
            completedTasks={completedTodayTasks}
            allTasks={allTasks}
            projects={allProjects}
            onNavigate={() => navigate('/tasks')}
          />
          <UpcomingEvents events={sortedEvents} onNavigate={() => navigate('/calendar')} />
          <HabitCheckInStrip habits={habitStatuses} onNavigate={() => navigate('/habits')} />
        </div>

        {/* ── Right Column (40%) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ActiveProjectsSnapshot
            projects={allProjects}
            tasks={allTasks}
            onNavigate={() => navigate('/projects')}
            onProject={(id) => navigate(`/projects/${id}`)}
          />
          <RecentNotes
            notes={recentNotes}
            onNavigate={() => navigate('/notes')}
            onNote={(id) => navigate(`/notes/${id}`)}
          />
          <ProductivityInsights
            tasksCompletedThisWeek={tasksCompletedThisWeek}
            tasksCompletedLastWeek={tasksCompletedLastWeek}
            longestStreak={longestStreak}
            focusHoursThisWeek={focusHoursThisWeek}
            cardsDueToday={totalCardsDue}
          />
          <TimerWidget />
        </div>
      </div>

      {/* Activity Timeline (full width) */}
      <ActivityTimeline items={topActivity} />
    </div>
  );
}
