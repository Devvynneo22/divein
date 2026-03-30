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
import { habitService } from '@/shared/lib/habitService';
import { HabitItem } from './components/HabitItem';
import { HabitForm } from './components/HabitForm';
import { HabitStats } from './components/HabitStats';
import type { Habit, CreateHabitInput, UpdateHabitInput, HabitWithStatus } from '@/shared/types/habit';
import { useQuery } from '@tanstack/react-query';

// ─── Panel state ─────────────────────────────────────────────────────────────

type PanelMode = 'create' | 'edit' | 'stats';

interface PanelState {
  mode: PanelMode;
  habit?: Habit;
}

// ─── Stats loader ─────────────────────────────────────────────────────────────

interface StatsLoaderProps {
  habit: Habit;
}

function StatsLoader({ habit }: StatsLoaderProps) {
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

// ─── Overall progress bar ──────────────────────────────────────────────────────

function OverallProgress({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const accentColor = pct === 100 ? 'var(--color-success)' : 'var(--color-accent)';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {completed} <span style={{ color: 'var(--color-text-muted)' }}>/ {total} completed</span>
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: accentColor }}
        >
          {pct === 100 ? '🎉 All done!' : `${pct}%`}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function HabitsPage() {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  const { data: habitsWithStatus = [], isLoading } = useTodayStatus();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  const todayLabel = format(new Date(), 'EEEE, MMMM d');

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

  // Sort: incomplete first, completed to bottom
  const sortedHabits = useMemo(() => {
    return [...habitsWithStatus].sort((a, b) => {
      if (a.isCompletedToday === b.isCompletedToday) return 0;
      return a.isCompletedToday ? 1 : -1;
    });
  }, [habitsWithStatus]);

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

  const groupKeys = useMemo(() => Array.from(grouped.keys()), [grouped]);

  const completedCount = useMemo(
    () => habitsWithStatus.filter((h) => h.isCompletedToday).length,
    [habitsWithStatus],
  );

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
      deleteHabit.mutate(id);
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
          onSuccess: () => setPanel(null),
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
      {/* Main list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div
          className="px-8 py-6 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Today's Habits
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {todayLabel}
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
            >
              <Plus size={16} />
              New Habit
            </button>
          </div>

          {/* Overall progress bar */}
          {habitsWithStatus.length > 0 && (
            <OverallProgress total={habitsWithStatus.length} completed={completedCount} />
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <div className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Loading...
            </div>
          ) : habitsWithStatus.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <div className="text-6xl">🌱</div>
              <div>
                <p className="text-xl font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Build your first habit
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Small, consistent actions compound into big results.
                  <br />Start with something you can do every day.
                </p>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ backgroundColor: 'var(--color-accent)', boxShadow: 'var(--shadow-md)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                <Plus size={18} />
                Add your first habit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Ungrouped or grouped habits */}
              {groupKeys.map((groupKey) => {
                const groupHabits = grouped.get(groupKey) ?? [];
                return (
                  <div key={groupKey}>
                    {/* Group header */}
                    {groupKey && (
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {groupKey}
                        </span>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
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

              {/* Completed section divider (when some habits are done) */}
              {completedCount > 0 && completedCount < habitsWithStatus.length && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    ✓ Completed today
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side panel */}
      {panel && (
        <div
          className="flex flex-col h-full overflow-y-auto flex-shrink-0"
          style={{
            width: '22rem',
            borderLeft: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-popup)',
          }}
        >
          <div className="p-6">
            {panel.mode === 'stats' && panel.habit ? (
              <>
                {/* Stats panel header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {panel.habit.icon ? (
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${panel.habit.color ?? 'var(--color-accent)'}22` }}
                      >
                        {panel.habit.icon}
                      </span>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${panel.habit.color ?? 'var(--color-accent)'}22` }}
                      >
                        <BarChart2 size={18} style={{ color: panel.habit.color ?? 'var(--color-accent)' }} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {panel.habit.name}
                      </h2>
                      {panel.habit.groupName && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {panel.habit.groupName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closePanel}
                    className="p-1.5 rounded-md transition-colors flex-shrink-0"
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
                <StatsLoader habit={panel.habit} />
              </>
            ) : (
              <HabitForm
                habit={panel.mode === 'edit' ? panel.habit : undefined}
                existingGroups={existingGroups}
                onSave={handleSave}
                onCancel={closePanel}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
