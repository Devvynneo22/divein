import { Play, Pause, Square, SkipForward, Timer, Clock } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  isPomodoroMode: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onSkip: () => void;
  onModeChange: (mode: 'stopwatch' | 'pomodoro') => void;
}

export function TimerControls({
  isRunning,
  isPomodoroMode,
  onPlayPause,
  onStop,
  onSkip,
  onModeChange,
}: TimerControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        <button
          onClick={() => onModeChange('stopwatch')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={
            !isPomodoroMode
              ? { backgroundColor: 'var(--color-accent)', color: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
              : { color: 'var(--color-text-secondary)' }
          }
          onMouseEnter={(e) => {
            if (isPomodoroMode) {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (isPomodoroMode) {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          <Clock size={13} />
          Stopwatch
        </button>
        <button
          onClick={() => onModeChange('pomodoro')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          style={
            isPomodoroMode
              ? { backgroundColor: 'var(--color-accent)', color: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }
              : { color: 'var(--color-text-secondary)' }
          }
          onMouseEnter={(e) => {
            if (!isPomodoroMode) {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPomodoroMode) {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          <Timer size={13} />
          Pomodoro
        </button>
      </div>

      {/* Main controls */}
      <div className="flex items-center gap-4">
        {/* Stop */}
        <button
          onClick={onStop}
          title="Stop & save"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-danger)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          <Square size={18} />
        </button>

        {/* Play / Pause — hero button */}
        <button
          onClick={onPlayPause}
          title={isRunning ? 'Pause' : 'Start'}
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all active:scale-95 hover:scale-105"
          style={{
            background: 'var(--color-accent)',
            boxShadow: '0 0 32px color-mix(in srgb, var(--color-accent) 40%, transparent)',
          }}
        >
          {isRunning ? <Pause size={30} fill="white" /> : <Play size={30} fill="white" />}
        </button>

        {/* Skip — Pomodoro only */}
        <button
          onClick={onSkip}
          title="Skip phase"
          disabled={!isPomodoroMode}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: isPomodoroMode ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
          }}
          onMouseEnter={(e) => {
            if (isPomodoroMode) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (isPomodoroMode) {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}
