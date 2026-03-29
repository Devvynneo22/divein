import { useState } from 'react';
import { CheckSquare, Calendar, Target, BookOpen, Plus, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCreateTask } from '@/modules/tasks/hooks/useTasks';
import { taskService } from '@/shared/lib/taskService';
import { eventService } from '@/shared/lib/eventService';
import { habitService } from '@/shared/lib/habitService';
import { flashcardService } from '@/shared/lib/flashcardService';
import { timerService } from '@/shared/lib/timerService';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { Task } from '@/shared/types/task';
import type { CalendarEvent } from '@/shared/types/event';
import type { HabitWithStatus } from '@/shared/types/habit';

function useTasksDueToday() {
  return useQuery({
    queryKey: ['tasks', 'dashboard', 'dueToday'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const tasks = await taskService.list();
      return tasks.filter(
        (t) =>
          t.status !== 'done' &&
          t.status !== 'cancelled' &&
          t.dueDate &&
          t.dueDate.startsWith(today)
      );
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function useTodayEvents() {
  return useQuery({
    queryKey: ['events', 'dashboard', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      return eventService.list(start, end);
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function useHabitStatus() {
  return useQuery({
    queryKey: ['habits', 'dashboard', 'todayStatus'],
    queryFn: () => habitService.getTodayStatus(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function useDueCards() {
  return useQuery({
    queryKey: ['flashcard-due-total', 'dashboard'],
    queryFn: () => flashcardService.getTotalDueToday(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function useTodayTime() {
  return useQuery({
    queryKey: ['timeEntries', 'todayTotal', 'dashboard'],
    queryFn: () => timerService.getTodayTotal(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const createTask = useCreateTask();

  const { data: tasksDue = [], isError: tasksError } = useTasksDueToday();
  const { data: todayEvents = [], isError: eventsError } = useTodayEvents();
  const { data: habitStatus = [], isError: habitsError } = useHabitStatus();
  const { data: dueCards = 0, isError: cardsError } = useDueCards();
  const { data: todayTime = 0, isError: timeError } = useTodayTime();

  const hasError = tasksError || eventsError || habitsError || cardsError || timeError;

  const habitsCompleted = habitStatus.filter((h) => h.isCompletedToday).length;
  const habitsTotal = habitStatus.length;

  function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && quickAddTitle.trim()) {
      createTask.mutate({
        title: quickAddTitle.trim(),
        dueDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setQuickAddTitle('');
    }
  }

  function formatTimeTotal(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles size={28} style={{ color: 'var(--color-warning)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {getGreeting()}
          </h1>
        </div>
        <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — Here&apos;s what&apos;s on your plate today.
        </p>
      </div>

      {hasError && (
        <div
          className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
          }}
        >
          Some data couldn&apos;t be loaded. Try refreshing the page.
        </div>
      )}

      {/* ─── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<CheckSquare size={20} />}
          label="Tasks due"
          value={String(tasksDue.length)}
          color="var(--color-accent)"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Events today"
          value={String(todayEvents.length)}
          color="var(--color-success)"
          onClick={() => navigate('/calendar')}
        />
        <StatCard
          icon={<Target size={20} />}
          label="Habits"
          value={`${habitsCompleted}/${habitsTotal}`}
          color="var(--color-warning)"
          onClick={() => navigate('/habits')}
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Cards to review"
          value={String(dueCards)}
          color="var(--color-danger)"
          onClick={() => navigate('/flashcards')}
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Time today"
          value={formatTimeTotal(todayTime)}
          color="var(--color-accent)"
          onClick={() => navigate('/timer')}
        />
      </div>

      {/* ─── Quick Capture ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="relative">
          <Plus
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder="Quick add a task for today... (press Enter)"
            className="input-base pl-11"
            style={{ padding: '12px 16px 12px 44px', fontSize: '0.9375rem' }}
          />
        </div>
      </div>

      {/* ─── Today sections ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Section
          title="Today's Tasks"
          count={tasksDue.length}
          onViewAll={() => navigate('/tasks')}
        >
          {tasksDue.length === 0 ? (
            <EmptyState message="No tasks due today. Add one above!" />
          ) : (
            <div className="space-y-1">
              {tasksDue.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} onClick={() => navigate('/tasks')} />
              ))}
              {tasksDue.length > 5 && (
                <button
                  onClick={() => navigate('/tasks')}
                  className="w-full text-sm py-2 transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  +{tasksDue.length - 5} more tasks
                </button>
              )}
            </div>
          )}
        </Section>

        <Section
          title="Today's Events"
          count={todayEvents.length}
          onViewAll={() => navigate('/calendar')}
        >
          {todayEvents.length === 0 ? (
            <EmptyState message="No events scheduled." />
          ) : (
            <div className="space-y-1">
              {todayEvents.slice(0, 5).map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
              {todayEvents.length > 5 && (
                <button
                  onClick={() => navigate('/calendar')}
                  className="w-full text-sm py-2 transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  +{todayEvents.length - 5} more events
                </button>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* ─── Habits ─────────────────────────────────────────────────── */}
      {habitStatus.length > 0 && (
        <Section
          title="Today's Habits"
          count={habitsCompleted}
          total={habitsTotal}
          onViewAll={() => navigate('/habits')}
        >
          <div className="space-y-1">
            {habitStatus.map((habit) => (
              <HabitRow key={habit.id} habit={habit} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card card-interactive flex items-center gap-4 p-5 text-left w-full group"
    >
      <div
        className="p-2.5 rounded-xl shrink-0"
        style={{ backgroundColor: color + '15', color }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </div>
      </div>
    </button>
  );
}

function Section({
  title,
  count,
  total,
  onViewAll,
  children,
}: {
  title: string;
  count?: number;
  total?: number;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          {count !== undefined && (
            <span
              className="text-sm font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
            >
              {total !== undefined ? `${count}/${total}` : count}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            View all <ArrowRight size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const priorityColors: Record<number, string> = {
    0: 'var(--color-text-muted)',
    1: 'var(--color-p4)',
    2: 'var(--color-p3)',
    3: 'var(--color-p2)',
    4: 'var(--color-p1)',
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-left"
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: priorityColors[task.priority] ?? 'var(--color-text-muted)' }}
      />
      <span className="text-sm truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
        {task.title}
      </span>
      {task.tags.length > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
        >
          {task.tags[0]}
        </span>
      )}
    </button>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const timeStr = event.allDay
    ? 'All day'
    : format(new Date(event.startTime), 'h:mm a');

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
      <span
        className="text-sm font-medium w-16 shrink-0"
        style={{ color: 'var(--color-accent)' }}
      >
        {timeStr}
      </span>
      <span className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
        {event.title}
      </span>
    </div>
  );
}

function HabitRow({ habit }: { habit: HabitWithStatus }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: habit.color ?? 'var(--color-accent)' }}
      />
      <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
        {habit.name}
      </span>
      {habit.isCompletedToday ? (
        <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>✓</span>
      ) : (
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>—</span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
      {message}
    </div>
  );
}
