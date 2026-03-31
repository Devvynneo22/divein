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

// Ring geometry per spec
const RADIUS = 88;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 552.9
const STROKE = 10;
const SIZE = 2 * (RADIUS + STROKE + 14); // ≈ 224px

function getPhaseGradientId(phase: PomodoroPhase): string {
  if (phase === 'short_break') return 'timer-grad-break';
  if (phase === 'long_break') return 'timer-grad-longbreak';
  return 'timer-grad-work';
}

function getPhaseColor(phase: PomodoroPhase): string {
  if (phase === 'short_break') return 'var(--color-success)';
  if (phase === 'long_break') return '#2dd4bf'; // teal
  return 'var(--color-accent)';
}

function getPhaseLabel(isPomodoroMode: boolean, phase: PomodoroPhase): string {
  if (!isPomodoroMode) return 'Stopwatch';
  if (phase === 'short_break') return 'Short Break';
  if (phase === 'long_break') return 'Long Break';
  return 'Focus';
}

// Stopwatch loops at 60 min
const STOPWATCH_LOOP = 60 * 60;

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
  const gradientId = getPhaseGradientId(phase);
  const phaseLabel = getPhaseLabel(isPomodoroMode, phase);

  // Progress 0→1
  const progress = isPomodoroMode
    ? totalSeconds > 0
      ? Math.max(0, Math.min(1, 1 - secondsRemaining / totalSeconds))
      : 0
    : (secondsElapsed % STOPWATCH_LOOP) / STOPWATCH_LOOP;

  // strokeDashoffset per spec: 552.9 * (1 - progress)
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const displayTime = isPomodoroMode ? secondsRemaining : secondsElapsed;
  const completedDots = pomodoroCount % longBreakAfter;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* ── SVG ring hero ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
      >
        {/* Ambient glow when running */}
        {isRunning && (
          <div
            style={{
              position: 'absolute',
              width: SIZE * 0.8,
              height: SIZE * 0.8,
              borderRadius: '50%',
              background: `radial-gradient(circle, color-mix(in srgb, ${color} 20%, transparent) 0%, transparent 70%)`,
              filter: 'blur(24px)',
              pointerEvents: 'none',
            }}
          />
        )}

        <svg
          width={SIZE}
          height={SIZE}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <defs>
            {/* Work gradient — blue */}
            <linearGradient id="timer-grad-work" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            {/* Short break gradient — green */}
            <linearGradient id="timer-grad-break" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-success)" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
            {/* Long break gradient — teal */}
            <linearGradient id="timer-grad-longbreak" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            {/* Card BG radial */}
            <radialGradient id="timer-card-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-bg-elevated)" />
              <stop offset="100%" stopColor="var(--color-bg-secondary)" />
            </radialGradient>
          </defs>

          {/* Card background disc */}
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

          {/* Progress ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease',
              filter: `drop-shadow(0 0 5px color-mix(in srgb, ${color} 60%, transparent))`,
            }}
          />
        </svg>

        {/* Center content — rendered OUTSIDE the rotated SVG */}
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
              fontSize: '2.75rem',
              fontVariantNumeric: 'tabular-nums',
              fontFamily:
                '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
              color,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              transition: 'color 0.4s ease',
              textShadow: isRunning
                ? `0 0 32px color-mix(in srgb, ${color} 35%, transparent)`
                : 'none',
            }}
          >
            {formatTime(displayTime)}
          </span>
        </div>
      </div>

      {/* ── Phase label ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isRunning ? color : 'var(--color-text-muted)',
            transition: 'color 0.4s ease',
          }}
        >
          {phaseLabel}
        </span>

        {/* Pomodoro dot indicators */}
        {isPomodoroMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {Array.from({ length: longBreakAfter }).map((_, i) => {
              const isCompleted = i < completedDots;
              const isCurrent = i === completedDots && isRunning && phase === 'work';
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isCurrent ? '0.95rem' : '0.85rem',
                    opacity: isCompleted || isCurrent ? 1 : 0.3,
                    filter:
                      isCompleted || isCurrent
                        ? `drop-shadow(0 0 4px color-mix(in srgb, ${color} 60%, transparent))`
                        : 'none',
                    transition: 'all 0.4s ease',
                    animation: isCurrent ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  }}
                  title={isCompleted ? 'Completed' : isCurrent ? 'In progress' : 'Upcoming'}
                >
                  🍅
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
