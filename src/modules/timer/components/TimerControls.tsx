import { useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import type { PomodoroPhase } from '@/shared/types/timer';

interface TimerControlsProps {
  isRunning: boolean;
  isPomodoroMode: boolean;
  phase: PomodoroPhase;
  hasActiveEntry: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSkip: () => void;
  onModeChange: (mode: 'stopwatch' | 'pomodoro') => void;
}

export function TimerControls({
  isRunning,
  isPomodoroMode,
  phase,
  hasActiveEntry,
  onPlayPause,
  onStop,
  onSkip,
  onModeChange,
}: TimerControlsProps) {
  const [playHovered, setPlayHovered] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const [skipHovered, setSkipHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
      }}
    >
      {/* ── Reset (left flanking) ──────────────────────────────────── */}
      <button
        onClick={onStop}
        onMouseEnter={() => setResetHovered(true)}
        onMouseLeave={() => setResetHovered(false)}
        title="Reset & stop"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--color-border)',
          backgroundColor: resetHovered
            ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
            : 'var(--color-bg-secondary)',
          color: resetHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
          cursor: 'pointer',
          transform: resetHovered ? 'scale(1.08)' : 'scale(1)',
          boxShadow: resetHovered ? 'var(--shadow-md)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <RotateCcw size={17} />
      </button>

      {/* ── Play / Pause (hero, 64px) ─────────────────────────────── */}
      <button
        onClick={onPlayPause}
        onMouseEnter={() => setPlayHovered(true)}
        onMouseLeave={() => setPlayHovered(false)}
        title={isRunning ? 'Pause' : 'Start'}
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: isPomodoroMode
            ? phase === 'short_break'
              ? 'linear-gradient(135deg, var(--color-success), #4ade80)'
              : phase === 'long_break'
                ? 'linear-gradient(135deg, #2dd4bf, #5eead4)'
                : 'linear-gradient(135deg, var(--color-accent), #60a5fa)'
            : 'linear-gradient(135deg, var(--color-accent), #60a5fa)',
          color: '#fff',
          cursor: 'pointer',
          transform: playHovered ? 'scale(1.08)' : 'scale(1)',
          boxShadow: playHovered
            ? `0 0 40px color-mix(in srgb, var(--color-accent) 40%, transparent), var(--shadow-lg)`
            : `0 0 24px color-mix(in srgb, var(--color-accent) 25%, transparent), var(--shadow-md)`,
          transition: 'all 0.18s ease',
        }}
      >
        {isRunning ? (
          <Pause size={26} fill="white" strokeWidth={0} />
        ) : (
          <Play size={26} fill="white" strokeWidth={0} style={{ marginLeft: 3 }} />
        )}
      </button>

      {/* ── Skip / Next phase (right flanking, Pomodoro only) ──────── */}
      <button
        onClick={onSkip}
        onMouseEnter={() => setSkipHovered(true)}
        onMouseLeave={() => setSkipHovered(false)}
        title={isPomodoroMode ? 'Skip to next phase' : 'Only available in Pomodoro mode'}
        disabled={!isPomodoroMode}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--color-border)',
          backgroundColor:
            isPomodoroMode && skipHovered
              ? 'var(--color-bg-tertiary)'
              : 'var(--color-bg-secondary)',
          color:
            isPomodoroMode && skipHovered
              ? 'var(--color-text-primary)'
              : 'var(--color-text-muted)',
          cursor: isPomodoroMode ? 'pointer' : 'not-allowed',
          opacity: isPomodoroMode ? 1 : 0.3,
          transform: isPomodoroMode && skipHovered ? 'scale(1.08)' : 'scale(1)',
          boxShadow: isPomodoroMode && skipHovered ? 'var(--shadow-md)' : 'none',
          transition: 'all 0.18s ease',
        }}
      >
        <SkipForward size={17} />
      </button>
    </div>
  );
}

// Export mode switcher separately so TimerPage can use it
interface ModeSwitcherProps {
  isPomodoroMode: boolean;
  isManualMode: boolean;
  isRunning: boolean;
  hasActiveEntry: boolean;
  onModeChange: (mode: 'stopwatch' | 'pomodoro' | 'manual') => void;
}

export function ModeSwitcher({
  isPomodoroMode,
  isManualMode,
  isRunning,
  hasActiveEntry,
  onModeChange,
}: ModeSwitcherProps) {
  const isLocked = isRunning && hasActiveEntry;

  const modes: { key: 'stopwatch' | 'pomodoro' | 'manual'; label: string }[] = [
    { key: 'stopwatch', label: '⏱ Stopwatch' },
    { key: 'pomodoro', label: '🍅 Pomodoro' },
    { key: 'manual', label: '✍️ Manual' },
  ];

  const active: 'stopwatch' | 'pomodoro' | 'manual' = isManualMode
    ? 'manual'
    : isPomodoroMode
      ? 'pomodoro'
      : 'stopwatch';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '4px',
        borderRadius: 10,
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
      }}
    >
      {modes.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            disabled={isLocked}
            title={isLocked ? 'Stop timer to switch modes' : undefined}
            style={{
              padding: '5px 14px',
              borderRadius: 7,
              fontSize: '0.78rem',
              fontWeight: 600,
              border: 'none',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              opacity: isLocked && !isActive ? 0.5 : 1,
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--color-text-secondary)',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
