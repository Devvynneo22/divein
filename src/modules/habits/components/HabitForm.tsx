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

  const inputStyle = {
    backgroundColor: 'var(--color-bg-tertiary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const inputFocusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--color-accent)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--color-border)';
    },
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {habit ? 'Edit Habit' : 'New Habit'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Name <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          className="input-base px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
          style={inputStyle}
          {...inputFocusHandlers}
        />
        {nameError && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{nameError}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none"
          style={inputStyle}
          {...inputFocusHandlers}
        />
      </div>

      {/* Color + Icon row */}
      <div className="flex gap-4">
        {/* Color picker */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: color === c ? `0 0 0 2px var(--color-bg-elevated)` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon (emoji) */}
        <div className="flex flex-col gap-1.5 w-24">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Icon</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏃"
            maxLength={4}
            className="input-base px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors text-center"
            style={inputStyle}
            {...inputFocusHandlers}
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Frequency</label>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'xPerWeek'] as FrequencyType[]).map((ft) => (
            <button
              key={ft}
              type="button"
              onClick={() => setFreqType(ft)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                freqType === ft
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
              }
              onMouseEnter={(e) => {
                if (freqType !== ft) e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (freqType !== ft) e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
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
                className="w-10 h-10 rounded-full text-xs font-medium transition-colors"
                style={
                  weeklyDays.includes(idx)
                    ? { backgroundColor: color, color: 'white' }
                    : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
                }
                onMouseEnter={(e) => {
                  if (!weeklyDays.includes(idx)) e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  if (!weeklyDays.includes(idx)) e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
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
              className="input-base w-16 px-2 py-2 rounded-lg border text-sm outline-none transition-colors text-center"
              style={inputStyle}
              {...inputFocusHandlers}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>times per week</span>
          </div>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Type</label>
        <div className="flex gap-2">
          {(['boolean', 'measurable'] as HabitType[]).map((ht) => (
            <button
              key={ht}
              type="button"
              onClick={() => setHabitType(ht)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={
                habitType === ht
                  ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                  : { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }
              }
              onMouseEnter={(e) => {
                if (habitType !== ht) e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                if (habitType !== ht) e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              {ht === 'boolean' ? '✓ Yes/No' : '📏 Measurable'}
            </button>
          ))}
        </div>

        {habitType === 'measurable' && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Target</label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="input-base w-20 px-2 py-2 rounded-lg border text-sm outline-none transition-colors text-center"
                style={inputStyle}
                {...inputFocusHandlers}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="km, pages, min..."
                className="input-base px-2 py-2 rounded-lg border text-sm outline-none transition-colors"
                style={inputStyle}
                {...inputFocusHandlers}
              />
            </div>
          </div>
        )}
      </div>

      {/* Group name */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Group</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            setShowGroupSuggestions(true);
          }}
          onBlur={(e) => {
            inputFocusHandlers.onBlur(e as React.FocusEvent<HTMLInputElement>);
            setTimeout(() => setShowGroupSuggestions(false), 150);
          }}
          onFocus={inputFocusHandlers.onFocus as React.FocusEventHandler<HTMLInputElement>}
          placeholder="e.g. Health, Work..."
          className="input-base px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
          style={inputStyle}
        />
        {showGroupSuggestions && filteredGroups.length > 0 && (
          <div
            className="absolute top-full mt-1 left-0 right-0 z-10 rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-popup)',
            }}
          >
            {filteredGroups.map((g) => (
              <button
                key={g}
                type="button"
                onMouseDown={() => {
                  setGroupName(g);
                  setShowGroupSuggestions(false);
                }}
                className="w-full text-left px-3 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--color-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          {habit ? 'Save Changes' : 'Create Habit'}
        </button>
      </div>
    </form>
  );
}
