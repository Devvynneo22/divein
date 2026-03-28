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
  }, [store.isRunning]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handlePlayPause() {
    if (store.isRunning) {
      // Pause — just freeze the store (no service call until stop)
      useTimerStore.setState({ isRunning: false, _startEpoch: null });
    } else {
      if (store.currentEntryId) {
        // Resume existing entry
        store.resumeRun();
      } else {
        // Start a new entry
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
    if (store.isRunning) return; // don't switch mid-session
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

  const pomodoroDotsTotal = store.settings.longBreakAfter;
  const pomodoroDotsCompleted = store.pomodoroCount % store.settings.longBreakAfter;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-2xl font-bold">Timer</h1>
        </div>

        {/* ── Timer hero section ───────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 px-6 py-8">
          {/* Phase indicator */}
          {store.isPomodoroMode && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${
              store.phase === 'work'
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
            }`}>
              {store.phase === 'work' ? '🎯 Focus Time' : store.phase === 'short_break' ? '☕ Short Break' : '🌿 Long Break'}
            </div>
          )}

          {/* Big timer */}
          <TimerDisplay
            isPomodoroMode={store.isPomodoroMode}
            isRunning={store.isRunning}
            phase={store.phase}
            secondsElapsed={store.secondsElapsed}
            secondsRemaining={store.secondsRemaining}
            totalSeconds={totalSeconds}
          />

          {/* Pomodoro count dots */}
          {store.isPomodoroMode && (
            <div className="flex items-center gap-2">
              {Array.from({ length: pomodoroDotsTotal }).map((_, i) => (
                <span
                  key={i}
                  className="text-lg"
                  style={{
                    color:
                      i < pomodoroDotsCompleted
                        ? 'var(--color-accent)'
                        : 'var(--color-bg-tertiary)',
                  }}
                >
                  ●
                </span>
              ))}
              <span className="text-xs text-[var(--color-text-muted)] ml-1">
                {pomodoroDotsCompleted}/{pomodoroDotsTotal}
              </span>
            </div>
          )}

          {/* Controls */}
          <TimerControls
            isRunning={store.isRunning}
            isPomodoroMode={store.isPomodoroMode}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            onSkip={handleSkip}
            onModeChange={handleModeChange}
          />
        </div>

        {/* ── Session info ──────────────────────────────────────── */}
        <div className="px-6 pb-4">
          <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col gap-3">
            {/* Task selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                Link to task
              </label>
              <div className="relative" ref={taskDropdownRef}>
                {selectedTask ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <ListTodo size={14} className="shrink-0 text-[var(--color-accent)]" />
                    <span className="truncate flex-1">{selectedTask.title}</span>
                    <button
                      onClick={() => {
                        setSelectedTaskId(null);
                        setTaskSearch('');
                      }}
                      disabled={store.isRunning && !!store.currentEntryId}
                      className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
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
                      disabled={store.isRunning && !!store.currentEntryId}
                      placeholder="Search tasks… (optional)"
                      className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-50"
                    />
                    {taskDropdownOpen && filteredTasks.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-lg">
                        {filteredTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setTaskSearch('');
                              setTaskDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center gap-2"
                          >
                            <ListTodo size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                What are you working on?
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={store.isRunning && !!store.currentEntryId}
                placeholder="Describe your session…"
                className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* ── Pomodoro settings ─────────────────────────────────── */}
        {store.isPomodoroMode && (
          <div className="px-6 pb-4">
            <PomodoroSettings
              settings={store.settings}
              onChange={store.updateSettings}
            />
          </div>
        )}

        {/* ── Today's entries ───────────────────────────────────── */}
        <div className="px-6 pb-6 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <span />
            <button
              onClick={handleAddManualEntry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <Plus size={13} />
              Manual entry
            </button>
          </div>
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
