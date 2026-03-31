import { memo, useState, useCallback } from 'react';
import { Check, Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import type { HabitWithStatus } from '@/shared/types/habit';
import { useCheckIn, useUncheckIn } from '../hooks/useHabits';
import { toast } from '@/shared/stores/toastStore';

interface HabitItemProps {
  habit: HabitWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (habit: HabitWithStatus) => void;
  onDelete: (id: string) => void;
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

export const HabitItem = memo(function HabitItem({
  habit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: HabitItemProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [isHovered, setIsHovered] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [error, setError] = useState(false);

  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();

  const isMeasurable = !!habit.unit;
  const currentValue = habit.todayEntry?.value ?? 0;
  const habitColor = habit.color ?? 'var(--color-accent)';
  const isCompleted = habit.isCompletedToday;
  const progress = isMeasurable ? Math.min(currentValue / Math.max(habit.target, 1), 1) : 0;
  const avatarContent = habit.icon ?? habit.name.charAt(0).toUpperCase();

  const onMutationError = (err: unknown) => {
    console.error('Habit check-in failed:', err);
    setError(true);
    setTimeout(() => setError(false), 3000);
  };

  const handleSelect = useCallback(() => onSelect(habit.id), [onSelect, habit.id]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(habit);
    },
    [onEdit, habit],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(habit.id);
    },
    [onDelete, habit.id],
  );

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted) {
      uncheckIn.mutate({ habitId: habit.id, date: today }, { onError: onMutationError });
    } else {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
      checkIn.mutate(
        { habitId: habit.id, date: today, value: 1 },
        {
          onError: onMutationError,
          onSuccess: () => toast.success('Habit checked in ✓'),
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

  const cardBg = isCompleted
    ? 'rgba(34,197,94,0.06)'
    : 'var(--color-bg-elevated)';

  return (
    <div
      className="rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden"
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: cardBg,
        border: cardBorder,
        boxShadow: isHovered
          ? 'var(--shadow-md)'
          : isSelected
          ? 'var(--shadow-sm)'
          : 'none',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
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

      {/* Hover action buttons — fade in top-right */}
      <div
        className="absolute top-3 right-3 flex gap-1 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleEdit}
          title="Edit"
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
          }}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
            e.currentTarget.style.borderColor = 'var(--color-danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div className="flex items-center gap-4 pl-6 pr-4 py-4">
        {/* Left: Avatar circle */}
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center font-bold transition-all duration-300 select-none"
          style={{
            width: 52,
            height: 52,
            backgroundColor: isCompleted
              ? 'rgba(34,197,94,0.15)'
              : `${habitColor}22`,
            border: `2px solid ${isCompleted ? 'rgba(34,197,94,0.45)' : `${habitColor}55`}`,
            fontSize: habit.icon ? '22px' : '18px',
            color: isCompleted ? '#22c55e' : habitColor,
            boxShadow: isCompleted
              ? '0 0 0 4px rgba(34,197,94,0.1)'
              : `0 0 0 4px ${habitColor}11`,
          }}
        >
          {isCompleted ? (
            <Check size={22} strokeWidth={3} />
          ) : (
            <span style={{ lineHeight: 1 }}>{avatarContent}</span>
          )}
        </div>

        {/* Center content */}
        <div className="flex-1 min-w-0" style={{ paddingRight: isHovered ? '4.5rem' : '0.5rem', transition: 'padding-right 0.15s ease' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="font-bold leading-snug"
              style={{
                fontSize: 15,
                color: isCompleted ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}
            >
              {habit.name}
            </p>
            {/* Streak badge — only show if > 1 */}
            {habit.streak > 1 && (
              <span
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{
                  fontSize: 11,
                  backgroundColor: habit.streak >= 7 ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.1)',
                  color: '#f97316',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}
              >
                🔥 {habit.streak}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {freqLabel(habit)}
          </p>

          {/* Measurable progress bar */}
          {isMeasurable && (
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
            /* Measurable: +/count/- vertical stack */
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleIncrement}
                title={`Add 1 ${habit.unit ?? ''}`}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  backgroundColor: isCompleted ? 'rgba(34,197,94,0.2)' : `${habitColor}22`,
                  color: isCompleted ? '#22c55e' : habitColor,
                  border: `1.5px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : `${habitColor}55`}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.12)';
                  e.currentTarget.style.backgroundColor = isCompleted
                    ? 'rgba(34,197,94,0.3)'
                    : `${habitColor}44`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = isCompleted
                    ? 'rgba(34,197,94,0.2)'
                    : `${habitColor}22`;
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
              </button>

              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: isCompleted ? '#22c55e' : habitColor, minWidth: 28, textAlign: 'center' }}
              >
                {currentValue}
              </span>

              <button
                onClick={handleDecrement}
                disabled={currentValue <= 0}
                title={`Remove 1 ${habit.unit ?? ''}`}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
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
                <Minus size={15} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            /* Boolean: large circle checkbox */
            <button
              onClick={handleBooleanToggle}
              className="flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                width: 48,
                height: 48,
                backgroundColor: isCompleted ? habitColor : 'transparent',
                border: `2.5px solid ${isCompleted ? habitColor : 'var(--color-border)'}`,
                color: isCompleted ? 'white' : 'transparent',
                boxShadow: isCompleted
                  ? `0 0 0 4px ${habitColor}22, var(--shadow-sm)`
                  : 'none',
                transform: justCompleted ? 'scale(0.88)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!isCompleted) {
                  e.currentTarget.style.borderColor = habitColor;
                  e.currentTarget.style.backgroundColor = `${habitColor}18`;
                  e.currentTarget.style.color = habitColor;
                }
                e.currentTarget.style.transform = justCompleted ? 'scale(0.88)' : 'scale(1.06)';
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
              <Check size={20} strokeWidth={3} />
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
