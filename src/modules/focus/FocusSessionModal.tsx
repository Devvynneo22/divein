import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusSessionStore } from '@/shared/stores/focusSessionStore';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useUpdateTask } from '@/modules/tasks/hooks/useTasks';
import { playWorkCompleteTone, playBreakCompleteTone } from '@/shared/lib/audioNotification';

// ─── Break Suggestions ────────────────────────────────────────────────────────

const BREAK_SUGGESTIONS = [
  'Stand up and stretch your arms 🙆',
  'Drink a full glass of water 💧',
  'Take 5 deep, slow breaths 🌬️',
  'Look out a window at something far away 👀',
  'Do a quick neck roll, left and right 🔄',
  'Step outside for fresh air if you can 🌿',
  'Roll your shoulders back 3 times 💪',
  'Close your eyes and rest them for a moment 😌',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function calcFocusScore(distractions: number, targetMin: number, actualMin: number): number {
  const raw = 100 - distractions * 10 - Math.max(0, targetMin - actualMin);
  return Math.min(100, Math.max(0, raw));
}

// ─── SVG Progress Ring ────────────────────────────────────────────────────────

interface ProgressRingProps {
  progress: number; // 0-1
  size: number;
  strokeWidth: number;
  color: string;
  glowColor?: string;
  pulsing?: boolean;
}

function ProgressRing({ progress, size, strokeWidth, color, glowColor, pulsing }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - progress * circ;

  return (
    <svg
      width={size}
      height={size}
      style={{
        transform: 'rotate(-90deg)',
        filter: glowColor ? `drop-shadow(0 0 8px ${glowColor})` : undefined,
        animation: pulsing ? 'focus-ring-pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-bg-tertiary)"
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  );
}

// ─── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPhase() {
  const store = useFocusSessionStore();
  const { data: allTasks = [] } = useTasks();
  const activeTasks = allTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'cancelled',
  );

  const [taskSearch, setTaskSearch] = useState(store.prefilledTaskTitle ?? '');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(store.prefilledTaskId ?? null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState(store.prefilledTaskTitle ?? '');
  const [customLabel, setCustomLabel] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [pomos, setPomos] = useState(4);
  const [showCustomPomos, setShowCustomPomos] = useState(false);
  const [customPomos, setCustomPomos] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredTasks = activeTasks.filter((t) =>
    t.title.toLowerCase().includes(taskSearch.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const finalLabel = selectedTaskTitle || customLabel || taskSearch || 'Focus Session';
  const finalDuration = showCustomDuration
    ? parseInt(customDuration, 10) || 25
    : duration;
  const finalPomos = showCustomPomos ? parseInt(customPomos, 10) || 4 : pomos;

  function handleStart() {
    if (!finalLabel.trim()) return;
    store.startSession({
      taskId: selectedTaskId ?? undefined,
      taskTitle: finalLabel.trim(),
      targetMinutes: finalDuration,
      pomodorosTarget: finalPomos,
    });
  }

  const DURATIONS = [25, 45, 60, 90];
  const POMO_COUNTS = [1, 2, 3, 4];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</div>
          <h2
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            Start a Focus Session
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-muted)',
              marginTop: 8,
              marginBottom: 0,
            }}
          >
            Set your intention and dive in
          </p>
        </div>

        {/* Task picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            What are you focusing on?
          </label>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {selectedTaskId ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1.5px solid var(--color-accent)',
                  backgroundColor: 'var(--color-accent-soft)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSelectedTaskId(null);
                  setSelectedTaskTitle('');
                  setTaskSearch('');
                }}
              >
                <span style={{ fontSize: '1rem' }}>✅</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {selectedTaskTitle}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: 'var(--color-bg-tertiary)',
                  }}
                >
                  ✕ clear
                </span>
              </div>
            ) : (
              <input
                type="text"
                placeholder="Search tasks or type a custom label..."
                value={taskSearch}
                onChange={(e) => {
                  setTaskSearch(e.target.value);
                  setCustomLabel(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: showDropdown
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                  boxShadow: showDropdown
                    ? '0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)'
                    : 'none',
                }}
              />
            )}

            {/* Dropdown */}
            {showDropdown && !selectedTaskId && filteredTasks.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 100,
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  boxShadow: 'var(--shadow-popup)',
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {filteredTasks.slice(0, 8).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setSelectedTaskTitle(task.title);
                      setTaskSearch(task.title);
                      setCustomLabel('');
                      setShowDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.9rem',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '0.8rem' }}>📋</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Duration picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Session Duration
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDuration(d);
                  setShowCustomDuration(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 100,
                  border: '1.5px solid',
                  borderColor:
                    !showCustomDuration && duration === d
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  backgroundColor:
                    !showCustomDuration && duration === d
                      ? 'var(--color-accent-soft)'
                      : 'var(--color-bg-elevated)',
                  color:
                    !showCustomDuration && duration === d
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                  fontWeight: !showCustomDuration && duration === d ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {d}m
              </button>
            ))}
            <button
              onClick={() => setShowCustomDuration(!showCustomDuration)}
              style={{
                padding: '10px 20px',
                borderRadius: 100,
                border: '1.5px solid',
                borderColor: showCustomDuration ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: showCustomDuration ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
                color: showCustomDuration ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Custom
            </button>
          </div>
          {showCustomDuration && (
            <input
              type="number"
              min={1}
              max={300}
              placeholder="Minutes (e.g. 50)"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--color-accent)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                width: 160,
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Pomodoro count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            How many rounds?
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {POMO_COUNTS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPomos(p);
                  setShowCustomPomos(false);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 100,
                  border: '1.5px solid',
                  borderColor:
                    !showCustomPomos && pomos === p
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  backgroundColor:
                    !showCustomPomos && pomos === p
                      ? 'var(--color-accent-soft)'
                      : 'var(--color-bg-elevated)',
                  color:
                    !showCustomPomos && pomos === p
                      ? 'var(--color-accent)'
                      : 'var(--color-text-secondary)',
                  fontSize: '0.9rem',
                  fontWeight: !showCustomPomos && pomos === p ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setShowCustomPomos(!showCustomPomos)}
              style={{
                padding: '10px 20px',
                borderRadius: 100,
                border: '1.5px solid',
                borderColor: showCustomPomos ? 'var(--color-accent)' : 'var(--color-border)',
                backgroundColor: showCustomPomos ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
                color: showCustomPomos ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Custom
            </button>
          </div>

          {showCustomPomos && (
            <input
              type="number"
              min={1}
              max={20}
              placeholder="Number of rounds"
              value={customPomos}
              onChange={(e) => setCustomPomos(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: '1.5px solid var(--color-accent)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
                outline: 'none',
                width: 160,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Tomato visual */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: Math.min(finalPomos, 12) }).map((_, i) => (
              <span
                key={i}
                style={{
                  fontSize: '1.4rem',
                  transition: 'transform 0.2s ease',
                  display: 'inline-block',
                }}
              >
                🍅
              </span>
            ))}
            {finalPomos > 12 && (
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                +{finalPomos - 12}
              </span>
            )}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!finalLabel.trim()}
          style={{
            width: '100%',
            padding: '16px 32px',
            borderRadius: 16,
            border: 'none',
            background: finalLabel.trim()
              ? 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, #8b5cf6))'
              : 'var(--color-bg-tertiary)',
            color: finalLabel.trim() ? '#fff' : 'var(--color-text-muted)',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: finalLabel.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            letterSpacing: '-0.01em',
            boxShadow: finalLabel.trim()
              ? '0 4px 24px color-mix(in srgb, var(--color-accent) 40%, transparent)'
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (finalLabel.trim()) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 8px 32px color-mix(in srgb, var(--color-accent) 50%, transparent)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = finalLabel.trim()
              ? '0 4px 24px color-mix(in srgb, var(--color-accent) 40%, transparent)'
              : 'none';
          }}
        >
          🎯 Start Focus — {finalDuration}m × {finalPomos} rounds
        </button>
      </div>
    </div>
  );
}

// ─── Working Phase ────────────────────────────────────────────────────────────

function WorkingPhase() {
  const store = useFocusSessionStore();
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(store.sessionNotes);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [distractionFlash, setDistractionFlash] = useState(false);
  const [lastPomos, setLastPomos] = useState(store.pomodorosCompleted);
  const [pomoAnimate, setPomoAnimate] = useState<number | null>(null);
  const [prevPhase, setPrevPhase] = useState(store.phase);

  const totalSeconds = store.targetMinutes * 60;
  const progress = store.elapsedSeconds / totalSeconds;
  const timeLeft = totalSeconds - store.elapsedSeconds;
  const atEnd = timeLeft <= 0;

  // Detect pomo completion for animation
  useEffect(() => {
    if (store.pomodorosCompleted > lastPomos) {
      setPomoAnimate(store.pomodorosCompleted - 1);
      setLastPomos(store.pomodorosCompleted);
      setTimeout(() => setPomoAnimate(null), 600);
    }
  }, [store.pomodorosCompleted, lastPomos]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.code === 'Space' && !showQuitConfirm) {
        // Don't intercept if in a text area
        if (document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        store.pauseResume();
      }
      if (e.code === 'Escape') {
        if (showQuitConfirm) {
          setShowQuitConfirm(false);
        } else {
          setShowQuitConfirm(true);
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showQuitConfirm, store]);

  // Play sound when transitioning from working -> break or completed
  useEffect(() => {
    if (prevPhase === 'working' && store.phase !== 'working') {
      if (store.phase === 'break') {
        void playWorkCompleteTone();
      } else if (store.phase === 'completed') {
        void playWorkCompleteTone();
      }
    }
    setPrevPhase(store.phase);
  }, [store.phase, prevPhase]);

  function handleLogDistraction() {
    store.logDistraction();
    setDistractionFlash(true);
    setTimeout(() => setDistractionFlash(false), 400);
  }

  function handleSaveNotes() {
    store.addNote(notes);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '100%',
        padding: '40px 24px',
        position: 'relative',
      }}
    >
      {/* Quit confirm overlay */}
      {showQuitConfirm && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 24,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              borderRadius: 20,
              padding: '32px',
              maxWidth: 320,
              textAlign: 'center',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-popup)',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏸</div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: '0 0 8px',
              }}
            >
              Quit this session?
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-text-secondary)',
                margin: '0 0 24px',
              }}
            >
              Your progress will be lost. Stay focused!
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowQuitConfirm(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Keep Going 💪
              </button>
              <button
                onClick={() => store.cancelSession()}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top: task title */}
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 100,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>🎯</span>
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {store.currentTaskTitle}
          </span>
        </div>
      </div>

      {/* Center: timer ring */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <ProgressRing
            progress={progress}
            size={220}
            strokeWidth={14}
            color="var(--color-accent)"
            glowColor="color-mix(in srgb, var(--color-accent) 60%, transparent)"
            pulsing={atEnd}
          />
          {/* Timer in center */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: '3rem',
                fontFamily: '"JetBrains Mono", "Fira Mono", "Courier New", monospace',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTime(Math.max(0, timeLeft))}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {store.isPaused ? 'Paused' : 'Focusing'}
            </span>
          </div>
        </div>

        {/* Pomodoro indicators */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {Array.from({ length: store.pomodorosTarget }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: '1.6rem',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform:
                  pomoAnimate === i ? 'scale(1.5)' : 'scale(1)',
                filter:
                  i < store.pomodorosCompleted
                    ? 'none'
                    : 'grayscale(1) opacity(0.35)',
                display: 'inline-block',
              }}
            >
              🍅
            </span>
          ))}
        </div>

        {/* Pause & Stop controls */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={() => store.pauseResume()}
            title={store.isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-secondary)',
              fontSize: '1.3rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {store.isPaused ? '▶' : '⏸'}
          </button>
          <button
            onClick={() => setShowQuitConfirm(true)}
            title="Stop session (Esc)"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-muted)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
              e.currentTarget.style.color = 'var(--color-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            ⏹
          </button>
        </div>
      </div>

      {/* Bottom: distraction + notes */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Distraction counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderRadius: 12,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
            }}
          >
            Distractions: <strong style={{ color: 'var(--color-text-secondary)' }}>{store.distractionCount}</strong>
          </span>
          <button
            onClick={handleLogDistraction}
            style={{
              padding: '4px 14px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: distractionFlash ? 'var(--color-danger)' : 'var(--color-border)',
              backgroundColor: distractionFlash ? 'var(--color-danger-soft)' : 'transparent',
              color: distractionFlash ? 'var(--color-danger)' : 'var(--color-text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            +1 distraction
          </button>
        </div>

        {/* Session notes */}
        <div
          style={{
            borderRadius: 12,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
          }}
        >
          <button
            onClick={() => setShowNotes(!showNotes)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span>📝 Session notes</span>
            <span>{showNotes ? '▲' : '▼'}</span>
          </button>
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                store.addNote(e.target.value);
              }}
              placeholder="Capture thoughts, decisions, blockers..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 16px 12px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontSize: '0.88rem',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Keyboard hint */}
        <p
          style={{
            fontSize: '0.72rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            margin: 0,
          }}
        >
          <kbd
            style={{
              padding: '1px 5px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              fontSize: '0.7rem',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}
          >
            Space
          </kbd>{' '}
          pause ·{' '}
          <kbd
            style={{
              padding: '1px 5px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              fontSize: '0.7rem',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}
          >
            Esc
          </kbd>{' '}
          quit
        </p>
      </div>
    </div>
  );
}

// ─── Break Phase ──────────────────────────────────────────────────────────────

function BreakPhase() {
  const store = useFocusSessionStore();
  const [suggestionIdx, setSuggestionIdx] = useState(() =>
    Math.floor(Math.random() * BREAK_SUGGESTIONS.length),
  );
  const [prevPhase, setPrevPhase] = useState(store.phase);

  const timeLeft = store.breakSeconds - store.breakElapsed;
  const progress = store.breakElapsed / (store.breakSeconds || 1);
  const isLong = store.breakSeconds >= 15 * 60;

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionIdx((i) => (i + 1) % BREAK_SUGGESTIONS.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Play sound when break ends → working
  useEffect(() => {
    if (prevPhase === 'break' && store.phase === 'working') {
      void playBreakCompleteTone();
    }
    setPrevPhase(store.phase);
  }, [store.phase, prevPhase]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '40px 24px',
        gap: 32,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>
          {isLong ? '🧘' : '☕'}
        </div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}
        >
          {isLong ? 'Long Break' : 'Short Break'}
        </h2>
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          Take a break! Stretch, hydrate, breathe.
        </p>
      </div>

      {/* Break timer ring */}
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <ProgressRing
          progress={progress}
          size={180}
          strokeWidth={12}
          color="#22d3ee"
          glowColor="rgba(34, 211, 238, 0.4)"
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: '2.5rem',
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatTime(Math.max(0, timeLeft))}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Break
          </span>
        </div>
      </div>

      {/* Rotating suggestion */}
      <div
        style={{
          padding: '14px 24px',
          borderRadius: 16,
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
          maxWidth: 340,
          transition: 'opacity 0.5s ease',
        }}
      >
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {BREAK_SUGGESTIONS[suggestionIdx]}
        </p>
      </div>

      {/* Pomo progress */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {Array.from({ length: store.pomodorosTarget }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: '1.4rem',
              filter: i < store.pomodorosCompleted ? 'none' : 'grayscale(1) opacity(0.3)',
            }}
          >
            🍅
          </span>
        ))}
      </div>

      {/* Skip break */}
      <button
        onClick={() => store.endBreak()}
        style={{
          padding: '10px 28px',
          borderRadius: 100,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          color: 'var(--color-text-secondary)',
          fontSize: '0.88rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        Skip Break →
      </button>
    </div>
  );
}

// ─── Completed Phase ──────────────────────────────────────────────────────────

function CompletedPhase() {
  const store = useFocusSessionStore();
  const updateTask = useUpdateTask();
  const [markDone, setMarkDone] = useState(false);
  const [saved, setSaved] = useState(false);

  const actualMinutes = Math.round(store.elapsedSeconds / 60);
  const score = calcFocusScore(store.distractionCount, store.targetMinutes, actualMinutes);

  // Score ring color
  const scoreColor =
    score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : 'var(--color-danger)';

  function handleSave() {
    if (markDone && store.currentTaskId) {
      updateTask.mutate({ id: store.currentTaskId, data: { status: 'done' } });
    }
    store.completeSession();
    setSaved(true);
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        padding: '40px 24px',
        gap: 28,
      }}
    >
      {/* Celebration header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
        <h2
          style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: '0 0 8px',
          }}
        >
          Session Complete!
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          You did it — great work today.
        </p>
      </div>

      {/* Summary card */}
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 20,
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-elevated)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        {/* Score ring + big number */}
        <div
          style={{
            padding: '28px 28px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
            <ProgressRing
              progress={score / 100}
              size={100}
              strokeWidth={9}
              color={scoreColor}
              glowColor={`${scoreColor}66`}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: scoreColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Score
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {actualMinutes}m
              </span>
              <span
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  marginLeft: 6,
                }}
              >
                focused
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
              }}
            >
              {Array.from({ length: store.pomodorosCompleted }).map((_, i) => (
                <span key={i} style={{ fontSize: '1.1rem' }}>🍅</span>
              ))}
              <span
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-text-muted)',
                  alignSelf: 'center',
                  marginLeft: 4,
                }}
              >
                × {store.pomodorosCompleted} round{store.pomodorosCompleted !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Task</span>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {store.currentTaskTitle}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Distractions</span>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color:
                  store.distractionCount === 0
                    ? '#22c55e'
                    : store.distractionCount <= 3
                    ? '#f59e0b'
                    : 'var(--color-danger)',
              }}
            >
              {store.distractionCount === 0
                ? '🎯 None!'
                : `${store.distractionCount} logged`}
            </span>
          </div>

          {/* Mark done checkbox */}
          {store.currentTaskId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--color-bg-secondary)',
                border: markDone ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => setMarkDone(!markDone)}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: `2px solid ${markDone ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: markDone ? 'var(--color-accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {markDone && (
                  <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>✓</span>
                )}
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
                Mark task as done
              </span>
            </div>
          )}

          {/* Session notes */}
          {store.sessionNotes && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 6px',
                }}
              >
                Session Notes
              </p>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                }}
              >
                {store.sessionNotes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 440 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '14px 24px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 70%, #8b5cf6))',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px color-mix(in srgb, var(--color-accent) 40%, transparent)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
        >
          Save & Close ✓
        </button>
        <button
          onClick={() => {
            store.cancelSession();
          }}
          style={{
            padding: '14px 20px',
            borderRadius: 14,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
          }}
        >
          Start Another 🔄
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function FocusSessionModal() {
  const store = useFocusSessionStore();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick intervals
  useEffect(() => {
    if (store.isActive && store.phase === 'working' && !store.isPaused) {
      tickRef.current = setInterval(() => {
        useFocusSessionStore.getState().tick();
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [store.isActive, store.phase, store.isPaused]);

  useEffect(() => {
    if (store.isActive && store.phase === 'break' && !store.isPaused) {
      breakTickRef.current = setInterval(() => {
        useFocusSessionStore.getState().tickBreak();
      }, 1000);
    }
    return () => {
      if (breakTickRef.current) clearInterval(breakTickRef.current);
    };
  }, [store.isActive, store.phase, store.isPaused]);

  if (!store.isModalOpen) return null;

  // Background gradient based on phase
  const bgGradient = {
    setup:
      'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, transparent 70%)',
    working:
      'radial-gradient(ellipse at 50% 30%, color-mix(in srgb, var(--color-accent) 6%, transparent) 0%, transparent 60%)',
    break:
      'radial-gradient(ellipse at 50% 30%, rgba(34, 211, 238, 0.08) 0%, transparent 60%)',
    completed:
      'radial-gradient(ellipse at 50% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 60%)',
  }[store.phase];

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes focus-bg-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes focus-ring-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px color-mix(in srgb, var(--color-accent) 60%, transparent)); }
          50% { filter: drop-shadow(0 0 20px color-mix(in srgb, var(--color-accent) 80%, transparent)); }
        }
        @keyframes focus-modal-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          padding: '24px',
        }}
      >
        {/* Modal */}
        <div
          style={{
            width: '100%',
            maxWidth: store.phase === 'setup' ? 540 : 580,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            borderRadius: 24,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-primary)',
            backgroundImage: bgGradient,
            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            position: 'relative',
            animation: 'focus-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transition: 'max-width 0.3s ease',
          }}
        >
          {/* Close button (setup only) */}
          {store.phase === 'setup' && (
            <button
              onClick={() => store.closeModal()}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-muted)',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              ✕
            </button>
          )}

          {/* Phase content */}
          {store.phase === 'setup' && <SetupPhase />}
          {store.phase === 'working' && <WorkingPhase />}
          {store.phase === 'break' && <BreakPhase />}
          {store.phase === 'completed' && <CompletedPhase />}
        </div>
      </div>
    </>
  );
}
