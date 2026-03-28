import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Habit, CreateHabitInput, UpdateHabitInput, HabitFrequency } from '@/shared/types/habit';

interface HabitFormProps {
  habit?: Habit;
  existingGroups: string[];
  onSave: (data: CreateHabitInput | UpdateHabitInput) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type FrequencyType = 'daily' | 'weekly' | 'xPerWeek';
type HabitType = 'boolean' | 'measurable';

export function HabitForm({ habit, existingGroups, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [color, setColor] = useState(habit?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(habit?.icon ?? '');
  const [groupName, setGroupName] = useState(habit?.groupName ?? '');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  const [freqType, setFreqType] = useState<FrequencyType>(() => {
    if (!habit) return 'daily';
    return habit.frequency.type as FrequencyType;
  });
  const [weeklyDays, setWeeklyDays] = useState<number[]>(() => {
    if (habit?.frequency.type === 'weekly') return habit.frequency.days;
    return [1, 2, 3, 4, 5]; // Mon-Fri default
  });
  const [xPerWeekTimes, setXPerWeekTimes] = useState<number>(() => {
    if (habit?.frequency.type === 'xPerWeek') return habit.frequency.times;
    return 3;
  });

  const [habitType, setHabitType] = useState<HabitType>(() =>
    habit?.unit ? 'measurable' : 'boolean',
  );
  const [target, setTarget] = useState<number>(habit?.target ?? 1);
  const [unit, setUnit] = useState(habit?.unit ?? '');

  const [nameError, setNameError] = useState('');

  // Reset unit if switching to boolean
  useEffect(() => {
    if (habitType === 'boolean') {
      setTarget(1);
    }
  }, [habitType]);

  function buildFrequency(): HabitFrequency {
    if (freqType === 'daily') return { type: 'daily' };
    if (freqType === 'weekly') return { type: 'weekly', days: weeklyDays };
    return { type: 'xPerWeek', times: xPerWeekTimes };
  }

  function handleToggleDay(day: number) {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    setNameError('');

    const data: CreateHabitInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      color: color || undefined,
      icon: icon.trim() || undefined,
      frequency: buildFrequency(),
      groupName: groupName.trim() || undefined,
      target: habitType === 'measurable' ? target : 1,
      unit: habitType === 'measurable' && unit.trim() ? unit.trim() : undefined,
    };

    onSave(data);
  }

  const filteredGroups = existingGroups.filter(
    (g) => g.toLowerCase().includes(groupName.toLowerCase()) && g !== groupName,
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {habit ? 'Edit Habit' : 'New Habit'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Name <span className="text-[var(--color-danger)]">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        {nameError && (
          <p className="text-xs text-[var(--color-danger)]">{nameError}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
        />
      </div>

      {/* Color + Icon row */}
      <div className="flex gap-4">
        {/* Color picker */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>
        </div>

        {/* Icon (emoji) */}
        <div className="flex flex-col gap-1.5 w-24">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Icon</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏃"
            maxLength={4}
            className="px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-center"
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Frequency</label>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'xPerWeek'] as FrequencyType[]).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFreqType(ft)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                freqType === ft
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {ft === 'daily' ? 'Daily' : ft === 'weekly' ? 'Specific days' : 'X per week'}
            </button>
          ))}
        </div>

        {freqType === 'weekly' && (
          <div className="flex gap-1.5 flex-wrap">
            {DAYS_OF_WEEK.map((day, idx) => (
              <button
                key={day}
                type="button"
                onClick={() => handleToggleDay(idx)}
                className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                  weeklyDays.includes(idx)
                    ? 'text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
                style={weeklyDays.includes(idx) ? { backgroundColor: color } : undefined}
              >
                {day}
              </button>
            ))}
          </div>
        )}

        {freqType === 'xPerWeek' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={7}
              value={xPerWeekTimes}
              onChange={(e) => setXPerWeekTimes(Number(e.target.value))}
              className="w-16 px-2 py-1.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-center"
            />
            <span className="text-sm text-[var(--color-text-secondary)]">times per week</span>
          </div>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Type</label>
        <div className="flex gap-2">
          {(['boolean', 'measurable'] as HabitType[]).map((ht) => (
            <button
              key={ht}
              type="button"
              onClick={() => setHabitType(ht)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                habitType === ht
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {ht === 'boolean' ? '✓ Yes/No' : '📏 Measurable'}
            </button>
          ))}
        </div>

        {habitType === 'measurable' && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Target</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-20 px-2 py-1.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--color-text-muted)]">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="km, pages, min..."
                className="px-2 py-1.5 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Group name */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Group</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            setShowGroupSuggestions(true);
          }}
          onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
          placeholder="e.g. Health, Work..."
          className="px-3 py-2 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        {showGroupSuggestions && filteredGroups.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 z-10 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-lg">
            {filteredGroups.map((g) => (
              <button
                key={g}
                type="button"
                onMouseDown={() => {
                  setGroupName(g);
                  setShowGroupSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          {habit ? 'Save Changes' : 'Create Habit'}
        </button>
      </div>
    </form>
  );
}
