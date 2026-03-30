import type { PomodoroPhase } from '@/shared/types/timer';

interface TimerDisplayProps {
  isPomodoroMode: boolean;
  isRunning: boolean;
  phase: PomodoroPhase;
  secondsElapsed: number;
  secondsRemaining: number;
  totalSeconds: number;
  pomodoroCount: number;
  longBreakAfter: number;
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
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 2 * (RADIUS + STROKE + 16); // full SVG canvas with padding

function getPhaseColor(phase: PomodoroPhase): string {
  if (phase === 'short_break') return 'var(--color-success)';
  if (phase === 'long_break') return '#a855f7';
  return 'var(--color-accent)';
}

function getPhaseName(phase: PomodoroPhase): string {
  if (phase === 'short_break') return 'SHORT BREAK';
  if (phase === 'long_break') return 'LONG BREAK';
  return 'FOCUS';
}

export function TimerDisplay({
  isPomodoroMode,
  isRunning,
  phase,
  secondsElapsed,
  secondsRemaining,
  totalSeconds,
  pomodoroCount,
  longBreakAfter,
}: TimerDisplayProps) {
  const color = getPhaseColor(phase);
  const phaseName = getPhaseName(phase);

  const progress = isPomodoroMode
    ? Math.max(0, Math.min(1, totalSeconds > 0 ? secondsRemaining / totalSeconds : 0))
    : 0;

  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const displayTime = isPomodoroMode ? secondsRemaining : secondsElapsed;

  const completedDots = pomodoroCount % longBreakAfter;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* ─── Circular ring hero ─────────────────────────────────────── */}
      <div className="relative flex items-center justify-center select-none">
        {/* Ambient glow when running */}
        {isRunning && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: SIZE * 0.85,
              height: SIZE * 0.85,
              background: `radial-gradient(circle, color-mix(in srgb, ${color} 18%, transparent) 0%, transparent 70%)`,
              filter: 'blur(28px)',
            }}
          />
        )}

        <svg
          width={SIZE}
          height={SIZE}
          className="rotate-[-90deg]"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="timer-card-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-bg-elevated)" />
              <stop offset="100%" stopColor="var(--color-bg-secondary)" />
            </radialGradient>
          </defs>

          {/* Card background circle */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS - STROKE / 2 + 2}
            fill="url(#timer-card-bg)"
          />

          {/* Track ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth={STROKE}
            opacity={0.5}
          />

          {/* Progress ring — Pomodoro only */}
          {isPomodoroMode && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease',
                filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 55%, transparent))`,
              }}
            />
          )}

          {/* Stopwatch: just a static ring decoration */}
          {!isPomodoroMode && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeOpacity={0.25}
            />
          )}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          {/* Time digits */}
          <span
            style={{
              fontSize: '3.2rem',
              fontVariantNumeric: 'tabular-nums',
              fontFamily:
                '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
              color,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              transition: 'color 0.5s ease',
              textShadow: isRunning
                ? `0 0 40px color-mix(in srgb, ${color} 40%, transparent)`
                : 'none',
            }}
          >
            {formatTime(displayTime)}
          </span>

          {/* Mode label */}
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontVariant: 'small-caps',
              color: 'var(--color-text-muted)',
              transition: 'color 0.5s ease',
              marginTop: 4,
            }}
          >
            {isPomodoroMode ? phaseName : 'STOPWATCH'}
          </span>
        </div>
      </div>

      {/* ─── Pomodoro session dots ───────────────────────────────────── */}
      {isPomodoroMode && (
        <div className="flex items-center gap-2.5">
          {Array.from({ length: longBreakAfter }).map((_, i) => {
            const isCompleted = i < completedDots;
            const isCurrent = i === completedDots && isRunning && phase === 'work';
            return (
              <span
                key={i}
                className={isCurrent ? 'animate-pulse' : ''}
                style={{
                  display: 'inline-block',
                  width: isCurrent ? 11 : 10,
                  height: isCurrent ? 11 : 10,
                  borderRadius: '50%',
                  backgroundColor: isCompleted || isCurrent
                    ? color
                    : 'var(--color-bg-tertiary)',
                  opacity: isCurrent ? 1 : isCompleted ? 0.9 : 0.35,
                  boxShadow:
                    isCompleted || isCurrent
                      ? `0 0 8px color-mix(in srgb, ${color} 55%, transparent)`
                      : 'none',
                  border: isCurrent ? `2px solid var(--color-bg-primary)` : 'none',
                  outline: isCurrent ? `2px solid ${color}` : 'none',
                  transition: 'all 0.4s ease',
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
