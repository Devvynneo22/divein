import { useState, useMemo, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
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

// ─── Stats loader sub-component ───────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export function HabitsPage() {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  const { data: habitsWithStatus = [], isLoading } = useTodayStatus();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  const todayLabel = format(new Date(), 'EEEE, MMMM d');

  // Derive unique group names for autocomplete
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

  // Group habits by groupName
  const grouped = useMemo(() => {
    const map = new Map<string, HabitWithStatus[]>();
    for (const habit of habitsWithStatus) {
      const key = habit.groupName ?? '';
      const arr = map.get(key) ?? [];
      arr.push(habit);
      map.set(key, arr);
    }
    return map;
  }, [habitsWithStatus]);

  const groupKeys = useMemo(() => Array.from(grouped.keys()), [grouped]);

  function handleSelect(id: string) {
    const newId = selectedHabitId === id ? null : id;
    setSelectedHabitId(newId);
    if (newId) {
      const habit = habitsWithStatus.find((h) => h.id === newId);
      if (habit) setPanel({ mode: 'stats', habit });
    } else {
      setPanel(null);
    }
  }

  function handleEdit(habit: Habit) {
    setPanel({ mode: 'edit', habit });
  }

  function handleDelete(id: string) {
    if (selectedHabitId === id) {
      setSelectedHabitId(null);
      setPanel(null);
    }
    deleteHabit.mutate(id);
  }

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

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Habits</h1>
            <button
              onClick={() => setPanel({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Habit
            </button>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{todayLabel}</p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
              Loading...
            </div>
          ) : habitsWithStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="text-4xl">🌱</div>
              <div>
                <p className="text-[var(--color-text-secondary)] font-medium">No habits yet</p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1">
                  Start building your routine by adding your first habit.
                </p>
              </div>
              <button
                onClick={() => setPanel({ mode: 'create' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add your first habit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groupKeys.map((groupKey) => {
                const groupHabits = grouped.get(groupKey) ?? [];
                return (
                  <div key={groupKey}>
                    {/* Group header */}
                    {groupKey && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                          {groupKey}
                        </span>
                        <div className="flex-1 h-px bg-[var(--color-border)]" />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {groupHabits.map((habit) => (
                        <HabitItem
                          key={habit.id}
                          habit={habit}
                          isSelected={selectedHabitId === habit.id}
                          onSelect={() => handleSelect(habit.id)}
                          onEdit={() => handleEdit(habit)}
                          onDelete={() => handleDelete(habit.id)}
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

      {/* Side panel */}
      {panel && (
        <div className="w-80 border-l border-[var(--color-border)] flex flex-col h-full overflow-y-auto">
          <div className="p-6">
            {panel.mode === 'stats' && panel.habit ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {panel.habit.icon && (
                      <span className="text-xl">{panel.habit.icon}</span>
                    )}
                    <div>
                      <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                        {panel.habit.name}
                      </h2>
                      {panel.habit.groupName && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {panel.habit.groupName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPanel(null);
                      setSelectedHabitId(null);
                    }}
                    className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
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
                onCancel={() => setPanel(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
