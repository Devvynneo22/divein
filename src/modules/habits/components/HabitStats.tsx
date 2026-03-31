import { useMemo, useState } from 'react';
import {
  format,
  subWeeks,
  startOfWeek,
  eachDayOfInterval,
  addDays,
  subDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Calendar, Target, Award, BarChart2 } from 'lucide-react';
import type { Habit, HabitEntry } from '@/shared/types/habit';

interface HabitStatsProps {
  habit: Habit;
  entries: HabitEntry[];
  streak: number;
  longestStreak: number;
  rate7: number;
  rate30: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function colorAtLevel(baseColor: string | null, level: 0 | 1 | 2 | 3): string {
  if (level === 0) return 'var(--color-bg-tertiary)';
  const color = baseColor ?? '#3b82f6';
  const rgb = hexToRgb(color);
  const opacities = [0, 0.28, 0.6, 1];
  if (!rgb) return `${color}${Math.round(opacities[level] * 255).toString(16).padStart(2, '0')}`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacities[level]})`;
}

function entryProgress(entry: HabitEntry | undefined, habit: Habit): number {
  if (!entry) return 0;
  return Math.min(entry.value / Math.max(habit.target, 1), 1);
}

function isScheduledOnDate(habit: Habit, date: Date): boolean {
  const f = habit.frequency;
  if (f.type === 'daily') return true;
  if (f.type === 'xPerWeek') return true;
  if (f.type === 'weekly') {
    return (f as { type: 'weekly'; days: number[] }).days.includes(date.getDay());
  }
  return true;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <h3
      className="text-xs font-semibold mb-3 uppercase tracking-wide"
      style={{ color: 'var(--color-text-muted)' }}
    >
      {label}
    </h3>
  );
}

// ─── Trend Line ───────────────────────────────────────────────────────────────

function TrendLine({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const habitColor = habit.color ?? '#3b82f6';
  const gradientId = `trend-grad-${habit.id}`;

  const trendData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const day = subDays(today, 29 - i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === dateStr);
      return {
        date: dateStr,
        label: format(day, 'MMM d'),
        progress: entryProgress(entry, habit),
      };
    });
  }, [entries, habit]);

  const W = 300;
  const H = 64;
  const padX = 6;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const n = trendData.length;

  const pts = trendData.map((d, i) => {
    const x = padX + (i / (n - 1)) * innerW;
    const y = padY + innerH * (1 - d.progress);
    return { x, y, ...d };
  });

  const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${padX},${H - padY}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${W - padX},${H - padY}`,
  ].join(' ');

  const hasData = trendData.some((d) => d.progress > 0);

  return (
    <div>
      <SectionHeader label="30-day Trend" />
      {!hasData ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No data yet — start checking in!</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={habitColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={habitColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((f) => (
              <line
                key={f}
                x1={padX}
                y1={padY + innerH * (1 - f)}
                x2={W - padX}
                y2={padY + innerH * (1 - f)}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                strokeDasharray="3,3"
              />
            ))}
            {/* Area fill */}
            <polygon points={areaPoints} fill={`url(#${gradientId})`} />
            {/* Line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={habitColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dots */}
            {pts
              .filter((_, i) => i % 5 === 0 || i === n - 1)
              .map((p) => (
                <circle key={p.date} cx={p.x} cy={p.y} r={3} fill={habitColor} stroke="var(--color-bg-elevated)" strokeWidth={1.5}>
                  <title>{`${p.label}: ${Math.round(p.progress * 100)}%`}</title>
                </circle>
              ))}
          </svg>
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {format(subDays(new Date(), 29), 'MMM d')}
            </span>
            <span className="text-xs font-medium" style={{ color: habitColor }}>
              {Math.round(trendData[trendData.length - 1].progress * 100)}% today
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {format(new Date(), 'MMM d')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weekly view ──────────────────────────────────────────────────────────────

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeeklyHeatmap({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const isMeasurable = !!habit.unit;
  const habitColor = habit.color ?? '#3b82f6';
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const todayStr = format(today, 'yyyy-MM-dd');

  return (
    <div>
      <SectionHeader label="This Week" />
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isFuture = day > today;
          const isToday = dateStr === todayStr;
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

          const tooltip = `${DOW_LABELS[i]} ${format(day, 'MMM d')}: ${
            isFuture ? 'Future' : isComplete ? 'Done ✓' : 'Not done'
          }${isMeasurable && entry ? ` (${entry.value}/${habit.target} ${habit.unit})` : ''}`;

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
                  cursor: 'default',
                }}
                title={tooltip}
              >
                {isComplete && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
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

// ─── Monthly Calendar ─────────────────────────────────────────────────────────

function MonthlyCalendar({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const habitColor = habit.color ?? '#3b82f6';
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const calDays = useMemo(() => {
    const firstDay = startOfMonth(displayMonth);
    const calStart = startOfWeek(firstDay, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(calStart, i));
  }, [displayMonth]);

  const canGoNext = startOfMonth(displayMonth) < startOfMonth(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeader label="Monthly View" />
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDisplayMonth((m) => startOfMonth(subMonths(m, 1)))}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)', minWidth: 72, textAlign: 'center' }}>
            {format(displayMonth, 'MMM yyyy')}
          </span>
          <button
            onClick={() => setDisplayMonth((m) => startOfMonth(addMonths(m, 1)))}
            disabled={!canGoNext}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
            style={{
              color: canGoNext ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
              backgroundColor: 'transparent',
              opacity: canGoNext ? 1 : 0.3,
              cursor: canGoNext ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => { if (canGoNext) { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center" style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {calDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, displayMonth);
          const isFuture = day > today;
          const isToday = dateStr === todayStr;
          const entry = entries.find((e) => e.date === dateStr);

          let level: 0 | 1 | 2 | 3 = 0;
          if (inMonth && !isFuture && entry) {
            const isMeasurable = !!habit.unit;
            if (!isMeasurable) {
              level = entry.value >= habit.target ? 3 : 0;
            } else {
              if (entry.value === 0) level = 0;
              else if (entry.value < habit.target * 0.5) level = 1;
              else if (entry.value < habit.target) level = 2;
              else level = 3;
            }
          }

          const isCompleted = level === 3;
          const tooltip = inMonth
            ? `${format(day, 'MMM d')}: ${isFuture ? 'Future' : isCompleted ? 'Done ✓' : 'Not done'}`
            : '';

          return (
            <div
              key={dateStr}
              title={tooltip}
              className="flex items-center justify-center rounded-lg transition-all"
              style={{
                aspectRatio: '1',
                backgroundColor: !inMonth
                  ? 'transparent'
                  : colorAtLevel(habitColor, level),
                border: isToday ? `1.5px solid ${habitColor}` : '1.5px solid transparent',
                opacity: !inMonth ? 0 : isFuture ? 0.3 : 1,
                cursor: 'default',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isToday ? 700 : 400,
                  color: isCompleted
                    ? 'white'
                    : isToday
                    ? habitColor
                    : 'var(--color-text-muted)',
                  lineHeight: 1,
                }}
              >
                {inMonth ? format(day, 'd') : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2">
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Less</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <div key={level} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colorAtLevel(habitColor, level) }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>More</span>
      </div>
    </div>
  );
}

// ─── Day of Week Chart ────────────────────────────────────────────────────────

function DayOfWeekChart({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const habitColor = habit.color ?? '#3b82f6';

  const stats = useMemo(() => {
    const today = new Date();
    const createdAt = parseISO(habit.createdAt);
    const allDays = eachDayOfInterval({ start: createdAt, end: today });

    const data = Array.from({ length: 7 }, (_, i) => ({
      dow: i,
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      completed: 0,
      scheduled: 0,
    }));

    for (const day of allDays) {
      if (!isScheduledOnDate(habit, day)) continue;
      const dow = (day.getDay() + 6) % 7; // Mon=0
      data[dow].scheduled++;
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === dateStr);
      if (entry && entry.value >= habit.target) data[dow].completed++;
    }

    return data.map((d) => ({
      ...d,
      rate: d.scheduled > 0 ? d.completed / d.scheduled : 0,
    }));
  }, [entries, habit]);

  const maxRate = Math.max(...stats.map((s) => s.rate), 0.01);

  return (
    <div>
      <SectionHeader label="Best Day of Week" />
      <div className="flex flex-col gap-2">
        {stats.map((s) => {
          const pct = Math.round(s.rate * 100);
          const barWidth = s.scheduled > 0 ? (s.rate / maxRate) * 100 : 0;
          return (
            <div key={s.dow} className="flex items-center gap-2">
              <span
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', width: 24, flexShrink: 0 }}
              >
                {s.label.slice(0, 3)}
              </span>
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{ height: 10, backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: s.rate >= 0.8 ? 'var(--color-success)' : habitColor,
                    opacity: s.scheduled === 0 ? 0.3 : 1,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: s.rate >= 0.8 ? 'var(--color-success)' : habitColor,
                  width: 30,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {s.scheduled === 0 ? '—' : `${pct}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak Section ───────────────────────────────────────────────────────────

function StreakSection({
  habit,
  entries,
  streak,
  longestStreak,
}: {
  habit: Habit;
  entries: HabitEntry[];
  streak: number;
  longestStreak: number;
}) {
  const habitColor = habit.color ?? '#3b82f6';

  const longestRange = useMemo(() => {
    const completed = entries
      .filter((e) => e.value >= habit.target)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (completed.length === 0) return null;

    let bestStart = completed[0].date;
    let bestEnd = completed[0].date;
    let bestCount = 1;
    let curStart = completed[0].date;
    let curEnd = completed[0].date;
    let curCount = 1;

    for (let i = 1; i < completed.length; i++) {
      const prev = parseISO(completed[i - 1].date);
      const cur = parseISO(completed[i].date);
      const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
      if (diff === 1) {
        curEnd = completed[i].date;
        curCount++;
        if (curCount > bestCount) {
          bestCount = curCount;
          bestStart = curStart;
          bestEnd = curEnd;
        }
      } else {
        curStart = completed[i].date;
        curEnd = completed[i].date;
        curCount = 1;
      }
    }
    return bestCount >= 2 ? { start: bestStart, end: bestEnd, count: bestCount } : null;
  }, [entries, habit.target]);

  const last60 = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 60 }, (_, i) => {
      const day = subDays(today, 59 - i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === dateStr);
      return { date: dateStr, progress: entryProgress(entry, habit), label: format(day, 'MMM d') };
    });
  }, [entries, habit]);

  return (
    <div>
      <SectionHeader label="Streaks" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Current streak */}
        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{
            backgroundColor: streak > 0 ? `${habitColor}12` : 'var(--color-bg-secondary)',
            border: `1px solid ${streak > 0 ? `${habitColor}35` : 'var(--color-border)'}`,
          }}
        >
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontSize: 28 }}>🔥</span>
            <span className="text-3xl font-extrabold leading-none" style={{ color: habitColor }}>
              {streak}
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Current streak
          </p>
          {streak > 0 && (
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {streak >= 7 ? `${Math.floor(streak / 7)}w ${streak % 7}d` : `${streak} days`}
            </p>
          )}
        </div>

        {/* Longest streak */}
        <div
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-baseline gap-1.5">
            <Award size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginBottom: 2 }} />
            <span className="text-3xl font-extrabold leading-none" style={{ color: 'var(--color-warning)' }}>
              {longestStreak}
            </span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Longest streak
          </p>
          {longestRange && (
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {format(parseISO(longestRange.start), 'MMM d')} – {format(parseISO(longestRange.end), 'MMM d')}
            </p>
          )}
        </div>
      </div>

      {/* 60-day strip */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Last 60 days
        </p>
        <div className="flex gap-0.5 flex-wrap">
          {last60.map((d) => {
            let level: 0 | 1 | 2 | 3 = 0;
            if (d.progress >= 1) level = 3;
            else if (d.progress >= 0.5) level = 2;
            else if (d.progress > 0) level = 1;
            return (
              <div
                key={d.date}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: colorAtLevel(habitColor, level),
                  flexShrink: 0,
                }}
                title={`${d.label}: ${Math.round(d.progress * 100)}%`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Key Stats Grid ───────────────────────────────────────────────────────────

function KeyStatsGrid({
  habit,
  entries,
  rate7,
  rate30,
}: {
  habit: Habit;
  entries: HabitEntry[];
  rate7: number;
  rate30: number;
}) {
  const habitColor = habit.color ?? '#3b82f6';

  const computed = useMemo(() => {
    const today = new Date();
    const totalCheckIns = entries.filter((e) => e.value >= habit.target).length;

    const createdAt = parseISO(habit.createdAt);
    const daysSince = Math.max(1, Math.round((today.getTime() - createdAt.getTime()) / 86400000));
    const weeksSince = Math.max(1, daysSince / 7);
    const avgPerWeek = totalCheckIns / weeksSince;

    // Best week
    const weekCounts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.value < habit.target) continue;
      const weekStart = format(startOfWeek(parseISO(entry.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      weekCounts.set(weekStart, (weekCounts.get(weekStart) ?? 0) + 1);
    }
    let bestWeekStart = '';
    let bestWeekCount = 0;
    for (const [w, c] of weekCounts) {
      if (c > bestWeekCount) { bestWeekCount = c; bestWeekStart = w; }
    }

    // 90-day rate
    const start90 = subDays(today, 89);
    const days90 = eachDayOfInterval({ start: start90, end: today });
    const scheduled90 = days90.filter((d) => isScheduledOnDate(habit, d)).length;
    const completed90 = entries.filter((e) => {
      const d = parseISO(e.date);
      return d >= start90 && d <= today && e.value >= habit.target;
    }).length;
    const rate90 = scheduled90 > 0 ? completed90 / scheduled90 : 0;

    return { totalCheckIns, avgPerWeek, bestWeekStart, bestWeekCount, rate90 };
  }, [entries, habit]);

  const stats = [
    {
      label: 'Total check-ins',
      value: String(computed.totalCheckIns),
      icon: <Target size={13} />,
      color: habitColor,
    },
    {
      label: 'Avg / week',
      value: computed.avgPerWeek.toFixed(1),
      icon: <TrendingUp size={13} />,
      color: habitColor,
    },
    {
      label: 'Best week',
      value: computed.bestWeekCount > 0 ? String(computed.bestWeekCount) : '—',
      sub: computed.bestWeekStart ? format(parseISO(computed.bestWeekStart), 'MMM d') : '',
      icon: <Award size={13} />,
      color: 'var(--color-warning)',
    },
    {
      label: '7-day rate',
      value: `${Math.round(rate7 * 100)}%`,
      icon: <Calendar size={13} />,
      color: rate7 >= 0.7 ? 'var(--color-success)' : habitColor,
    },
    {
      label: '30-day rate',
      value: `${Math.round(rate30 * 100)}%`,
      icon: <Calendar size={13} />,
      color: rate30 >= 0.7 ? 'var(--color-success)' : habitColor,
    },
    {
      label: '90-day rate',
      value: `${Math.round(computed.rate90 * 100)}%`,
      icon: <BarChart2 size={13} />,
      color: computed.rate90 >= 0.7 ? 'var(--color-success)' : habitColor,
    },
  ];

  return (
    <div>
      <SectionHeader label="Key Stats" />
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-3 flex flex-col gap-1"
            style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-1" style={{ color: s.color }}>
              {s.icon}
            </div>
            <p className="text-base font-extrabold leading-none" style={{ color: s.color }}>
              {s.value}
            </p>
            {s.sub && (
              <p style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{s.sub}</p>
            )}
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Measurable Stats ─────────────────────────────────────────────────────────

function MeasurableStats({ habit, entries }: { habit: Habit; entries: HabitEntry[] }) {
  const habitColor = habit.color ?? '#3b82f6';

  const stats = useMemo(() => {
    const valid = entries.filter((e) => e.value > 0);
    if (valid.length === 0) return null;
    const total = valid.reduce((s, e) => s + e.value, 0);
    const personalBest = Math.max(...valid.map((e) => e.value));
    const avg = total / valid.length;
    return { total, personalBest, avg };
  }, [entries]);

  if (!habit.unit || !stats) return null;

  // Running average trend (last 14 days)
  const runningAvg = useMemo(() => {
    const today = new Date();
    const points = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(today, 13 - i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find((e) => e.date === dateStr);
      return { date: dateStr, value: entry?.value ?? 0 };
    });
    // 3-day moving average
    return points.map((p, i) => {
      const window = points.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, x) => s + x.value, 0) / window.length;
      return { ...p, avg };
    });
  }, [entries]);

  const maxVal = Math.max(...runningAvg.map((p) => p.value), stats.personalBest, 1);
  const W = 280;
  const H = 50;
  const padX = 4;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const n = runningAvg.length;
  const avgGradId = `avg-grad-${habit.id}`;

  const valuePts = runningAvg.map((p, i) => ({
    x: padX + (i / (n - 1)) * innerW,
    y: padY + innerH * (1 - p.value / maxVal),
    ...p,
  }));
  const avgPts = runningAvg.map((p, i) => ({
    x: padX + (i / (n - 1)) * innerW,
    y: padY + innerH * (1 - p.avg / maxVal),
  }));

  const valuePolyline = valuePts.map((p) => `${p.x},${p.y}`).join(' ');
  const avgPolyline = avgPts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div>
      <SectionHeader label={`${habit.unit} Tracking`} />
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: `${habitColor}10`, border: `1px solid ${habitColor}30` }}
      >
        {/* Running total highlight */}
        <div className="flex items-center gap-2 mb-4">
          <span style={{ fontSize: 28 }}>📊</span>
          <div>
            <p className="text-2xl font-extrabold leading-none" style={{ color: habitColor }}>
              {stats.total % 1 === 0 ? stats.total : stats.total.toFixed(1)} {habit.unit}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              total accumulated
            </p>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-lg font-extrabold" style={{ color: habitColor }}>
              {stats.personalBest} {habit.unit}
            </p>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Personal best</p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-lg font-extrabold" style={{ color: habitColor }}>
              {stats.avg % 1 === 0 ? stats.avg : stats.avg.toFixed(1)} {habit.unit}
            </p>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Daily average</p>
          </div>
        </div>

        {/* 14-day chart */}
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
          14-day trend + avg
        </p>
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
            <defs>
              <linearGradient id={avgGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={habitColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={habitColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Value bars */}
            {valuePts.map((p, i) => (
              <rect
                key={i}
                x={p.x - 6}
                y={p.y}
                width={12}
                height={H - padY - p.y}
                rx={2}
                fill={habitColor}
                opacity={0.35}
              >
                <title>{`${format(parseISO(p.date), 'MMM d')}: ${p.value} ${habit.unit}`}</title>
              </rect>
            ))}
            {/* Running average line */}
            <polyline
              points={avgPolyline}
              fill="none"
              stroke={habitColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4,2"
            />
            {/* Target line */}
            {habit.target > 1 && (
              <line
                x1={padX}
                y1={padY + innerH * (1 - habit.target / maxVal)}
                x2={W - padX}
                y2={padY + innerH * (1 - habit.target / maxVal)}
                stroke="var(--color-success)"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.6}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── 12-week Heatmap ──────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  value: number;
  level: 0 | 1 | 2 | 3;
}

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
    for (let i = 0; i < heatmapData.length; i += 7) cols.push(heatmapData.slice(i, i + 7));
    return cols;
  }, [heatmapData]);

  return (
    <div>
      <SectionHeader label="Activity — last 12 weeks" />
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
          {/* Row labels */}
          <div className="flex flex-col gap-1.5 mr-0.5" style={{ paddingTop: 2 }}>
            {WEEK_ROW_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-end"
                style={{ width: 10, height: 12, fontSize: '9px', color: 'var(--color-text-muted)', lineHeight: '12px' }}
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
          <div key={level} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colorAtLevel(habit.color, level) }} />
        ))}
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>More</span>
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
      <span className="text-lg font-extrabold" style={{ color: isGood ? '#22c55e' : color }}>
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
            <h2 className="text-base font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {habit.name}
            </h2>
            {habit.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                {habit.description}
              </p>
            )}
            {habit.groupName && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {habit.groupName}
              </p>
            )}
          </div>
        </div>

        {/* Streak hero + rates */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 28 }}>🔥</span>
            <div>
              <p className="text-4xl font-extrabold leading-none" style={{ color: habitColor }}>
                {streak}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                day streak
              </p>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <RateChip label="7 days" rate={rate7} color={habitColor} />
            <RateChip label="30 days" rate={rate30} color={habitColor} />
          </div>
        </div>
      </div>

      {/* Trend line */}
      <TrendLine habit={habit} entries={entries} />

      {/* Weekly heatmap */}
      <WeeklyHeatmap habit={habit} entries={entries} />

      {/* Monthly calendar */}
      <MonthlyCalendar habit={habit} entries={entries} />

      {/* Streak section */}
      <StreakSection habit={habit} entries={entries} streak={streak} longestStreak={longestStreak} />

      {/* Day of week chart */}
      <DayOfWeekChart habit={habit} entries={entries} />

      {/* Key stats grid */}
      <KeyStatsGrid habit={habit} entries={entries} rate7={rate7} rate30={rate30} />

      {/* Measurable stats (conditional) */}
      {habit.unit && <MeasurableStats habit={habit} entries={entries} />}

      {/* 12-week history heatmap */}
      <HistoryHeatmap habit={habit} entries={entries} />
    </div>
  );
}
