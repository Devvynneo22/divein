import { memo, useState, useCallback } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
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

const FLAME = '🔥';

export const HabitItem = memo(function HabitItem({
  habit,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: HabitItemProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [error, setError] = useState(false);
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

  const handleSelect = useCallback(() => onSelect(habit.id), [onSelect, habit.id]);
  const handleEdit = useCallback(() => onEdit(habit), [onEdit, habit]);
  const handleDelete = useCallback(() => onDelete(habit.id), [onDelete, habit.id]);

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (habit.isCompletedToday) {
      uncheckIn.mutate({ habitId: habit.id, date: today }, mutationOptions);
    } else {
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

  return (
    <div
      className="rounded-xl transition-all cursor-pointer"
      onClick={handleSelect}
      style={{
        backgroundColor: isSelected ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        borderLeft: `3px solid ${habitColor}`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
          e.currentTarget.style.borderLeftColor = habitColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
          e.currentTarget.style.borderLeftColor = habitColor;
        }
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Icon / color dot */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: `${habitColor}22` }}
        >
          {habit.icon ? (
            <span>{habit.icon}</span>
          ) : (
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: habitColor }} />
          )}
        </div>

        {/* Name + group */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
            {habit.name}
          </p>
          {habit.groupName && (
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{habit.groupName}</p>
          )}
        </div>

        {/* Streak */}
        {habit.streak > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <span className="text-xs">{FLAME}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {habit.streak}
            </span>
          </div>
        )}

        {/* Check-in control */}
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
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: habit.isCompletedToday ? habitColor : 'var(--color-bg-tertiary)',
                  color: habit.isCompletedToday ? 'white' : 'var(--color-text-muted)',
                }}
              >
                <Check size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleBooleanToggle}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                backgroundColor: habit.isCompletedToday ? habitColor : 'transparent',
                border: `2px solid ${habit.isCompletedToday ? habitColor : 'var(--color-border)'}`,
                color: habit.isCompletedToday ? 'white' : 'transparent',
              }}
            >
              <Check size={14} />
            </button>
          )}
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Measurable progress bar */}
      {isMeasurable && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {currentValue} / {habit.target} {habit.unit}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, backgroundColor: habitColor }}
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
