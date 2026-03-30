import { useMemo } from 'react';
import { format, subWeeks, startOfWeek, eachDayOfInterval, addDays, subDays } from 'date-fns';
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
  const opacities = [0, 0.3, 0.65, 1];
  if (!rgb) {
    return `${color}${Math.round(opacities[level] * 255)
      .toString(16)
      .padStart(2, '0')}`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacities[level]})`;
}

// ─── Weekly completion heatmap (last 7 days, one row) ───────────────────────

interface WeeklyHeatmapProps {
  habit: Habit;
  entries: HabitEntry[];
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyHeatmap({ habit, entries }: WeeklyHeatmapProps) {
  const isMeasurable = !!habit.unit;
  const habitColor = habit.color ?? '#3b82f6';
  const today = new Date();

  // Get the last 7 days starting from Monday
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div>
      <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        This Week
      </h3>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
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
                className="text-xs"
                style={{
                  color: isToday ? habitColor : 'var(--color-text-muted)',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {DOW_LABELS[i].charAt(0)}
              </span>
              <div
                className="rounded-lg transition-all"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: colorAtLevel(habitColor, level),
                  border: isToday ? `2px solid ${habitColor}` : '2px solid transparent',
                  opacity: isFuture ? 0.3 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`${DOW_LABELS[i]}: ${isFuture ? '—' : isComplete ? 'Done' : 'Missed'}`}
              >
                {isComplete && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Progress arc ────────────────────────────────────────────────────────────

function ProgressArc({ rate, color }: { rate: number; color: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(rate, 1));

  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={10} />
      <circle
        cx={50}
        cy={50}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={50} y={50} textAnchor="middle" dy="0.35em" fontSize={18} fontWeight={700} fill={color}>
        {Math.round(rate * 100)}%
      </text>
    </svg>
  );
}

// ─── Full 12-week history heatmap ────────────────────────────────────────────

function HistoryHeatmap({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const isMeasurable = !!habit.unit;

  const heatmapData = useMemo(() => {
    const today = new Date();
    const weeksBack = 12;
    const start = startOfWeek(subWeeks(today, weeksBack - 1));
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
      <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>
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
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Less</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <div
            key={level}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: colorAtLevel(habit.color, level) }}
          />
        ))}
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>More</span>
      </div>
    </div>
  );
}

// ─── Main stats component ────────────────────────────────────────────────────

export function HabitStats({ habit, entries, streak, longestStreak, rate7, rate30 }: HabitStatsProps) {
  const habitColor = habit.color ?? '#3b82f6';

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon={<Flame size={15} />}
          iconColor="var(--color-warning)"
          label="Current Streak"
          value={String(streak)}
          unit="days"
          valueStyle={{ color: habitColor }}
        />
        <StatBox
          icon={<TrendingUp size={15} />}
          iconColor="var(--color-success)"
          label="Best Streak"
          value={String(longestStreak)}
          unit="days"
          valueStyle={{ color: habitColor }}
        />
        <StatBox
          icon={<Calendar size={15} />}
          iconColor="var(--color-accent)"
          label="Last 7 days"
          value={`${Math.round(rate7 * 100)}%`}
          unit="completion"
          valueStyle={{ color: habitColor }}
        />
        <StatBox
          icon={<Target size={15} />}
          iconColor="var(--color-accent)"
          label="Last 30 days"
          value={`${Math.round(rate30 * 100)}%`}
          unit="completion"
          valueStyle={{ color: habitColor }}
        />
      </div>

      {/* Weekly heatmap grid */}
      <WeeklyHeatmap habit={habit} entries={entries} />

      {/* Progress arc: 7-day completion */}
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-xs font-semibold self-start" style={{ color: 'var(--color-text-secondary)' }}>
          7-day completion
        </h3>
        <ProgressArc rate={rate7} color={habitColor} />
      </div>

      {/* 12-week history heatmap */}
      <HistoryHeatmap habit={habit} entries={entries} />
    </div>
  );
}

function StatBox({
  icon,
  iconColor,
  label,
  value,
  unit,
  valueStyle,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  valueStyle: React.CSSProperties;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color: iconColor }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={valueStyle}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{unit}</p>
    </div>
  );
}
