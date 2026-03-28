import { memo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { HabitWithStatus } from '@/shared/types/habit';
import { useCheckIn, useUncheckIn } from '../hooks/useHabits';

interface HabitItemProps {
  habit: HabitWithStatus;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  const checkIn = useCheckIn();
  const uncheckIn = useUncheckIn();

  const [inputValue, setInputValue] = useState<string>(
    habit.todayEntry ? String(habit.todayEntry.value) : '',
  );

  const isMeasurable = !!habit.unit;
  const currentValue = habit.todayEntry?.value ?? 0;
  const progress = isMeasurable ? Math.min(currentValue / habit.target, 1) : 0;
  const habitColor = habit.color ?? 'var(--color-accent)';

  function handleBooleanToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (habit.isCompletedToday) {
      uncheckIn.mutate({ habitId: habit.id, date: today });
    } else {
      checkIn.mutate({ habitId: habit.id, date: today, value: 1 });
    }
  }

  function handleMeasurableSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val > 0) {
      checkIn.mutate({ habitId: habit.id, date: today, value: val });
    } else if (inputValue === '' || val === 0) {
      uncheckIn.mutate({ habitId: habit.id, date: today });
    }
  }

  function handleInputClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className={`rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'bg-[var(--color-bg-elevated)] border-[var(--color-border-hover)]'
          : 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-elevated)]'
      }`}
      onClick={onSelect}
      style={{ borderLeft: `3px solid ${habitColor}` }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon / color dot */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
          style={{ backgroundColor: `${habitColor}22` }}
        >
          {habit.icon ? (
            <span>{habit.icon}</span>
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habitColor }} />
          )}
        </div>

        {/* Name + group */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {habit.name}
          </p>
          {habit.groupName && (
            <p className="text-xs text-[var(--color-text-muted)] truncate">{habit.groupName}</p>
          )}
        </div>

        {/* Streak */}
        {habit.streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] flex-shrink-0">
            <span className="text-xs">{FLAME}</span>
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {habit.streak}
            </span>
          </div>
        )}

        {/* Check-in control */}
        <div className="flex-shrink-0" onClick={handleInputClick}>
          {isMeasurable ? (
            <form onSubmit={handleMeasurableSubmit} className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step="any"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0"
                className="w-16 px-2 py-1 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-center"
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {habit.unit}
              </span>
              <button
                type="submit"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  habit.isCompletedToday
                    ? 'text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
                style={habit.isCompletedToday ? { backgroundColor: habitColor } : undefined}
              >
                <Check size={12} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleBooleanToggle}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                habit.isCompletedToday
                  ? 'text-white border-transparent'
                  : 'border-[var(--color-border)] text-transparent hover:border-[var(--color-border-hover)]'
              }`}
              style={habit.isCompletedToday ? { backgroundColor: habitColor, borderColor: habitColor } : undefined}
            >
              <Check size={14} />
            </button>
          )}
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-[var(--color-text-muted)]">
          {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Measurable progress bar */}
      {isMeasurable && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--color-text-muted)]">
              {currentValue} / {habit.target} {habit.unit}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, backgroundColor: habitColor }}
            />
          </div>
        </div>
      )}

      {/* Expanded actions */}
      {isSelected && (
        <div
          className="flex items-center gap-2 px-4 pb-3 pt-1 border-t border-[var(--color-border)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
});
