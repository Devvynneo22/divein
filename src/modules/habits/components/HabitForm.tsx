import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
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

const DAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Maps pill index (0=Mon) → JS day-of-week (0=Sun): Mon=1, Tue=2,...Sat=6, Sun=0
const PILL_TO_DOW = [1, 2, 3, 4, 5, 6, 0];

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
    if (habit?.frequency.type === 'weekly') {
      return (habit.frequency as { type: 'weekly'; days: number[] }).days;
    }
    return [1, 2, 3, 4, 5];
  });

  const [xPerWeekTimes, setXPerWeekTimes] = useState<number>(() => {
    if (habit?.frequency.type === 'xPerWeek') {
      return (habit.frequency as { type: 'xPerWeek'; times: number }).times;
    }
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

  const baseInputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    width: '100%',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    transition: 'border-color 0.15s ease',
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--color-accent)';
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--color-border)';
  }

  const freqCards: { value: FrequencyType; label: string; sub: string }[] = [
    { value: 'daily', label: 'Daily', sub: 'Every day' },
    { value: 'xPerWeek', label: 'X / week', sub: 'Flexible days' },
    { value: 'weekly', label: 'Specific days', sub: 'Pick days' },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {habit ? 'Edit Habit' : 'New Habit'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Emoji icon — large input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Icon / Emoji
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🏃"
          maxLength={4}
          className="text-center"
          style={{
            ...baseInputStyle,
            fontSize: 32,
            padding: '12px',
            letterSpacing: 0,
            height: 64,
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Type or paste an emoji
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Name <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
          style={baseInputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {nameError && (
          <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
            {nameError}
          </p>
        )}
      </div>

      {/* Color picker — 8 large swatches */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Color
        </label>
        <div className="flex gap-3 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="rounded-full flex-shrink-0 transition-all duration-150 flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                backgroundColor: c,
                outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                outlineOffset: 3,
                boxShadow: color === c ? `0 0 0 5px var(--color-bg-elevated), var(--shadow-sm)` : 'none',
                transform: color === c ? 'scale(1.12)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (color !== c) e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                if (color !== c) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {color === c && (
                <Check size={14} color="white" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency — visual radio cards */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Frequency
        </label>
        <div className="grid grid-cols-3 gap-2">
          {freqCards.map((card) => {
            const active = freqType === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setFreqType(card.value)}
                className="flex flex-col items-center rounded-xl py-3 px-2 transition-all duration-150"
                style={{
                  backgroundColor: active ? `${color}18` : 'var(--color-bg-tertiary)',
                  border: active
                    ? `1.5px solid ${color}88`
                    : '1.5px solid var(--color-border)',
                  color: active ? color : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
              >
                <span className="text-sm font-bold">{card.label}</span>
                <span className="text-xs mt-0.5 opacity-70">{card.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Day pills for specific days */}
        {freqType === 'weekly' && (
          <div className="flex gap-1.5 flex-wrap mt-1">
            {DAYS_FULL.map((day, pillIdx) => {
              const dow = PILL_TO_DOW[pillIdx];
              const active = weeklyDays.includes(dow);
              return (
                <button
                  key={pillIdx}
                  type="button"
                  onClick={() => handleToggleDay(pillIdx)}
                  className="rounded-full text-xs font-semibold transition-all duration-150 flex-shrink-0 flex items-center justify-center px-3 py-1.5"
                  style={{
                    backgroundColor: active ? color : 'var(--color-bg-tertiary)',
                    color: active ? 'white' : 'var(--color-text-secondary)',
                    border: active ? `1.5px solid ${color}` : '1.5px solid var(--color-border)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.borderColor = color;
                      e.currentTarget.style.color = color;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {/* X per week counter */}
        {freqType === 'xPerWeek' && (
          <div className="flex items-center gap-4 mt-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={() => setXPerWeekTimes((v) => Math.max(1, v - 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all duration-150 flex-shrink-0"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-extrabold" style={{ color }}>{xPerWeekTimes}</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>times per week</p>
            </div>
            <button
              type="button"
              onClick={() => setXPerWeekTimes((v) => Math.min(7, v + 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-all duration-150 flex-shrink-0"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Habit type — visual radio cards */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'boolean' as HabitType, label: '✓ Yes / No', sub: 'Done or not done' },
            { value: 'measurable' as HabitType, label: '📏 Measurable', sub: 'Track a quantity' },
          ]).map((card) => {
            const active = habitType === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setHabitType(card.value)}
                className="flex flex-col items-center rounded-xl py-3 px-2 transition-all duration-150"
                style={{
                  backgroundColor: active ? `${color}18` : 'var(--color-bg-tertiary)',
                  border: active
                    ? `1.5px solid ${color}88`
                    : '1.5px solid var(--color-border)',
                  color: active ? color : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
              >
                <span className="text-sm font-bold">{card.label}</span>
                <span className="text-xs mt-0.5 opacity-70">{card.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Measurable target + unit */}
        {habitType === 'measurable' && (
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex flex-col gap-1 w-20">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Target
              </label>
              <input
                type="number"
                min={1}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                style={{
                  ...baseInputStyle,
                  padding: '8px 10px',
                  textAlign: 'center',
                  width: 80,
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="km, pages, min..."
                style={{ ...baseInputStyle, padding: '8px 10px' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note about this habit..."
          rows={2}
          style={{
            ...baseInputStyle,
            resize: 'none',
            padding: '10px 12px',
          }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      {/* Group */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          Group
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            setShowGroupSuggestions(true);
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            setShowGroupSuggestions(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            setTimeout(() => setShowGroupSuggestions(false), 150);
          }}
          placeholder="e.g. 🌅 Morning Routine, Health..."
          style={baseInputStyle}
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
                className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-150"
          style={{
            background: `linear-gradient(135deg, ${PRESET_COLORS[0]}, ${PRESET_COLORS[4]})`,
            backgroundColor: 'var(--color-accent)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          {habit ? 'Save Changes' : 'Create Habit'}
        </button>
      </div>
    </form>
  );
}
