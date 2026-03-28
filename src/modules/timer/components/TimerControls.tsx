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
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg-tertiary)]">
        <button
          onClick={() => onModeChange('stopwatch')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            !isPomodoroMode
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Clock size={13} />
          Stopwatch
        </button>
        <button
          onClick={() => onModeChange('pomodoro')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            isPomodoroMode
              ? 'bg-[var(--color-accent)] text-white shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Timer size={13} />
          Pomodoro
        </button>
      </div>

      {/* Main controls */}
      <div className="flex items-center gap-3">
        {/* Stop */}
        <button
          onClick={onStop}
          title="Stop & save"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-danger)] hover:text-white transition-all"
        >
          <Square size={16} />
        </button>

        {/* Play / Pause — hero button */}
        <button
          onClick={onPlayPause}
          title={isRunning ? 'Pause' : 'Start'}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-all active:scale-95 hover:scale-105"
          style={{ background: 'var(--color-accent)', boxShadow: '0 0 24px var(--color-accent)66' }}
        >
          {isRunning ? <Pause size={26} fill="white" /> : <Play size={26} fill="white" />}
        </button>

        {/* Skip — Pomodoro only */}
        <button
          onClick={onSkip}
          title="Skip phase"
          disabled={!isPomodoroMode}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isPomodoroMode
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
          }`}
        >
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
}
