import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, eachDayOfInterval, addDays, parseISO } from 'date-fns';
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
  level: 0 | 1 | 2 | 3; // 0=none, 1=partial, 2=complete, 3=over
}

const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  if (!rgb) {
    const opacities = [0, 0.3, 0.65, 1];
    return `${color}${Math.round(opacities[level] * 255).toString(16).padStart(2, '0')}`;
  }
  const opacities = [0, 0.3, 0.65, 1];
  const alpha = opacities[level];
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function HabitStats({ habit, entries, streak, longestStreak, rate7, rate30 }: HabitStatsProps) {
  const habitColor = habit.color ?? '#3b82f6';
  const isMeasurable = !!habit.unit;

  // Build 12-week heatmap data
  const heatmapData = useMemo(() => {
    const today = new Date();
    const weeksBack = 12;
    // Start from beginning of the week, 12 weeks ago
    const start = startOfWeek(subWeeks(today, weeksBack - 1));
    const allDays = eachDayOfInterval({ start, end: today });

    // Pad to fill last week
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

  // Group into weeks (columns)
  const weeks = useMemo(() => {
    const cols: HeatmapDay[][] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      cols.push(heatmapData.slice(i, i + 7));
    }
    return cols;
  }, [heatmapData]);

  const statStyle = { color: habitColor };

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-[var(--color-warning)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Current Streak</span>
          </div>
          <p className="text-2xl font-bold" style={statStyle}>{streak}</p>
          <p className="text-xs text-[var(--color-text-muted)]">days</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-[var(--color-success)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Longest Streak</span>
          </div>
          <p className="text-2xl font-bold" style={statStyle}>{longestStreak}</p>
          <p className="text-xs text-[var(--color-text-muted)]">days</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Last 7 days</span>
          </div>
          <p className="text-2xl font-bold" style={statStyle}>{Math.round(rate7 * 100)}%</p>
          <p className="text-xs text-[var(--color-text-muted)]">completion</p>
        </div>

        <div className="rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-[var(--color-accent)]" />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Last 30 days</span>
          </div>
          <p className="text-2xl font-bold" style={statStyle}>{Math.round(rate30 * 100)}%</p>
          <p className="text-xs text-[var(--color-text-muted)]">completion</p>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <h3 className="text-xs font-medium text-[var(--color-text-secondary)] mb-3">
          Activity — last 12 weeks
        </h3>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-0.5" style={{ minWidth: 'max-content' }}>
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {WEEK_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="w-3 h-3 flex items-center justify-end"
                  style={{ fontSize: '9px', color: 'var(--color-text-muted)', lineHeight: '12px' }}
                >
                  {i % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-0.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className="w-3 h-3 rounded-sm transition-opacity hover:opacity-80"
                    style={{ backgroundColor: colorAtLevel(habit.color, day.level) }}
                    title={`${day.date}: ${day.value}${isMeasurable ? ` ${habit.unit}` : ''}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs text-[var(--color-text-muted)]">Less</span>
          {([0, 1, 2, 3] as const).map((level) => (
            <div
              key={level}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colorAtLevel(habit.color, level) }}
            />
          ))}
          <span className="text-xs text-[var(--color-text-muted)]">More</span>
        </div>
      </div>
    </div>
  );
}
