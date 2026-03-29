import type { PomodoroPhase } from '@/shared/types/timer';

interface TimerDisplayProps {
  isPomodoroMode: boolean;
  isRunning: boolean;
  phase: PomodoroPhase;
  secondsElapsed: number;
  secondsRemaining: number;
  totalSeconds: number; // for progress ring
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
  }
  return [m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const RADIUS = 120;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TimerDisplay({
  isPomodoroMode,
  isRunning,
  phase,
  secondsElapsed,
  secondsRemaining,
  totalSeconds,
}: TimerDisplayProps) {
  const isBreak = phase === 'short_break' || phase === 'long_break';
  const accentColor = isBreak ? 'var(--color-success)' : 'var(--color-accent)';

  const progress = isPomodoroMode
    ? Math.max(0, Math.min(1, secondsRemaining / totalSeconds))
    : 0;

  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const displayTime = isPomodoroMode ? secondsRemaining : secondsElapsed;

  const size = 2 * (RADIUS + STROKE + 6);

  return (
    <div className="relative flex items-center justify-center">
      {isPomodoroMode ? (
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg]"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="none"
            stroke={accentColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.5s ease' }}
          />
        </svg>
      ) : (
        /* Stopwatch outer ring */
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            border: `${STROKE}px solid var(--color-bg-tertiary)`,
          }}
        />
      )}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span
          className={`font-bold tracking-tight select-none ${isRunning ? 'opacity-100' : 'opacity-80'}`}
          style={{
            fontSize: '4rem',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
            color: accentColor,
            transition: 'color 0.5s ease',
            textShadow: isRunning
              ? `0 0 48px color-mix(in srgb, ${accentColor} 35%, transparent)`
              : 'none',
          }}
        >
          {formatTime(displayTime)}
        </span>
        {isPomodoroMode && (
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: accentColor, transition: 'color 0.5s ease' }}
          >
            {phase === 'work' ? '🍅 Focus' : phase === 'short_break' ? '☕ Short Break' : '🛌 Long Break'}
          </span>
        )}
      </div>
    </div>
  );
}
