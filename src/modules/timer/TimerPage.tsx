import { useEffect, useState, useRef } from 'react';
import { X, ListTodo, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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
import { TimerControls, ModeSwitcher } from './components/TimerControls';
import { TimeEntryList } from './components/TimeEntryList';
import { PomodoroSettings } from './components/PomodoroSettings';
import { TimerReports } from './components/TimerReports';
import type { PomodoroPhase } from '@/shared/types/timer';

type PageTab = 'timer' | 'reports';

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
  const [pageTab, setPageTab] = useState<PageTab>('timer');
  const [description, setDescription] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const taskDropdownRef = useRef<HTMLDivElement>(null);

  // ─── Manual mode state ──────────────────────────────────────────────────────
  const [isManualMode, setIsManualMode] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDesc, setManualDesc] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [addManualHovered, setAddManualHovered] = useState(false);

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

  // All entries (unfiltered) for Reports tab
  const { data: allEntries = [] } = useTimeEntries();

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const createManualEntry = useCreateManualEntry();
  const deleteEntry = useDeleteEntry();

  // ─── Tick interval ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!store.isRunning) return;
    const interval = setInterval(() => {
      store.tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [store.isRunning, store.tick]);

  // ─── Refetch on stop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!store.isRunning) {
      void refetchEntries();
      void refetchTotal();
    }
  }, [store.isRunning, refetchEntries, refetchTotal]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
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

  function handleModeChange(mode: 'stopwatch' | 'pomodoro' | 'manual') {
    if (store.isRunning) return;
    if (mode === 'manual') {
      setIsManualMode(true);
      setShowManualForm(true);
      return;
    }
    setIsManualMode(false);
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

  function handleSubmitManualEntry() {
    if (!manualStart || !manualEnd) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startISO = new Date(`${todayStr}T${manualStart}:00`).toISOString();
    const endISO = new Date(`${todayStr}T${manualEnd}:00`).toISOString();

    createManualEntry.mutate(
      {
        startTime: startISO,
        endTime: endISO,
        description: manualDesc.trim() || undefined,
        isPomodoro: false,
      },
      {
        onSuccess: () => {
          void refetchEntries();
          void refetchTotal();
          setManualDesc('');
          setManualStart('');
          setManualEnd('');
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

  // ─── Tab bar items ────────────────────────────────────────────────────────
  const pageTabs: { id: PageTab; label: string }[] = [
    { id: 'timer', label: '⏱ Timer' },
    { id: 'reports', label: '📊 Reports' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Top-level tab bar ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '10px 24px 0',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {pageTabs.map((tab) => {
          const isActive = pageTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPageTab(tab.id)}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 400,
                border: 'none',
                borderBottom: isActive
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: -1,
                borderRadius: 0,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Reports tab ──────────────────────────────────────────────── */}
      {pageTab === 'reports' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TimerReports entries={allEntries} />
        </div>
      )}

      {/* ── Timer tab ────────────────────────────────────────────────── */}
      {pageTab === 'timer' && (
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
      {/* ════════════════════════════════════════════════════════════════
          LEFT PANEL — Timer focus area (~55%)
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '0 0 55%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 0',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            Timer
          </h1>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            {store.isPomodoroMode
              ? 'Pomodoro — stay focused, rest well'
              : isManualMode
                ? 'Log time manually'
                : 'Track your time freely'}
          </p>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 28px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* ── Mode switcher ─────────────────────────────────────────── */}
          <ModeSwitcher
            isPomodoroMode={store.isPomodoroMode}
            isManualMode={isManualMode}
            isRunning={store.isRunning}
            hasActiveEntry={!!store.currentEntryId}
            onModeChange={handleModeChange}
          />

          {/* ── Timer ring ────────────────────────────────────────────── */}
          {!isManualMode && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                background:
                  'radial-gradient(ellipse 90% 65% at 50% 10%, color-mix(in srgb, var(--color-bg-secondary) 80%, transparent) 0%, transparent 70%)',
                borderRadius: 24,
                padding: '16px 0',
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
            </div>
          )}

          {/* ── Task selector ─────────────────────────────────────────── */}
          {!isManualMode && (
            <div
              style={{
                width: '100%',
                maxWidth: 360,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: 10,
                  border: taskDropdownOpen
                    ? '1px solid var(--color-accent)'
                    : '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  boxShadow: taskDropdownOpen ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--shadow-sm)',
                  transition: 'all 0.15s ease',
                }}
                ref={taskDropdownRef}
              >
                {selectedTask ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                    }}
                  >
                    <ListTodo
                      size={14}
                      style={{ color: 'var(--color-accent)', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: '0.85rem',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selectedTask.title}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTaskId(null);
                        setTaskSearch('');
                      }}
                      disabled={isSessionLocked}
                      title="Clear linked task"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-muted)',
                        cursor: isSessionLocked ? 'not-allowed' : 'pointer',
                        opacity: isSessionLocked ? 0.4 : 1,
                        flexShrink: 0,
                        padding: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          'var(--color-text-muted)';
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '9px 12px',
                      gap: 8,
                    }}
                  >
                    <ListTodo
                      size={14}
                      style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                    />
                    <input
                      type="text"
                      value={taskSearch}
                      onChange={(e) => {
                        setTaskSearch(e.target.value);
                        if (!taskDropdownOpen) setTaskDropdownOpen(true);
                      }}
                      onFocus={() => setTaskDropdownOpen(true)}
                      disabled={isSessionLocked}
                      placeholder="Link to task (optional)"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-primary)',
                        cursor: isSessionLocked ? 'not-allowed' : 'text',
                        opacity: isSessionLocked ? 0.5 : 1,
                      }}
                    />
                  </div>
                )}

                {/* Floating task dropdown */}
                {taskDropdownOpen && filteredTasks.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 'calc(100% + 4px)',
                      zIndex: 30,
                      borderRadius: 10,
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-elevated)',
                      boxShadow: 'var(--shadow-popup)',
                      maxHeight: 200,
                      overflowY: 'auto',
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
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-primary)',
                          fontSize: '0.85rem',
                          transition: 'background-color 0.1s ease',
                        }}
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
                          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {task.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description input */}
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSessionLocked}
                  placeholder="What are you working on? (optional)"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.85rem',
                    color: 'var(--color-text-primary)',
                    cursor: isSessionLocked ? 'not-allowed' : 'text',
                    opacity: isSessionLocked ? 0.5 : 1,
                    borderRadius: 10,
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLInputElement).parentElement!.style.border =
                      '1px solid var(--color-accent)';
                    (e.currentTarget as HTMLInputElement).parentElement!.style.boxShadow =
                      '0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent)';
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).parentElement!.style.border =
                      '1px solid var(--color-border)';
                    (e.currentTarget as HTMLInputElement).parentElement!.style.boxShadow =
                      'var(--shadow-sm)';
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Controls ──────────────────────────────────────────────── */}
          {!isManualMode && (
            <TimerControls
              isRunning={store.isRunning}
              isPomodoroMode={store.isPomodoroMode}
              phase={store.phase}
              hasActiveEntry={!!store.currentEntryId}
              onPlayPause={handlePlayPause}
              onStop={handleStop}
              onSkip={handleSkip}
              onModeChange={(m) => handleModeChange(m)}
            />
          )}

          {/* ── Pomodoro settings (left panel, below controls) ─────────── */}
          {store.isPomodoroMode && !isManualMode && (
            <div style={{ width: '100%', maxWidth: 360 }}>
              <PomodoroSettings
                settings={store.settings}
                onChange={store.updateSettings}
              />
            </div>
          )}

          {/* ── Manual mode placeholder ────────────────────────────────── */}
          {isManualMode && (
            <div
              style={{
                width: '100%',
                maxWidth: 380,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: '3rem' }}>✍️</span>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Use the form on the right to log time manually.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          RIGHT PANEL — Today's log + settings
      ════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Today's Log
            </h2>

            {/* Toggle manual form */}
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              onMouseEnter={() => setAddManualHovered(true)}
              onMouseLeave={() => setAddManualHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 500,
                border: '1px solid var(--color-border)',
                backgroundColor: addManualHovered
                  ? 'var(--color-bg-tertiary)'
                  : 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {showManualForm ? (
                <>
                  <ChevronUp size={13} />
                  Hide
                </>
              ) : (
                <>
                  <Plus size={13} />
                  Add manual entry
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable right content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Entry list */}
          <TimeEntryList
            entries={todayEntries}
            todayTotalSec={todayTotalSec}
            onDelete={handleDeleteEntry}
            onStartTimer={handlePlayPause}
          />

          {/* ── Manual entry inline form ───────────────────────────────── */}
          {showManualForm && (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              {/* Form header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>✍️</span>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Add Manual Entry
                </span>
              </div>

              {/* Form body */}
              <div
                style={{
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Description */}
                <input
                  type="text"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Description (optional)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                />

                {/* Time inputs */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Start
                    </label>
                    <input
                      type="time"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontVariantNumeric: 'tabular-nums',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      End
                    </label>
                    <input
                      type="time"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontVariantNumeric: 'tabular-nums',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                      }}
                    />
                  </div>
                </div>

                {/* Add button */}
                <button
                  onClick={handleSubmitManualEntry}
                  disabled={!manualStart || !manualEnd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 0',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor:
                      !manualStart || !manualEnd
                        ? 'var(--color-bg-tertiary)'
                        : 'var(--color-accent)',
                    color:
                      !manualStart || !manualEnd ? 'var(--color-text-muted)' : '#fff',
                    cursor: !manualStart || !manualEnd ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (manualStart && manualEnd) {
                      (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.filter = 'none';
                  }}
                >
                  <Plus size={15} />
                  Add Entry
                </button>
              </div>
            </div>
          )}

          {/* ── Pomodoro settings in right panel (non-Pomodoro mode) ──── */}
          {!store.isPomodoroMode && !isManualMode && (
            <PomodoroSettings
              settings={store.settings}
              onChange={store.updateSettings}
            />
          )}
        </div>
      </div>
      </div>
      )} {/* end timer tab */}
    </div>
  );
}
