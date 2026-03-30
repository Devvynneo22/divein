import { Play, Pause, SkipForward, RotateCcw, Timer, Clock } from 'lucide-react';
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
  // Button text and icon for play/pause
  const playLabel = isRunning
    ? 'Pause'
    : phase === 'work'
      ? 'Start Focus'
      : phase === 'short_break'
        ? 'Start Break'
        : 'Start Rest';

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* ─── Mode toggle ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <button
          onClick={() => onModeChange('pomodoro')}
          disabled={isRunning && hasActiveEntry}
          title={isRunning ? 'Stop timer to switch modes' : undefined}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            isPomodoroMode
              ? {
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-sm)',
                }
              : { color: 'var(--color-text-secondary)' }
          }
        >
          <Timer size={13} />
          Pomodoro
        </button>
        <button
          onClick={() => onModeChange('stopwatch')}
          disabled={isRunning && hasActiveEntry}
          title={isRunning ? 'Stop timer to switch modes' : undefined}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            !isPomodoroMode
              ? {
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-sm)',
                }
              : { color: 'var(--color-text-secondary)' }
          }
        >
          <Clock size={13} />
          Stopwatch
        </button>
      </div>

      {/* ─── Main controls row ──────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4">
        {/* Reset — ghost text button */}
        <button
          onClick={onStop}
          title="Reset & stop"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-danger-soft, color-mix(in srgb, var(--color-danger) 12%, transparent))';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>

        {/* Play / Pause — hero pill */}
        <button
          onClick={onPlayPause}
          title={isRunning ? 'Pause' : 'Start'}
          className="flex items-center justify-center gap-2 rounded-full font-bold text-white transition-all active:scale-95"
          style={{
            minWidth: 164,
            height: 52,
            fontSize: '0.95rem',
            background: 'var(--color-accent)',
            boxShadow: `0 0 32px color-mix(in srgb, var(--color-accent) 35%, transparent), var(--shadow-md)`,
            padding: '0 1.5rem',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'none';
          }}
        >
          {isRunning ? (
            <>
              <Pause size={20} fill="white" strokeWidth={0} />
              Pause
            </>
          ) : (
            <>
              <Play size={20} fill="white" strokeWidth={0} />
              {playLabel}
            </>
          )}
        </button>

        {/* Skip — secondary pill, Pomodoro only */}
        <button
          onClick={onSkip}
          title={isPomodoroMode ? 'Skip to next phase' : 'Only available in Pomodoro mode'}
          disabled={!isPomodoroMode}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: isPomodoroMode ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
          onMouseEnter={(e) => {
            if (isPomodoroMode) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--color-bg-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-bg-tertiary)';
          }}
        >
          <SkipForward size={14} />
          Skip
        </button>
      </div>
    </div>
  );
}
