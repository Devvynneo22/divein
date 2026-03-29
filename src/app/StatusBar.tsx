import { Timer, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTimerStore } from '@/shared/stores/timerStore';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

const PHASE_LABELS: Record<string, string> = {
  work: '🍅 Focus',
  short_break: '☕ Break',
  long_break: '☕ Long Break',
};

export function StatusBar() {
  const navigate = useNavigate();
  const { isRunning, isPomodoroMode, phase, secondsElapsed, secondsRemaining } =
    useTimerStore();

  const timerDisplay = isRunning
    ? isPomodoroMode
      ? formatTime(secondsRemaining)
      : formatTime(secondsElapsed)
    : null;

  const phaseLabel = isPomodoroMode ? PHASE_LABELS[phase] ?? '' : '';

  return (
    <div
      className="flex items-center justify-between px-4 text-xs shrink-0"
      style={{
        height: 32,
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        color: 'var(--color-text-muted)',
      }}
    >
      {/* Left: Timer status */}
      <button
        onClick={() => navigate('/timer')}
        aria-label={isRunning ? `Timer running: ${timerDisplay}` : 'No timer running'}
        className="flex items-center gap-2 transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
      >
        {isRunning ? (
          <>
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: 'var(--color-success)' }}
              />
            </span>
            <span className="font-mono tabular-nums">{timerDisplay}</span>
            {phaseLabel && (
              <span style={{ color: 'var(--color-text-muted)' }}>{phaseLabel}</span>
            )}
          </>
        ) : (
          <>
            <Timer size={12} />
            <span>No timer running</span>
          </>
        )}
      </button>

      {/* Right: Shortcuts hint */}
      <div className="flex items-center gap-2">
        <Keyboard size={12} />
        <span>⌘K Commands</span>
      </div>
    </div>
  );
}
