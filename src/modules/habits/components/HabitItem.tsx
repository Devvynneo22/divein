import { memo, useState, useCallback } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { HabitWithStatus } from '@/shared/types/habit';
import { useCheckIn, useUncheckIn } from '../hooks/useHabits';

interface HabitItemProps {
  habit: HabitWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (habit: HabitWithStatus) => void;
  onDelete: (id: string) => void;
}

/** Returns a readable frequency label */
function freqLabel(habit: HabitWithStatus): string {
  const f = habit.frequency;
  if (f.type === 'daily') return 'Daily';
  if (f.type === 'xPerWeek') return `${f.times}× / week`;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return f.days.map((d) => dayNames[d]).join(', ');
}

/** Weekly progress: how many times completed this ISO week */
function useWeeklyProgress(habit: HabitWithStatus): { done: number; target: number } | null {
  if (habit.frequency.type !== 'xPerWeek') return null;
  return { done: 0, target: (habit.frequency as { type: 'xPerWeek'; times: number }).times };
}

export const HabitItem = memo(function HabitItem({
  habit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: HabitItemProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [error, setError] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const mutationOptions = {
    onError: (err: unknown) => {
      console.error('Habit check-in failed:', err);
      setError(true);
      setTimeout(() => setError(false), 3000);
    },
  };
  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();

  const [inputValue, setInputValue] = useState<string>(
    habit.todayEntry ? String(habit.todayEntry.value) : '',
  );

  const isMeasurable = !!habit.unit;
  const currentValue = habit.todayEntry?.value ?? 0;
  const progress = isMeasurable ? Math.min(currentValue / habit.target, 1) : 0;
  const habitColor = habit.color ?? 'var(--color-accent)';
  const isCompleted = habit.isCompletedToday;
  const weeklyProgress = useWeeklyProgress(habit);

  const handleSelect = useCallback(() => onSelect(habit.id), [onSelect, habit.id]);
  const handleEdit = useCallback(() => onEdit(habit), [onEdit, habit]);
  const handleDelete = useCallback(() => onDelete(habit.id), [onDelete, habit.id]);

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (isCompleted) {
      setJustCompleted(false);
      uncheckIn.mutate({ habitId: habit.id, date: today }, mutationOptions);
    } else {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 600);
      checkIn.mutate({ habitId: habit.id, date: today, value: 1 }, mutationOptions);
    }
  }

  function handleMeasurableSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val > 0) {
      checkIn.mutate({ habitId: habit.id, date: today, value: val }, mutationOptions);
    } else if (inputValue === '' || val === 0) {
      uncheckIn.mutate({ habitId: habit.id, date: today }, mutationOptions);
    }
  }

  function handleInputClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const cardOpacity = isCompleted ? 0.65 : 1;

  return (
    <div
      className="habit-card rounded-xl cursor-pointer transition-all duration-200"
      onClick={handleSelect}
      style={{
        opacity: cardOpacity,
        backgroundColor: isCompleted
          ? 'var(--color-bg-tertiary)'
          : isSelected
          ? 'var(--color-bg-elevated)'
          : 'var(--color-bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        borderLeft: `3px solid ${habitColor}`,
        boxShadow: isSelected ? 'var(--shadow-md)' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          e.currentTarget.style.borderLeftColor = habitColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.borderLeftColor = habitColor;
        }
      }}
    >
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Large checkbox / check-in button */}
        <div className="flex-shrink-0" onClick={handleInputClick}>
          {isMeasurable ? (
            <form onSubmit={handleMeasurableSubmit} className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step="any"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0"
                className="w-16 px-2 py-1.5 rounded-lg text-xs text-center transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {habit.unit}
              </span>
              <button
                type="submit"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
                style={{
                  backgroundColor: isCompleted ? habitColor : 'transparent',
                  border: `2px solid ${isCompleted ? habitColor : 'var(--color-border)'}`,
                  color: isCompleted ? 'white' : 'var(--color-text-muted)',
                  transform: justCompleted ? 'scale(0.9)' : 'scale(1)',
                }}
              >
                <Check size={16} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleBooleanToggle}
              className="flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
              style={{
                width: 40,
                height: 40,
                backgroundColor: isCompleted ? habitColor : 'transparent',
                border: `2px solid ${isCompleted ? habitColor : 'var(--color-border)'}`,
                color: isCompleted ? 'white' : 'transparent',
                transform: justCompleted ? 'scale(0.88)' : 'scale(1)',
                boxShadow: isCompleted ? `0 0 0 4px ${habitColor}22` : 'none',
              }}
            >
              <Check size={18} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Icon */}
        {habit.icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: `${habitColor}18` }}
          >
            {habit.icon}
          </div>
        )}

        {/* Name + freq label */}
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate transition-all duration-200"
            style={{
              fontSize: 16,
              color: 'var(--color-text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {habit.name}
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
            {freqLabel(habit)}
            {habit.groupName ? ` · ${habit.groupName}` : ''}
          </p>
        </div>

        {/* Weekly progress ring for xPerWeek */}
        {weeklyProgress && (
          <div className="flex-shrink-0" title={`${weeklyProgress.done}/${weeklyProgress.target} this week`}>
            <svg width={28} height={28} viewBox="0 0 28 28">
              <circle cx={14} cy={14} r={11} fill="none" stroke="var(--color-border)" strokeWidth={3} />
              <circle
                cx={14}
                cy={14}
                r={11}
                fill="none"
                stroke={habitColor}
                strokeWidth={3}
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - weeklyProgress.done / weeklyProgress.target)}`}
                strokeLinecap="round"
                transform="rotate(-90 14 14)"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
          </div>
        )}

        {/* Measurable progress ring */}
        {isMeasurable && !weeklyProgress && (
          <div className="flex-shrink-0" title={`${currentValue}/${habit.target} ${habit.unit}`}>
            <svg width={28} height={28} viewBox="0 0 28 28">
              <circle cx={14} cy={14} r={11} fill="none" stroke="var(--color-border)" strokeWidth={3} />
              <circle
                cx={14}
                cy={14}
                r={11}
                fill="none"
                stroke={habitColor}
                strokeWidth={3}
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - progress)}`}
                strokeLinecap="round"
                transform="rotate(-90 14 14)"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>
          </div>
        )}

        {/* Streak counter */}
        {habit.streak > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: habit.streak >= 7 ? '#f97316' + '22' : 'var(--color-bg-tertiary)',
            }}
          >
            <span className="text-sm">🔥</span>
            <span
              className="text-xs font-semibold"
              style={{
                color: habit.streak >= 7 ? '#f97316' : 'var(--color-text-secondary)',
              }}
            >
              {habit.streak}
            </span>
          </div>
        )}
      </div>

      {/* Measurable progress bar */}
      {isMeasurable && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {currentValue} / {habit.target} {habit.unit}
            </span>
            <span className="text-xs font-medium" style={{ color: habitColor }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: habitColor,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Error feedback */}
      {error && (
        <div className="px-4 pb-2 text-xs" style={{ color: 'var(--color-danger)' }}>
          Failed to update — please try again.
        </div>
      )}

      {/* Expanded actions */}
      {isSelected && (
        <div
          className="flex items-center gap-2 px-4 pb-3 pt-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--color-danger)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
});
