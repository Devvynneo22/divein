import { useState } from 'react';
import { CheckSquare, Calendar, Target, BookOpen, Plus, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTasks, useCreateTask } from '@/modules/tasks/hooks/useTasks';
import { taskService } from '@/shared/lib/taskService';
import { eventService } from '@/shared/lib/eventService';
import { habitService } from '@/shared/lib/habitService';
import { flashcardService } from '@/shared/lib/flashcardService';
import { timerService } from '@/shared/lib/timerService';
import { format, startOfDay, endOfDay, isToday, isPast, isTomorrow } from 'date-fns';
import type { Task } from '@/shared/types/task';
import type { CalendarEvent } from '@/shared/types/event';
import type { HabitWithStatus } from '@/shared/types/habit';

function useTasksDueToday() {
  return useQuery({
    queryKey: ['dashboard', 'tasksDueToday'],
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
  });
}

function useTodayEvents() {
  return useQuery({
    queryKey: ['dashboard', 'todayEvents'],
    queryFn: async () => {
      const start = startOfDay(new Date()).toISOString();
      const end = endOfDay(new Date()).toISOString();
      return eventService.list(start, end);
    },
  });
}

function useHabitStatus() {
  return useQuery({
    queryKey: ['dashboard', 'habitStatus'],
    queryFn: () => habitService.getTodayStatus(),
  });
}

function useDueCards() {
  return useQuery({
    queryKey: ['dashboard', 'dueCards'],
    queryFn: () => flashcardService.getTotalDueToday(),
  });
}

function useTodayTime() {
  return useQuery({
    queryKey: ['dashboard', 'todayTime'],
    queryFn: () => timerService.getTodayTotal(),
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

  const { data: tasksDue = [] } = useTasksDueToday();
  const { data: todayEvents = [] } = useTodayEvents();
  const { data: habitStatus = [] } = useHabitStatus();
  const { data: dueCards = 0 } = useDueCards();
  const { data: todayTime = 0 } = useTodayTime();

  const habitsCompleted = habitStatus.filter((h) => h.isCompletedToday).length;
  const habitsTotal = habitStatus.length;

  function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && quickAddTitle.trim()) {
      createTask.mutate({
        title: quickAddTitle.trim(),
        dueDate: new Date().toISOString(),
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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
      <p className="text-[var(--color-text-muted)] mb-8 text-sm">
        {format(new Date(), 'EEEE, MMMM d, yyyy')} — Here&apos;s what&apos;s on your plate today.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          icon={<CheckSquare size={18} />}
          label="Tasks due"
          value={String(tasksDue.length)}
          color="var(--color-accent)"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          icon={<Calendar size={18} />}
          label="Events today"
          value={String(todayEvents.length)}
          color="var(--color-success)"
          onClick={() => navigate('/calendar')}
        />
        <StatCard
          icon={<Target size={18} />}
          label="Habits"
          value={`${habitsCompleted}/${habitsTotal}`}
          color="var(--color-warning)"
          onClick={() => navigate('/habits')}
        />
        <StatCard
          icon={<BookOpen size={18} />}
          label="Cards to review"
          value={String(dueCards)}
          color="var(--color-p1)"
          onClick={() => navigate('/flashcards')}
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Time today"
          value={formatTimeTotal(todayTime)}
          color="var(--color-p3)"
          onClick={() => navigate('/timer')}
        />
      </div>

      {/* Quick capture */}
      <div className="mb-8">
        <div className="relative">
          <Plus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            placeholder="Quick add a task for today... (press Enter)"
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </div>

      {/* Today sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Tasks */}
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
                  className="w-full text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] py-2 transition-colors"
                >
                  +{tasksDue.length - 5} more tasks
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Today's Events */}
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
                  className="w-full text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] py-2 transition-colors"
                >
                  +{todayEvents.length - 5} more events
                </button>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Habits quick view */}
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

// ─── Sub-components ─────────────────────────────────────────────────────────

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
      className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors text-left group"
    >
      <div className="p-2 rounded-md" style={{ backgroundColor: color + '20', color }}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
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
    <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">{title}</h2>
          {count !== undefined && (
            <span className="text-xs text-[var(--color-text-muted)]">
              {total !== undefined ? `${count}/${total}` : count}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
          >
            View all <ArrowRight size={12} />
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
      className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors text-left"
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: priorityColors[task.priority] ?? 'var(--color-text-muted)' }}
      />
      <span className="text-sm truncate flex-1 text-[var(--color-text-primary)]">
        {task.title}
      </span>
      {task.tags.length > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
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
    <div className="flex items-center gap-3 px-3 py-2 rounded-md">
      <span className="text-xs text-[var(--color-accent)] font-medium w-16 shrink-0">
        {timeStr}
      </span>
      <span className="text-sm truncate text-[var(--color-text-primary)]">
        {event.title}
      </span>
    </div>
  );
}

function HabitRow({ habit }: { habit: HabitWithStatus }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: habit.color ?? 'var(--color-accent)' }}
      />
      <span className="text-sm flex-1 truncate text-[var(--color-text-primary)]">
        {habit.name}
      </span>
      {habit.isCompletedToday ? (
        <span className="text-xs text-[var(--color-success)]">✓</span>
      ) : (
        <span className="text-xs text-[var(--color-text-muted)]">—</span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
      {message}
    </div>
  );
}
