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
  '#f97316', // orange
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f59e0b', // amber
];

const PRESET_EMOJIS = [
  '🏃', '💪', '📚', '🧘', '💧', '🥗', '😴', '🎯',
  '✍️', '🎵', '🌿', '💊', '🚴', '🏊', '🧹', '💡',
];

const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
// Maps pill index (0=Mon) → JS day-of-week (0=Sun): Mon=1, Tue=2,...Sat=6, Sun=0
const PILL_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

type FrequencyType = 'daily' | 'weekly' | 'xPerWeek';
type HabitType = 'boolean' | 'measurable';

export function HabitForm({ habit, existingGroups, onSave, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [color, setColor] = useState(habit?.color ?? PRESET_COLORS[0]);
  const [icon, setIcon] = useState(habit?.icon ?? '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupName, setGroupName] = useState(habit?.groupName ?? '');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  const [freqType, setFreqType] = useState<FrequencyType>(() => {
    if (!habit) return 'daily';
    return habit.frequency.type as FrequencyType;
  });

  // weeklyDays stored as DOW (0=Sun). Pills are Mon-indexed, converted on toggle.
  const [weeklyDays, setWeeklyDays] = useState<number[]>(() => {
    if (habit?.frequency.type === 'weekly') return habit.frequency.days;
    return [1, 2, 3, 4, 5]; // Mon-Fri default
  });
  const [xPerWeekTimes, setXPerWeekTimes] = useState<number>(() => {
    if (habit?.frequency.type === 'xPerWeek') return (habit.frequency as { type: 'xPerWeek'; times: number }).times;
    return 3;
  });

  const [habitType, setHabitType] = useState<HabitType>(() =>
    habit?.unit ? 'measurable' : 'boolean',
  );
  const [target, setTarget] = useState<number>(habit?.target ?? 1);
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (habitType === 'boolean') setTarget(1);
  }, [habitType]);

  function buildFrequency(): HabitFrequency {
    if (freqType === 'daily') return { type: 'daily' };
    if (freqType === 'weekly') return { type: 'weekly', days: weeklyDays };
    return { type: 'xPerWeek', times: xPerWeekTimes };
  }

  function handleToggleDay(pillIdx: number) {
    const dow = PILL_TO_DOW[pillIdx];
    setWeeklyDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow],
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

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-tertiary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
  };

  const inputFocusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = 'var(--color-accent)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

      {/* Name + emoji icon row */}
      <div className="flex gap-2 items-start">
        {/* Emoji picker trigger */}
        <div className="flex flex-col gap-1 flex-shrink-0 relative">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Icon
          </label>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            className="w-11 h-10 rounded-lg border text-xl flex items-center justify-center transition-colors"
            style={{
              backgroundColor: icon ? `${color}18` : 'var(--color-bg-tertiary)',
              borderColor: showEmojiPicker ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            {icon || '😊'}
          </button>
          {showEmojiPicker && (
            <div
              className="absolute top-full mt-1 left-0 z-20 rounded-xl p-2 grid"
              style={{
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 4,
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-popup)',
                width: 160,
              }}
            >
              {PRESET_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: icon === em ? 'var(--color-bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = icon === em ? 'var(--color-bg-hover)' : 'transparent';
                  }}
                  onClick={() => {
                    setIcon(em);
                    setShowEmojiPicker(false);
                  }}
                >
                  {em}
                </button>
              ))}
              {/* Clear button */}
              <button
                type="button"
                className="col-span-4 text-xs py-1 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                onClick={() => {
                  setIcon('');
                  setShowEmojiPicker(false);
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1 flex-1">
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
      </div>

      {/* Color picker — 8 swatches */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Color</label>
        <div className="flex gap-2.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="rounded-full transition-transform hover:scale-110 flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                backgroundColor: c,
                outline: color === c ? `2px solid ${c}` : 'none',
                outlineOffset: '2px',
                boxShadow: color === c ? `0 0 0 3px var(--color-bg-elevated)` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Frequency</label>
        <div className="flex gap-2 flex-wrap">
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

        {/* Day-of-week pills (Mon-indexed) */}
        {freqType === 'weekly' && (
          <div className="flex gap-1.5">
            {DAYS_SHORT.map((day, pillIdx) => {
              const dow = PILL_TO_DOW[pillIdx];
              const active = weeklyDays.includes(dow);
              return (
                <button
                  key={pillIdx}
                  type="button"
                  onClick={() => handleToggleDay(pillIdx)}
                  className="rounded-full text-xs font-semibold transition-all duration-150 flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: active ? color : 'var(--color-bg-tertiary)',
                    color: active ? 'white' : 'var(--color-text-secondary)',
                    boxShadow: active ? `0 0 0 2px ${color}44` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {freqType === 'xPerWeek' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)' }}>
              <button
                type="button"
                className="px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onClick={() => setXPerWeekTimes((v) => Math.max(1, v - 1))}
              >−</button>
              <span className="w-8 text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {xPerWeekTimes}
              </span>
              <button
                type="button"
                className="px-3 py-2 text-sm transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onClick={() => setXPerWeekTimes((v) => Math.min(7, v + 1))}
              >+</button>
            </div>
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
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
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
            e.currentTarget.style.borderColor = 'var(--color-border)';
            setTimeout(() => setShowGroupSuggestions(false), 150);
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
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
          style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-tertiary)' }}
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
