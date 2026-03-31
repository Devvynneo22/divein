import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Check, Pencil, Trash2, Plus, Minus, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import type { HabitWithStatus } from '@/shared/types/habit';
import { useCheckIn, useUncheckIn } from '../hooks/useHabits';
import { toast } from '@/shared/stores/toastStore';
import { useActivityStore } from '@/shared/stores/activityStore';

interface HabitItemProps {
  habit: HabitWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (habit: HabitWithStatus) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function freqLabel(habit: HabitWithStatus): string {
  const f = habit.frequency;
  if (f.type === 'daily') return 'Daily';
  if (f.type === 'xPerWeek') {
    const times = (f as { type: 'xPerWeek'; times: number }).times;
    return `${times}× per week`;
  }
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = (f as { type: 'weekly'; days: number[] }).days;
  return days.map((d) => dayNames[d]).join(', ');
}

// ─── Circular progress ring SVG ───────────────────────────────────────────────

function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  bgColor,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(progress, 1));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)', pointerEvents: 'none' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

// ─── Sparkle effect ───────────────────────────────────────────────────────────

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

function SparkleEffect({ color, active }: { color: string; active: boolean }) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (!active) { setSparkles([]); return; }

    const colors = [color, '#fbbf24', '#f472b6', '#60a5fa', '#34d399'];
    const newSparkles: Sparkle[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 50 + Math.cos((i / 8) * 2 * Math.PI) * 35 + (Math.random() - 0.5) * 10,
      y: 50 + Math.sin((i / 8) * 2 * Math.PI) * 35 + (Math.random() - 0.5) * 10,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: i * 30,
    }));
    setSparkles(newSparkles);

    const t = setTimeout(() => setSparkles([]), 700);
    return () => clearTimeout(t);
  }, [active, color]);

  if (sparkles.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 20,
      }}
    >
      {sparkles.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            backgroundColor: s.color,
            transform: 'translate(-50%, -50%) scale(0)',
            animation: `sparkle-pop 0.6s ease-out ${s.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}

export const HabitItem = memo(function HabitItem({
  habit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  compact = false,
}: HabitItemProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isHovered, setIsHovered] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [error, setError] = useState(false);
  const prevStreak = useRef(habit.streak);

  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();
  const addActivity = useActivityStore((s) => s.addActivity);

  const isMeasurable = !!habit.unit;
  const currentValue = habit.todayEntry?.value ?? 0;
  const habitColor = habit.color ?? 'var(--color-accent)';
  const isCompleted = habit.isCompletedToday;
  const progress = isMeasurable ? Math.min(currentValue / Math.max(habit.target, 1), 1) : 0;
  const avatarContent = habit.icon ?? habit.name.charAt(0).toUpperCase();

  // Streak milestone sparkle (every 7 days)
  useEffect(() => {
    const oldStreak = prevStreak.current;
    prevStreak.current = habit.streak;
    if (habit.streak > oldStreak && habit.streak > 0 && habit.streak % 7 === 0) {
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 800);
    }
  }, [habit.streak]);

  const onMutationError = (err: unknown) => {
    console.error('Habit check-in failed:', err);
    setError(true);
    setTimeout(() => setError(false), 3000);
  };

  const handleSelect = useCallback(() => onSelect(habit.id), [onSelect, habit.id]);
  const handleEdit = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onEdit(habit); },
    [onEdit, habit],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onDelete(habit.id); },
    [onDelete, habit.id],
  );
  const handleStats = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onSelect(habit.id); },
    [onSelect, habit.id],
  );

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted) {
      uncheckIn.mutate({ habitId: habit.id, date: today }, { onError: onMutationError });
    } else {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 500);
      checkIn.mutate(
        { habitId: habit.id, date: today, value: 1 },
        {
          onError: onMutationError,
          onSuccess: () => {
            toast.success('Habit checked in ✓');
            addActivity({
              type: 'habit_checked',
              title: `Checked in '${habit.name}'`,
              icon: habit.icon ?? '✔️',
              entityId: habit.id,
              entityType: 'habit',
            });
          },
        },
      );
    }
  }

  function handleIncrement(e: React.MouseEvent) {
    e.stopPropagation();
    const newVal = currentValue + 1;
    checkIn.mutate({ habitId: habit.id, date: today, value: newVal }, { onError: onMutationError });
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    if (currentValue <= 0) return;
    const newVal = currentValue - 1;
    if (newVal <= 0) {
      uncheckIn.mutate({ habitId: habit.id, date: today }, { onError: onMutationError });
    } else {
      checkIn.mutate({ habitId: habit.id, date: today, value: newVal }, { onError: onMutationError });
    }
  }

  const cardBorder = isSelected
    ? `1.5px solid ${habitColor}88`
    : isHovered
    ? '1.5px solid var(--color-border-hover)'
    : '1.5px solid var(--color-border)';

  const cardBg = isCompleted ? 'rgba(34,197,94,0.06)' : 'var(--color-bg-elevated)';
  const ringSize = compact ? 44 : 52;
  const strokeW = 3;

  return (
    <div
      className={`rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden ${compact ? '' : ''}`}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: cardBg,
        border: cardBorder,
        boxShadow: isHovered ? 'var(--shadow-md)' : isSelected ? 'var(--shadow-sm)' : 'none',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      {/* Sparkle on streak milestone */}
      <SparkleEffect color={habitColor} active={showSparkle} />

      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: 4,
          backgroundColor: isCompleted ? '#22c55e' : habitColor,
          opacity: isCompleted ? 0.5 : 0.8,
          borderRadius: '16px 0 0 16px',
        }}
      />

      {/* Pulse flash on check-in */}
      {justCompleted && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            backgroundColor: 'rgba(34,197,94,0.15)',
            animation: 'pulse-flash 0.5s ease-out forwards',
          }}
        />
      )}

      {/* Hover action buttons */}
      <div
        className="absolute top-2.5 right-2.5 flex gap-1 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleStats}
          title="View stats"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = habitColor; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
        >
          <BarChart2 size={11} />
        </button>
        <button
          onClick={handleEdit}
          title="Edit"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={handleDelete}
          title="Delete"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-danger)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div
        className="flex items-center gap-3"
        style={{
          paddingLeft: compact ? 20 : 24,
          paddingRight: 16,
          paddingTop: compact ? 10 : 14,
          paddingBottom: compact ? 10 : 14,
        }}
      >
        {/* Left: Avatar circle with optional progress ring for measurable */}
        <div
          className="flex-shrink-0 relative"
          style={{ width: ringSize, height: ringSize }}
        >
          {/* Progress ring overlay for measurable habits */}
          {isMeasurable && (
            <ProgressRing
              progress={progress}
              size={ringSize}
              strokeWidth={strokeW}
              color={isCompleted ? '#22c55e' : habitColor}
              bgColor="var(--color-bg-tertiary)"
            />
          )}
          <div
            className="rounded-full flex items-center justify-center font-bold transition-all duration-300 select-none"
            style={{
              width: isMeasurable ? ringSize - strokeW * 2 - 2 : ringSize,
              height: isMeasurable ? ringSize - strokeW * 2 - 2 : ringSize,
              margin: isMeasurable ? strokeW + 1 : 0,
              backgroundColor: isCompleted ? 'rgba(34,197,94,0.15)' : `${habitColor}22`,
              border: isMeasurable
                ? 'none'
                : `2px solid ${isCompleted ? 'rgba(34,197,94,0.45)' : `${habitColor}55`}`,
              fontSize: habit.icon ? (compact ? '18px' : '22px') : (compact ? '15px' : '18px'),
              color: isCompleted ? '#22c55e' : habitColor,
              boxShadow: isCompleted
                ? '0 0 0 4px rgba(34,197,94,0.1)'
                : justCompleted
                ? `0 0 0 6px ${habitColor}25`
                : `0 0 0 3px ${habitColor}11`,
              transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
            }}
          >
            {isCompleted ? (
              <Check size={compact ? 18 : 22} strokeWidth={3} />
            ) : (
              <span style={{ lineHeight: 1 }}>{avatarContent}</span>
            )}
          </div>
        </div>

        {/* Center content */}
        <div
          className="flex-1 min-w-0"
          style={{
            paddingRight: isHovered ? '5.5rem' : '0.5rem',
            transition: 'padding-right 0.15s ease',
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="font-bold leading-snug"
              style={{
                fontSize: compact ? 13 : 15,
                color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {habit.name}
            </p>

            {/* Streak flame badge */}
            {habit.streak > 0 && (
              <span
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{
                  fontSize: 10,
                  backgroundColor: habit.streak >= 7 ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.1)',
                  color: '#f97316',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}
              >
                🔥 {habit.streak}
              </span>
            )}
          </div>

          {!compact && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {freqLabel(habit)}
            </p>
          )}

          {/* Measurable progress bar */}
          {isMeasurable && !compact && (
            <div className="mt-2">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    backgroundColor: isCompleted ? '#22c55e' : habitColor,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {currentValue} / {habit.target} {habit.unit}
              </p>
            </div>
          )}
        </div>

        {/* Right: Check-in controls */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {isMeasurable ? (
            /* Measurable: +/count/- */
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleIncrement}
                title={`Add 1 ${habit.unit ?? ''}`}
                className="rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  width: compact ? 32 : 36,
                  height: compact ? 32 : 36,
                  backgroundColor: isCompleted ? 'rgba(34,197,94,0.2)' : `${habitColor}22`,
                  color: isCompleted ? '#22c55e' : habitColor,
                  border: `1.5px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : `${habitColor}55`}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.12)';
                  e.currentTarget.style.backgroundColor = isCompleted ? 'rgba(34,197,94,0.3)' : `${habitColor}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = isCompleted ? 'rgba(34,197,94,0.2)' : `${habitColor}22`;
                }}
              >
                <Plus size={compact ? 12 : 15} strokeWidth={2.5} />
              </button>

              <span
                className="font-bold tabular-nums text-center"
                style={{
                  fontSize: compact ? 11 : 13,
                  color: isCompleted ? '#22c55e' : habitColor,
                  minWidth: 28,
                }}
              >
                {currentValue}
              </span>

              <button
                onClick={handleDecrement}
                disabled={currentValue <= 0}
                title={`Remove 1 ${habit.unit ?? ''}`}
                className="rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  width: compact ? 32 : 36,
                  height: compact ? 32 : 36,
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-muted)',
                  border: '1.5px solid var(--color-border)',
                  opacity: currentValue <= 0 ? 0.35 : 1,
                  cursor: currentValue <= 0 ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (currentValue > 0) {
                    e.currentTarget.style.transform = 'scale(1.12)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <Minus size={compact ? 12 : 15} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            /* Boolean: large circle checkbox */
            <button
              onClick={handleBooleanToggle}
              className="flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                backgroundColor: isCompleted ? habitColor : 'transparent',
                border: `2.5px solid ${isCompleted ? habitColor : 'var(--color-border)'}`,
                color: isCompleted ? 'white' : 'transparent',
                boxShadow: isCompleted
                  ? `0 0 0 4px ${habitColor}22, var(--shadow-sm)`
                  : 'none',
                transform: justCompleted ? 'scale(0.88)' : 'scale(1)',
                transition: 'transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.borderColor = habitColor;
                  e.currentTarget.style.backgroundColor = `${habitColor}18`;
                  e.currentTarget.style.color = habitColor;
                }
                if (!justCompleted) e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'transparent';
                }
                e.currentTarget.style.transform = justCompleted ? 'scale(0.88)' : 'scale(1)';
              }}
            >
              <Check size={compact ? 16 : 20} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="px-6 pb-3 -mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>
          Failed to update — please try again.
        </div>
      )}
    </div>
  );
});
