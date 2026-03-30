import { useEffect, useState, useRef } from 'react';
import { Plus, ListTodo, X } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import { useTimerStore } from '@/shared/stores/timerStore';
import {
  useTimeEntries,
  useTodayTotal,
  useStartTimer,
  useStopTimer,
  useCreateManualEntry,
  useDeleteEntry,
  useTasks,
} from './hooks/useTimer';
import { TimerDisplay } from './components/TimerDisplay';
import { TimerControls } from './components/TimerControls';
import { TimeEntryList } from './components/TimeEntryList';
import { PomodoroSettings } from './components/PomodoroSettings';
import type { PomodoroPhase } from '@/shared/types/timer';

function getPhaseTotalSeconds(
  phase: PomodoroPhase,
  workMin: number,
  shortBreakMin: number,
  longBreakMin: number,
): number {
  if (phase === 'work') return workMin * 60;
  if (phase === 'short_break') return shortBreakMin * 60;
  return longBreakMin * 60;
}

export function TimerPage() {
  const store = useTimerStore();
  const [description, setDescription] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const taskDropdownRef = useRef<HTMLDivElement>(null);

  // ─── Tasks for linking ──────────────────────────────────────────────────────
  const { data: tasks = [] } = useTasks();
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase()),
  );

  // Close task dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target as Node)) {
        setTaskDropdownOpen(false);
      }
    }
    if (taskDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [taskDropdownOpen]);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const { data: todayEntries = [], refetch: refetchEntries } = useTimeEntries(
    todayStart,
    todayEnd,
  );
  const { data: todayTotalSec = 0, refetch: refetchTotal } = useTodayTotal();

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const createManualEntry = useCreateManualEntry();
  const deleteEntry = useDeleteEntry();

  // ─── Tick interval — drives the real-time display ─────────────────────────
  useEffect(() => {
    if (!store.isRunning) return;
    const interval = setInterval(() => {
      store.tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [store.isRunning, store.tick]);

  // ─── Refetch entries/total when a timer stops ─────────────────────────────
  useEffect(() => {
    if (!store.isRunning) {
      void refetchEntries();
      void refetchTotal();
    }
  }, [store.isRunning, refetchEntries, refetchTotal]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function handlePlayPause() {
    if (store.isRunning) {
      useTimerStore.setState({ isRunning: false, _startEpoch: null });
    } else {
      if (store.currentEntryId) {
        store.resumeRun();
      } else {
        startTimer.mutate(
          {
            description: description.trim() || undefined,
            isPomodoro: store.isPomodoroMode,
            taskId: selectedTaskId ?? undefined,
          },
          {
            onSuccess: (entry) => {
              if (store.isPomodoroMode) {
                store.startPomodoro(entry.id);
              } else {
                store.startStopwatch(entry.id);
              }
            },
            onError: (err) => {
              console.error('Failed to start timer:', err);
            },
          },
        );
      }
    }
  }

  function handleStop() {
    const { currentEntryId } = store;
    if (currentEntryId) {
      stopTimer.mutate(currentEntryId, {
        onSuccess: () => {
          void refetchEntries();
          void refetchTotal();
        },
      });
    }
    store.stop();
    setDescription('');
    setSelectedTaskId(null);
  }

  function handleSkip() {
    store.skipPhase();
  }

  function handleModeChange(mode: 'stopwatch' | 'pomodoro') {
    if (store.isRunning) return;
    useTimerStore.setState({
      isPomodoroMode: mode === 'pomodoro',
      phase: 'work',
      secondsElapsed: 0,
      secondsRemaining: store.settings.workMin * 60,
      _baseElapsed: 0,
      _baseRemaining: store.settings.workMin * 60,
    });
  }

  function handleDeleteEntry(id: string) {
    deleteEntry.mutate(id, {
      onSuccess: () => {
        void refetchEntries();
        void refetchTotal();
      },
    });
  }

  function handleAddManualEntry() {
    const now = new Date();
    const startTime = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
    createManualEntry.mutate(
      {
        startTime,
        endTime: now.toISOString(),
        description: 'Manual entry',
        isPomodoro: false,
      },
      {
        onSuccess: () => {
          void refetchEntries();
          void refetchTotal();
        },
      },
    );
  }

  // ─── Derived display values ──────────────────────────────────────────────
  const totalSeconds = getPhaseTotalSeconds(
    store.phase,
    store.settings.workMin,
    store.settings.shortBreakMin,
    store.settings.longBreakMin,
  );

  const isSessionLocked = store.isRunning && !!store.currentEntryId;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════
          Left panel — Timer hero + controls + settings
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col overflow-y-auto"
        style={{ flex: '0 0 480px', minWidth: 0, borderRight: '1px solid var(--color-border)' }}
      >
        {/* Page header */}
        <div className="px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Timer
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {store.isPomodoroMode ? 'Pomodoro — stay focused, rest well' : 'Track your time freely'}
          </p>
        </div>

        {/* ── Timer ring hero ──────────────────────────────────────────────── */}
        <div
          className="flex flex-col items-center gap-6 px-6 py-8"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-bg-secondary) 0%, transparent 75%)',
          }}
        >
          <TimerDisplay
            isPomodoroMode={store.isPomodoroMode}
            isRunning={store.isRunning}
            phase={store.phase}
            secondsElapsed={store.secondsElapsed}
            secondsRemaining={store.secondsRemaining}
            totalSeconds={totalSeconds}
            pomodoroCount={store.pomodoroCount}
            longBreakAfter={store.settings.longBreakAfter}
          />

          <TimerControls
            isRunning={store.isRunning}
            isPomodoroMode={store.isPomodoroMode}
            phase={store.phase}
            hasActiveEntry={!!store.currentEntryId}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onSkip={handleSkip}
            onModeChange={handleModeChange}
          />
        </div>

        {/* ── Session label + task link ─────────────────────────────────────── */}
        <div className="px-5 pb-4">
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* "What are you working on?" description */}
            <div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSessionLocked}
                placeholder="What are you working on?"
                className="w-full text-sm font-medium bg-transparent focus:outline-none disabled:opacity-50"
                style={{
                  color: 'var(--color-text-primary)',
                  caretColor: 'var(--color-accent)',
                }}
              />
              {description === '' && !isSessionLocked && (
                <div
                  className="h-px mt-2"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />
              )}
            </div>

            {/* Task selector */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Link to task
              </label>
              <div className="relative" ref={taskDropdownRef}>
                {selectedTask ? (
                  <div
                    className="flex items-center gap-2 text-sm rounded-lg px-2.5 py-1.5"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <ListTodo size={13} className="shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <span className="truncate flex-1">{selectedTask.title}</span>
                    <button
                      onClick={() => {
                        setSelectedTaskId(null);
                        setTaskSearch('');
                      }}
                      disabled={isSessionLocked}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors disabled:opacity-50"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-muted)';
                      }}
                      title="Remove linked task"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={(e) => {
                        setTaskSearch(e.target.value);
                        if (!taskDropdownOpen) setTaskDropdownOpen(true);
                      }}
                      onFocus={() => setTaskDropdownOpen(true)}
                      disabled={isSessionLocked}
                      placeholder="Search tasks… (optional)"
                      className="w-full bg-transparent text-sm focus:outline-none disabled:opacity-50"
                      style={{
                        color: 'var(--color-text-primary)',
                      }}
                    />
                    {taskDropdownOpen && filteredTasks.length > 0 && (
                      <div
                        className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl"
                        style={{
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-bg-elevated)',
                          boxShadow: 'var(--shadow-popup)',
                        }}
                      >
                        {filteredTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setTaskSearch('');
                              setTaskDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                            style={{ color: 'var(--color-text-primary)' }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                'var(--color-bg-tertiary)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                'transparent';
                            }}
                          >
                            <ListTodo
                              size={13}
                              className="shrink-0"
                              style={{ color: 'var(--color-text-muted)' }}
                            />
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pomodoro settings ─────────────────────────────────────────────── */}
        {store.isPomodoroMode && (
          <div className="px-5 pb-6">
            <PomodoroSettings settings={store.settings} onChange={store.updateSettings} />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Right panel — Today's time entries
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Panel header */}
        <div
          className="px-6 pt-6 pb-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Today's Log
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              All time tracked today
            </p>
          </div>
          <button
            onClick={handleAddManualEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--color-bg-secondary)';
            }}
          >
            <Plus size={13} />
            Manual entry
          </button>
        </div>

        {/* Entry list — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TimeEntryList
            entries={todayEntries}
            todayTotalSec={todayTotalSec}
            onDelete={handleDeleteEntry}
          />
        </div>
      </div>
    </div>
  );
}
