import { useState, useMemo, useCallback } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  useTodayStatus,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useHabitEntries,
} from './hooks/useHabits';
import { toast } from '@/shared/stores/toastStore';
import { habitService } from '@/shared/lib/habitService';
import { HabitItem } from './components/HabitItem';
import { HabitForm } from './components/HabitForm';
import { HabitStats } from './components/HabitStats';
import type { Habit, CreateHabitInput, UpdateHabitInput, HabitWithStatus } from '@/shared/types/habit';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/shared/components/EmptyState';

// ─── Panel state ──────────────────────────────────────────────────────────────

type PanelMode = 'create' | 'edit' | 'stats';

interface PanelState {
  mode: PanelMode;
  habit?: Habit;
}

// ─── Filter type ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'completed';

// ─── Stats loader ─────────────────────────────────────────────────────────────

function StatsLoader({ habit }: { habit: Habit }) {
  const { data: entries = [] } = useHabitEntries(habit.id);

  const { data: streak = 0 } = useQuery({
    queryKey: ['habits', 'streak', habit.id],
    queryFn: () => habitService.getStreak(habit.id),
  });

  const { data: longestStreak = 0 } = useQuery({
    queryKey: ['habits', 'longestStreak', habit.id],
    queryFn: () => habitService.getLongestStreak(habit.id),
  });

  const { data: rate7 = 0 } = useQuery({
    queryKey: ['habits', 'rate', habit.id, 7],
    queryFn: () => habitService.getCompletionRate(habit.id, 7),
  });

  const { data: rate30 = 0 } = useQuery({
    queryKey: ['habits', 'rate', habit.id, 30],
    queryFn: () => habitService.getCompletionRate(habit.id, 30),
  });

  return (
    <HabitStats
      habit={habit}
      entries={entries}
      streak={streak}
      longestStreak={longestStreak}
      rate7={rate7}
      rate30={rate30}
    />
  );
}

// ─── Completion ring ──────────────────────────────────────────────────────────

function CompletionRing({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.min(completed / total, 1);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = pct === 1 ? 'var(--color-success)' : 'var(--color-accent)';

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <svg width={68} height={68} viewBox="0 0 68 68">
        {/* Track */}
        <circle
          cx={34}
          cy={34}
          r={r}
          fill="none"
          stroke="var(--color-bg-tertiary)"
          strokeWidth={7}
        />
        {/* Progress arc */}
        <circle
          cx={34}
          cy={34}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 34 34)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x={34}
          y={34}
          textAnchor="middle"
          dy="0.35em"
          style={{ fontSize: 14, fontWeight: 700, fill: color }}
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {completed}/{total}
      </span>
    </div>
  );
}

// ─── Top progress bar ─────────────────────────────────────────────────────────

function TopProgressBar({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const color = pct === 100 ? 'var(--color-success)' : 'var(--color-accent)';

  return (
    <div
      className="flex-shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Date row */}
      <div
        className="flex items-center justify-between px-8 pt-4 pb-2"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
            Today
          </span>
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-sm font-semibold" style={{ color }}>
              {pct === 100 ? '🎉 All done!' : `${completed}/${total} done`}
            </span>
          )}
        </div>
      </div>
      {/* Progress bar */}
      {total > 0 && (
        <div
          className="h-1"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <div
            className="h-full"
            style={{
              width: `${pct}%`,
              backgroundColor: color,
              transition: 'width 0.5s ease',
              borderRadius: '0 2px 2px 0',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Streak leaderboard ───────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];

function StreakLeaderboard({ habits }: { habits: HabitWithStatus[] }) {
  const top3 = useMemo(
    () =>
      [...habits]
        .filter((h) => h.streak > 0)
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 3),
    [habits],
  );

  if (top3.length === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span className="text-xs font-bold uppercase tracking-wide flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        🔥 Streaks
      </span>
      <div className="flex items-center gap-3 overflow-hidden">
        {top3.map((h, i) => (
          <div key={h.id} className="flex items-center gap-1.5 flex-shrink-0">
            <span style={{ fontSize: 14 }}>{MEDALS[i]}</span>
            <span className="text-xs truncate max-w-[5rem]" style={{ color: 'var(--color-text-secondary)' }}>
              {h.icon ? `${h.icon} ` : ''}{h.name}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: h.color ?? 'var(--color-accent)' }}
            >
              {h.streak}d
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed Today' },
];

function FilterTabs({
  active,
  onChange,
  counts,
}: {
  active: FilterTab;
  onChange: (f: FilterTab) => void;
  counts: Record<FilterTab, number>;
}) {
  return (
    <div className="flex items-center gap-0 flex-shrink-0" style={{ borderBottom: '2px solid var(--color-border)' }}>
      {FILTER_TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="relative px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0"
            style={{
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontSize: 10,
                }}
              >
                {counts[tab.key]}
              </span>
            )}
            {/* Underline indicator */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-sm"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  marginBottom: -2,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Group section header ─────────────────────────────────────────────────────

function GroupHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-1">
      <span
        className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-md flex-shrink-0"
        style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
          fontSize: 10,
        }}
      >
        {name}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function HabitsPage() {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const { data: habitsWithStatus = [], isLoading } = useTodayStatus();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  const existingGroups = useMemo(
    () =>
      Array.from(
        new Set(
          habitsWithStatus
            .map((h) => h.groupName)
            .filter((g): g is string => g !== null && g.length > 0),
        ),
      ),
    [habitsWithStatus],
  );

  const completedCount = useMemo(
    () => habitsWithStatus.filter((h) => h.isCompletedToday).length,
    [habitsWithStatus],
  );

  // Filter habits
  const filteredHabits = useMemo(() => {
    if (filter === 'active') return habitsWithStatus.filter((h) => !h.isCompletedToday);
    if (filter === 'completed') return habitsWithStatus.filter((h) => h.isCompletedToday);
    return habitsWithStatus;
  }, [habitsWithStatus, filter]);

  const filterCounts = useMemo(
    () => ({
      all: habitsWithStatus.length,
      active: habitsWithStatus.filter((h) => !h.isCompletedToday).length,
      completed: completedCount,
    }),
    [habitsWithStatus, completedCount],
  );

  // Sort within filtered: incomplete first
  const sortedHabits = useMemo(
    () =>
      [...filteredHabits].sort((a, b) => {
        if (a.isCompletedToday === b.isCompletedToday) return 0;
        return a.isCompletedToday ? 1 : -1;
      }),
    [filteredHabits],
  );

  // Group sorted habits by groupName
  const grouped = useMemo(() => {
    const map = new Map<string, HabitWithStatus[]>();
    for (const habit of sortedHabits) {
      const key = habit.groupName ?? '';
      const arr = map.get(key) ?? [];
      arr.push(habit);
      map.set(key, arr);
    }
    return map;
  }, [sortedHabits]);

  // Sort group keys: named groups first (alphabetically), then ungrouped ('') last
  const groupKeys = useMemo(() => {
    const keys = Array.from(grouped.keys());
    const named = keys.filter((k) => k !== '').sort();
    const hasUngrouped = keys.includes('');
    return hasUngrouped ? [...named, ''] : named;
  }, [grouped]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedHabitId((prev) => {
        const newId = prev === id ? null : id;
        if (newId) {
          const habit = habitsWithStatus.find((h) => h.id === newId);
          if (habit) setPanel({ mode: 'stats', habit });
        } else {
          setPanel(null);
        }
        return newId;
      });
    },
    [habitsWithStatus],
  );

  const handleEdit = useCallback((habit: Habit) => {
    setPanel({ mode: 'edit', habit });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('Delete this habit? All check-in history will be lost.')) return;
      setSelectedHabitId((prev) => {
        if (prev === id) {
          setPanel(null);
          return null;
        }
        return prev;
      });
      deleteHabit.mutate(id, {
        onSuccess: () => toast.success('Habit deleted'),
      });
    },
    [deleteHabit],
  );

  const handleSave = useCallback(
    (data: CreateHabitInput | UpdateHabitInput) => {
      if (panel?.mode === 'edit' && panel.habit) {
        updateHabit.mutate(
          { id: panel.habit.id, data: data as UpdateHabitInput },
          { onSuccess: () => setPanel(null) },
        );
      } else {
        createHabit.mutate(data as CreateHabitInput, {
          onSuccess: () => {
            setPanel(null);
            toast.success('Habit created');
          },
        });
      }
    },
    [panel, createHabit, updateHabit],
  );

  const openCreate = useCallback(() => setPanel({ mode: 'create' }), []);
  const closePanel = useCallback(() => {
    setPanel(null);
    setSelectedHabitId(null);
  }, []);

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top date + progress bar */}
        <TopProgressBar total={habitsWithStatus.length} completed={completedCount} />

        {/* Header row */}
        <div
          className="flex items-center justify-between px-8 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Habits
              </h1>
            </div>
            {/* Completion ring */}
            {habitsWithStatus.length > 0 && (
              <CompletionRing total={habitsWithStatus.length} completed={completedCount} />
            )}
          </div>

          {/* New Habit button — accent gradient */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150 flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)',
              boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(59,130,246,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(59,130,246,0.35)';
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            New Habit
          </button>
        </div>

        {/* Streak leaderboard */}
        {habitsWithStatus.length > 0 && (
          <div className="px-8 pt-4 flex-shrink-0">
            <StreakLeaderboard habits={habitsWithStatus} />
          </div>
        )}

        {/* Filter tabs */}
        {habitsWithStatus.length > 0 && (
          <div className="px-8 pt-3 flex-shrink-0">
            <FilterTabs active={filter} onChange={setFilter} counts={filterCounts} />
          </div>
        )}

        {/* ── Habit list ── */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl h-[76px] animate-pulse"
                  style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
                />
              ))}
            </div>
          ) : habitsWithStatus.length === 0 ? (
            /* Empty state */
            <EmptyState
              icon="🎯"
              title="Build better habits"
              description="Track daily habits and watch your streaks grow"
              actionLabel="Create Habit"
              onAction={openCreate}
            />
          ) : sortedHabits.length === 0 ? (
            /* Empty filter state */
            <div className="flex flex-col items-center py-16 gap-3">
              <span style={{ fontSize: 40 }}>
                {filter === 'completed' ? '⏳' : '✅'}
              </span>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {filter === 'completed'
                  ? 'No habits completed today yet.'
                  : 'All habits completed today! 🎉'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groupKeys.map((groupKey) => {
                const groupHabits = grouped.get(groupKey) ?? [];
                return (
                  <div key={groupKey ?? '__ungrouped__'} className="flex flex-col">
                    {/* Group header */}
                    <GroupHeader name={groupKey !== '' ? groupKey : 'Other'} />

                    <div className="flex flex-col gap-2 mt-1">
                      {groupHabits.map((habit) => (
                        <HabitItem
                          key={habit.id}
                          habit={habit}
                          isSelected={selectedHabitId === habit.id}
                          onSelect={handleSelect}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Side panel ── */}
      {panel && (
        <div
          className="flex flex-col h-full overflow-y-auto flex-shrink-0"
          style={{
            width: '23rem',
            borderLeft: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-popup)',
          }}
        >
          {panel.mode === 'stats' && panel.habit ? (
            <>
              {/* Stats panel header */}
              <div
                className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 sticky top-0 z-10"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {panel.habit.icon ? (
                    <span
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${panel.habit.color ?? 'var(--color-accent)'}22` }}
                    >
                      {panel.habit.icon}
                    </span>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${panel.habit.color ?? 'var(--color-accent)'}22` }}
                    >
                      <BarChart2 size={16} style={{ color: panel.habit.color ?? 'var(--color-accent)' }} />
                    </div>
                  )}
                  <h2 className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {panel.habit.name}
                  </h2>
                </div>
                <button
                  onClick={closePanel}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="p-6">
                <StatsLoader habit={panel.habit} />
              </div>
            </>
          ) : (
            <div className="p-6">
              <HabitForm
                habit={panel.mode === 'edit' ? panel.habit : undefined}
                existingGroups={existingGroups}
                onSave={handleSave}
                onCancel={closePanel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
