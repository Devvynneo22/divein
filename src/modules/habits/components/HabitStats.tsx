import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import { Flame, TrendingUp, Calendar, Target } from 'lucide-react';
import type { Habit, HabitEntry } from '@/shared/types/habit';

interface HabitStatsProps {
  habit: Habit;
  entries: HabitEntry[];
  streak: number;
  longestStreak: number;
  rate7: number;
  rate30: number;
}

interface HeatmapDay {
  date: string;
  value: number;
  level: 0 | 1 | 2 | 3;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorAtLevel(baseColor: string | null, level: 0 | 1 | 2 | 3): string {
  if (level === 0) return 'var(--color-bg-tertiary)';
  const color = baseColor ?? '#3b82f6';
  const rgb = hexToRgb(color);
  const opacities = [0, 0.28, 0.6, 1];
  if (!rgb) {
    return `${color}${Math.round(opacities[level] * 255)
      .toString(16)
      .padStart(2, '0')}`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacities[level]})`;
}

// ─── Weekly view (last 7 days) ────────────────────────────────────────────────

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyHeatmap({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const isMeasurable = !!habit.unit;
  const habitColor = habit.color ?? '#3b82f6';
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div>
      <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        This Week
      </h3>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isFuture = day > today;
          const isToday = dateStr === format(today, 'yyyy-MM-dd');
          const entry = entries.find((e) => e.date === dateStr);
          const isComplete = !isFuture && entry !== undefined && entry.value >= habit.target;

          let level: 0 | 1 | 2 | 3 = 0;
          if (!isFuture && entry) {
            if (!isMeasurable) {
              level = entry.value >= habit.target ? 3 : 0;
            } else {
              if (entry.value === 0) level = 0;
              else if (entry.value < habit.target * 0.5) level = 1;
              else if (entry.value < habit.target) level = 2;
              else level = 3;
            }
          }

          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className="text-xs font-medium"
                style={{
                  color: isToday ? habitColor : 'var(--color-text-muted)',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {DOW_LABELS[i].charAt(0)}
              </span>
              <div
                className="rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: colorAtLevel(habitColor, level),
                  border: isToday ? `2px solid ${habitColor}` : '2px solid transparent',
                  opacity: isFuture ? 0.25 : 1,
                }}
                title={`${DOW_LABELS[i]}: ${isFuture ? '—' : isComplete ? 'Done' : 'Missed'}`}
              >
                {isComplete && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7l3.5 3.5L12 3"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 12-week heatmap ─────────────────────────────────────────────────────────

const WEEK_ROW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function HistoryHeatmap({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const isMeasurable = !!habit.unit;

  const heatmapData = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subWeeks(today, 11));
    const lastDayOfWeek = addDays(startOfWeek(today), 6);
    const paddedEnd = lastDayOfWeek > today ? lastDayOfWeek : today;
    const fullRange = eachDayOfInterval({ start, end: paddedEnd });

    return fullRange.map((day): HeatmapDay => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isFuture = day > today;
      if (isFuture) return { date: dateStr, value: 0, level: 0 };

      const entry = entries.find((e) => e.date === dateStr);
      if (!entry) return { date: dateStr, value: 0, level: 0 };

      const value = entry.value;
      let level: 0 | 1 | 2 | 3;
      if (!isMeasurable) {
        level = value >= 1 ? 3 : 0;
      } else {
        if (value === 0) level = 0;
        else if (value < habit.target * 0.5) level = 1;
        else if (value < habit.target) level = 2;
        else level = 3;
      }

      return { date: dateStr, value, level };
    });
  }, [entries, habit.target, isMeasurable]);

  const weeks = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      cols.push(heatmapData.slice(i, i + 7));
    }
    return cols;
  }, [heatmapData]);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        Activity — last 12 weeks
      </h3>
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
          {/* Row labels */}
          <div className="flex flex-col gap-1.5 mr-0.5" style={{ paddingTop: 2 }}>
            {WEEK_ROW_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-end"
                style={{
                  width: 10,
                  height: 12,
                  fontSize: '9px',
                  color: 'var(--color-text-muted)',
                  lineHeight: '12px',
                }}
              >
                {i % 2 === 1 ? label : ''}
              </div>
            ))}
          </div>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="transition-opacity hover:opacity-70 cursor-default"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: colorAtLevel(habit.color, day.level),
                  }}
                  title={`${day.date}: ${day.value}${isMeasurable ? ` ${habit.unit}` : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Less</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <div
            key={level}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: colorAtLevel(habit.color, level),
            }}
          />
        ))}
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>More</span>
      </div>
    </div>
  );
}

// ─── Stat box ────────────────────────────────────────────────────────────────

interface StatBoxProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  unit: string;
  accentColor: string;
}

function StatBox({ icon, iconBg, label, value, unit, accentColor }: StatBoxProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-3xl font-extrabold leading-tight" style={{ color: accentColor }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {unit}
        </p>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Completion rate chip ─────────────────────────────────────────────────────

function RateChip({ label, rate, color }: { label: string; rate: number; color: string }) {
  const pct = Math.round(rate * 100);
  const isGood = pct >= 70;
  return (
    <div
      className="flex flex-col items-center rounded-xl px-3 py-2"
      style={{
        backgroundColor: isGood ? 'rgba(34,197,94,0.1)' : 'var(--color-bg-tertiary)',
        border: `1px solid ${isGood ? 'rgba(34,197,94,0.25)' : 'var(--color-border)'}`,
        minWidth: 68,
      }}
    >
      <span
        className="text-lg font-extrabold"
        style={{ color: isGood ? '#22c55e' : color }}
      >
        {pct}%
      </span>
      <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HabitStats({ habit, entries, streak, longestStreak, rate7, rate30 }: HabitStatsProps) {
  const habitColor = habit.color ?? '#3b82f6';
  const avatarContent = habit.icon ?? habit.name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Hero section */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{
          background: `linear-gradient(135deg, ${habitColor}18 0%, ${habitColor}08 100%)`,
          border: `1px solid ${habitColor}30`,
        }}
      >
        {/* Name + avatar */}
        <div className="flex items-center gap-3">
          <div
            className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{
              width: 48,
              height: 48,
              fontSize: habit.icon ? '22px' : '18px',
              backgroundColor: `${habitColor}25`,
              border: `2px solid ${habitColor}55`,
              color: habitColor,
            }}
          >
            {avatarContent}
          </div>
          <div className="min-w-0">
            <h2
              className="text-base font-bold truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {habit.name}
            </h2>
            {habit.groupName && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {habit.groupName}
              </p>
            )}
          </div>
        </div>

        {/* Streak hero number */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 32 }}>🔥</span>
            <div>
              <p
                className="text-4xl font-extrabold leading-none"
                style={{ color: habitColor }}
              >
                {streak}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                day streak
              </p>
            </div>
          </div>

          {/* Completion rate chips */}
          <div className="flex gap-2 ml-auto">
            <RateChip label="7 days" rate={rate7} color={habitColor} />
            <RateChip label="30 days" rate={rate30} color={habitColor} />
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon={<Flame size={16} style={{ color: 'var(--color-warning)' }} />}
          iconBg="rgba(245,158,11,0.15)"
          label="Current Streak"
          value={String(streak)}
          unit="days"
          accentColor={habitColor}
        />
        <StatBox
          icon={<TrendingUp size={16} style={{ color: 'var(--color-success)' }} />}
          iconBg="rgba(34,197,94,0.15)"
          label="Best Streak"
          value={String(longestStreak)}
          unit="days"
          accentColor={habitColor}
        />
        <StatBox
          icon={<Calendar size={16} style={{ color: 'var(--color-accent)' }} />}
          iconBg="var(--color-accent-soft)"
          label="7-day rate"
          value={`${Math.round(rate7 * 100)}%`}
          unit="completion"
          accentColor={habitColor}
        />
        <StatBox
          icon={<Target size={16} style={{ color: 'var(--color-accent)' }} />}
          iconBg="var(--color-accent-soft)"
          label="30-day rate"
          value={`${Math.round(rate30 * 100)}%`}
          unit="completion"
          accentColor={habitColor}
        />
      </div>

      {/* Weekly grid */}
      <WeeklyHeatmap habit={habit} entries={entries} />

      {/* 12-week heatmap */}
      <HistoryHeatmap habit={habit} entries={entries} />
    </div>
  );
}
