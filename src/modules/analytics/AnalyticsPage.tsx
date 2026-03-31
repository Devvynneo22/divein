/**
 * AnalyticsPage — Quantified Self Dashboard
 * Premium data visualization for DiveIn productivity tracking.
 * All charts: pure SVG/CSS, zero external chart libraries.
 */
import React, { useState, useMemo } from 'react';
import {
  format,
  subDays,
  subWeeks,
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  eachDayOfInterval,
  parseISO,
  isWithinInterval,
  differenceInDays,
  addDays,
  isSameDay,
} from 'date-fns';

import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useTodayStatus, useHabits } from '@/modules/habits/hooks/useHabits';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useDecks, useDeckStats } from '@/modules/flashcards/hooks/useFlashcards';
import { useActivityStore } from '@/shared/stores/activityStore';
import { useFocusSessionStore } from '@/shared/stores/focusSessionStore';
import { useDailyReviewStore } from '@/shared/stores/dailyReviewStore';

import type { HabitWithStatus } from '@/shared/types/habit';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = 'week' | 'month' | '30days' | 'all';

interface DateRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
  days: number;
}

interface TooltipState {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(range: TimeRange): DateRange {
  const now = new Date();
  const today = startOfDay(now);

  switch (range) {
    case 'week': {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      const prevStart = subWeeks(start, 1);
      const prevEnd = subDays(start, 1);
      return { start, end, prevStart, prevEnd, label: 'This Week', days: 7 };
    }
    case 'month': {
      const start = startOfMonth(today);
      const end = today;
      const prevStart = startOfMonth(subDays(start, 1));
      const prevEnd = subDays(start, 1);
      return { start, end, prevStart, prevEnd, label: 'This Month', days: differenceInDays(end, start) + 1 };
    }
    case '30days': {
      const start = subDays(today, 29);
      const end = today;
      const prevStart = subDays(today, 59);
      const prevEnd = subDays(today, 30);
      return { start, end, prevStart, prevEnd, label: 'Last 30 Days', days: 30 };
    }
    case 'all': {
      const start = subDays(today, 364);
      const end = today;
      const prevStart = subDays(today, 729);
      const prevEnd = subDays(today, 365);
      return { start, end, prevStart, prevEnd, label: 'All Time', days: 365 };
    }
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTrendColor(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return 'var(--color-success)';
  if (trend === 'down') return 'var(--color-danger)';
  return 'var(--color-text-muted)';
}

function getTrendArrow(trend: 'up' | 'down' | 'flat'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function calcTrend(current: number, previous: number): { trend: 'up' | 'down' | 'flat'; pct: number } {
  if (previous === 0 && current === 0) return { trend: 'flat', pct: 0 };
  if (previous === 0) return { trend: 'up', pct: 100 };
  const pct = Math.round(((current - previous) / previous) * 100);
  const trend = pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat';
  return { trend, pct: Math.abs(pct) };
}

// ─── Shared Card ──────────────────────────────────────────────────────────────

function AnalyticsCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  emoji,
  title,
  right,
}: {
  emoji: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>{emoji}</span>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ state }: { state: TooltipState }) {
  if (!state.visible) return null;
  return (
    <div
      style={{
        position: 'fixed',
        left: state.x + 12,
        top: state.y - 8,
        zIndex: 9999,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '8px',
        padding: '6px 10px',
        fontSize: '12px',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-md)',
        pointerEvents: 'none',
        whiteSpace: 'pre-line',
        maxWidth: '200px',
        lineHeight: 1.5,
      }}
    >
      {state.content}
    </div>
  );
}

// ─── Score Gauge (SVG Ring) ───────────────────────────────────────────────────

function ScoreGauge({
  score,
  size = 160,
  prevScore,
}: {
  score: number;
  size?: number;
  prevScore: number;
}) {
  const radius = size * 0.38;
  const strokeWidth = size * 0.075;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(score, 100) / 100);
  const cx = size / 2;
  const cy = size / 2;

  const scoreColor =
    score < 40
      ? 'var(--color-danger)'
      : score < 60
      ? 'var(--color-warning)'
      : score < 75
      ? '#eab308'
      : score < 90
      ? 'var(--color-success)'
      : '#f59e0b';

  const { trend, pct } = calcTrend(score, prevScore);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={scoreColor} stopOpacity={1} />
              <stop offset="100%" stopColor={scoreColor} stopOpacity={0.6} />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', filter: 'url(#gaugeGlow)' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: size * 0.22,
            fontWeight: 800,
            color: scoreColor,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>
            {Math.round(score)}
          </div>
          <div style={{ fontSize: size * 0.08, color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>
            Score
          </div>
        </div>
      </div>
      {/* Trend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px',
        color: getTrendColor(trend),
        fontWeight: 600,
      }}>
        <span style={{ fontSize: '16px' }}>{getTrendArrow(trend)}</span>
        <span>{pct > 0 ? `${pct}%` : 'No change'} vs prev period</span>
      </div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  data,
  width = 120,
  height = 32,
  color = 'var(--color-accent)',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height * 0.8 - height * 0.1,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
    </svg>
  );
}

// ─── Area Chart ───────────────────────────────────────────────────────────────

function AreaChart({
  data,
  labels,
  width = 400,
  height = 120,
  color,
  gradientId,
  unit = '',
}: {
  data: number[];
  labels: string[];
  width: number;
  height: number;
  color: string;
  gradientId: string;
  unit?: string;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: '', visible: false });

  if (data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
      No data yet
    </div>
  );

  const max = Math.max(...data, 1);
  const padTop = height * 0.1;
  const padBottom = height * 0.15;
  const chartH = height - padTop - padBottom;

  const points = data.map((v, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * width : width / 2,
    y: padTop + chartH - (v / max) * chartH,
    value: v,
    label: labels[i] ?? '',
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0} y1={padTop + chartH * (1 - f)}
            x2={width} y2={padTop + chartH * (1 - f)}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="4,4"
            opacity={0.5}
          />
        ))}
        <path d={areaD} fill={`url(#${gradientId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={4}
            fill={color}
            stroke="var(--color-bg-elevated)"
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `${p.label}\n${p.value}${unit}`, visible: true })}
            onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
          />
        ))}
      </svg>
      <Tooltip state={tooltip} />
    </>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({
  data,
  labels,
  color,
  height = 120,
  unit = '',
  showMovingAvg = false,
}: {
  data: number[];
  labels: string[];
  color: string;
  height: number;
  unit?: string;
  showMovingAvg?: boolean;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: '', visible: false });

  if (data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
      No data yet
    </div>
  );

  const max = Math.max(...data, 1);
  const barPct = (v: number) => (v / max) * 100;

  // Moving average (window=3)
  const movingAvg = showMovingAvg
    ? data.map((_, i) => {
        const slice = data.slice(Math.max(0, i - 1), i + 2);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      })
    : [];

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '3px',
        height,
        position: 'relative',
      }}>
        {data.map((v, i) => (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
          >
            <div
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `${labels[i] ?? ''}\n${v}${unit}`, visible: true })}
              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
              style={{
                width: '100%',
                height: `${barPct(v)}%`,
                minHeight: v > 0 ? '3px' : '0',
                backgroundColor: color,
                borderRadius: '3px 3px 0 0',
                opacity: v === 0 ? 0.2 : 0.85,
                transition: 'opacity 0.15s, height 0.3s',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = v === 0 ? '0.2' : '0.85'; }}
            />
          </div>
        ))}
        {/* Moving average SVG overlay */}
        {showMovingAvg && movingAvg.length > 1 && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
            preserveAspectRatio="none"
            viewBox={`0 0 ${data.length * 16} ${height}`}
          >
            <path
              d={movingAvg.map((v, i) => {
                const x = (i + 0.5) * 16;
                const y = height - (v / max) * height;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="var(--color-text-primary)"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.4}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      {/* X-axis labels — show every Nth */}
      <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
        {labels.map((l, i) => {
          const showEvery = Math.ceil(labels.length / 10);
          return (
            <div key={i} style={{
              flex: 1,
              fontSize: '9px',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              overflow: 'hidden',
              opacity: i % showEvery === 0 ? 1 : 0,
            }}>
              {l}
            </div>
          );
        })}
      </div>
      <Tooltip state={tooltip} />
    </div>
  );
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

interface HeatmapDay {
  date: string;
  count: number;
  tasks: number;
  habits: number;
  focusMin: number;
  cards: number;
}

function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: '', visible: false });

  const CELL = 13;
  const GAP = 3;
  const CELL_STEP = CELL + GAP;
  const WEEKS = Math.ceil(days.length / 7) + 1;

  // Organize days by (col=week, row=dayOfWeek Mon=0..Sun=6)
  // Build a grid: find the monday on/before the first day
  const firstDay = days.length > 0 ? parseISO(days[0].date) : new Date();
  const startMon = (() => {
    const d = new Date(firstDay);
    const dow = d.getDay(); // 0=Sun
    const offset = dow === 0 ? 6 : dow - 1; // offset to Monday
    d.setDate(d.getDate() - offset);
    return d;
  })();

  const today = startOfDay(new Date());
  const dayMap = new Map(days.map((d) => [d.date, d]));

  // Build grid cells
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const totalWeeks = Math.ceil(differenceInDays(today, startMon) / 7) + 1;
  const actualWeeks = Math.min(totalWeeks, 53);

  // Month labels
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < actualWeeks; w++) {
    const d = addDays(startMon, w * 7);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ col: w, label: format(d, 'MMM') });
      lastMonth = d.getMonth();
    }
  }

  const svgWidth = actualWeeks * CELL_STEP + 24; // +24 for day labels
  const svgHeight = 7 * CELL_STEP + 28; // +28 for month labels + bottom

  function getIntensity(count: number): number {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
  }

  const intensityOpacity = [0, 0.15, 0.35, 0.65, 1];

  const dayLabels = ['M', '', 'W', '', 'F', '', 'S'];

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block', minWidth: svgWidth }}
      >
        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={`${col}-${label}`}
            x={24 + col * CELL_STEP}
            y={12}
            fontSize={10}
            fill="var(--color-text-muted)"
            fontFamily="inherit"
          >
            {label}
          </text>
        ))}

        {/* Day labels */}
        {dayLabels.map((dl, row) => (
          <text
            key={row}
            x={0}
            y={18 + row * CELL_STEP + CELL * 0.8}
            fontSize={9}
            fill="var(--color-text-muted)"
            fontFamily="inherit"
          >
            {dl}
          </text>
        ))}

        {/* Cells */}
        {Array.from({ length: actualWeeks }, (_, w) =>
          Array.from({ length: 7 }, (_, row) => {
            const d = addDays(startMon, w * 7 + row);
            if (d > today) return null;
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayData = dayMap.get(dateStr);
            const count = dayData?.count ?? 0;
            const intensity = getIntensity(count);
            const opacity = intensityOpacity[intensity];
            const isToday = isSameDay(d, today);

            return (
              <rect
                key={`${w}-${row}`}
                x={24 + w * CELL_STEP}
                y={18 + row * CELL_STEP}
                width={CELL}
                height={CELL}
                rx={2}
                ry={2}
                fill={count === 0 ? 'var(--color-bg-tertiary)' : 'var(--color-accent)'}
                fillOpacity={count === 0 ? 1 : opacity}
                stroke={isToday ? 'var(--color-accent)' : 'none'}
                strokeWidth={isToday ? 1.5 : 0}
                style={{ cursor: 'pointer', transition: 'fill-opacity 0.15s' }}
                onMouseEnter={(e) => {
                  const content = dayData
                    ? `${format(d, 'MMM d, yyyy')}\n📋 ${dayData.tasks} tasks\n🔄 ${dayData.habits} habits\n⏱ ${dayData.focusMin}m focus\n🃏 ${dayData.cards} cards`
                    : `${format(d, 'MMM d, yyyy')}\nNo activity`;
                  setTooltip({ x: e.clientX, y: e.clientY, content, visible: true });
                }}
                onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
              />
            );
          })
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div
            key={lvl}
            style={{
              width: CELL, height: CELL,
              borderRadius: 2,
              backgroundColor: lvl === 0 ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
              opacity: lvl === 0 ? 1 : intensityOpacity[lvl],
            }}
          />
        ))}
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>More</span>
      </div>

      <Tooltip state={tooltip} />
    </div>
  );
}

// ─── Habits Consistency Grid ──────────────────────────────────────────────────

function HabitDotGrid({
  habit,
  entries,
}: {
  habit: HabitWithStatus;
  entries: { date: string; value: number }[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({ x: 0, y: 0, content: '', visible: false });
  const DOT_SIZE = 10;
  const DAYS = 30;
  const today = new Date();

  const completedDates = new Set(
    entries.filter((e) => e.value >= habit.target).map((e) => e.date)
  );
  const totalScheduled = Array.from({ length: DAYS }, (_, i) => {
    const d = subDays(today, DAYS - 1 - i);
    return format(d, 'yyyy-MM-dd');
  }).filter((dateStr) => {
    const freq = habit.frequency;
    if (freq.type === 'daily') return true;
    if (freq.type === 'weekly') {
      const dow = parseISO(dateStr).getDay();
      return freq.days.includes(dow);
    }
    return true;
  });

  const completedCount = totalScheduled.filter((d) => completedDates.has(d)).length;
  const pct = totalScheduled.length > 0 ? Math.round((completedCount / totalScheduled.length) * 100) : 0;
  const color = habit.color ?? 'var(--color-accent)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
      {/* Habit name */}
      <div style={{ width: '120px', flexShrink: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {habit.icon ? `${habit.icon} ` : ''}{habit.name}
        </div>
        {habit.streak > 0 && (
          <div style={{ fontSize: '10px', color: 'var(--color-warning)' }}>🔥 {habit.streak}d</div>
        )}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: '2px', flex: 1, flexWrap: 'wrap' }}>
        {Array.from({ length: DAYS }, (_, i) => {
          const d = subDays(today, DAYS - 1 - i);
          const dateStr = format(d, 'yyyy-MM-dd');
          const freq = habit.frequency;
          const isScheduled = (() => {
            if (freq.type === 'daily') return true;
            if (freq.type === 'weekly') {
              return freq.days.includes(d.getDay());
            }
            return true;
          })();
          const completed = completedDates.has(dateStr);

          return (
            <div
              key={i}
              onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `${format(d, 'MMM d')}\n${completed ? '✅ Done' : isScheduled ? '⭕ Missed' : '—'}`, visible: true })}
              onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: '50%',
                backgroundColor: completed ? color : 'transparent',
                border: `1.5px solid ${isScheduled ? (completed ? color : 'var(--color-border-strong)') : 'var(--color-border)'}`,
                flexShrink: 0,
                cursor: 'default',
                opacity: isScheduled ? 1 : 0.3,
              }}
            />
          );
        })}
      </div>

      {/* % */}
      <div style={{ width: '36px', textAlign: 'right', flexShrink: 0 }}>
        <span style={{
          fontSize: '12px', fontWeight: 700,
          color: pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
        }}>
          {pct}%
        </span>
      </div>
      <Tooltip state={tooltip} />
    </div>
  );
}

// ─── Donut Chart (CSS conic-gradient) ────────────────────────────────────────

function DonutChart({
  segments,
  size = 100,
  label,
}: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  label?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulative = 0;

  const stops = segments
    .map((seg) => {
      const start = (cumulative / total) * 360;
      cumulative += seg.value;
      const end = (cumulative / total) * 360;
      return `${seg.color} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
    })
    .join(', ');

  const thickness = size * 0.22;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(${stops})`,
      }} />
      {/* Cutout */}
      <div style={{
        position: 'absolute',
        top: thickness,
        left: thickness,
        width: size - thickness * 2,
        height: size - thickness * 2,
        borderRadius: '50%',
        backgroundColor: 'var(--color-bg-elevated)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {label && (
          <span style={{ fontSize: size * 0.14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Stat Number ──────────────────────────────────────────────────────────────

function StatBlock({
  value,
  label,
  sub,
  color = 'var(--color-text-primary)',
}: {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '36px', fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', fontWeight: 500 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ─── Trophy Card ──────────────────────────────────────────────────────────────

function TrophyCard({
  icon,
  label,
  value,
  sub,
  color = 'var(--color-warning)',
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        textAlign: 'center',
        transition: 'all 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ fontSize: '24px' }}>{icon}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ─── Section 1: Productivity Score Hero ──────────────────────────────────────

interface ScoreData {
  score: number;
  prevScore: number;
  scoreHistory: number[];
  breakdown: {
    tasks: number;
    habits: number;
    focus: number;
    study: number;
    consistency: number;
  };
}

function ProductivityScoreSection({ scoreData }: { scoreData: ScoreData }) {
  const scoreColor =
    scoreData.score < 40 ? 'var(--color-danger)'
    : scoreData.score < 60 ? 'var(--color-warning)'
    : scoreData.score < 75 ? '#eab308'
    : scoreData.score < 90 ? 'var(--color-success)'
    : '#f59e0b';

  return (
    <AnalyticsCard>
      <CardHeader emoji="🎯" title="Productivity Score" />
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
        <ScoreGauge score={scoreData.score} prevScore={scoreData.prevScore} size={160} />

        {/* Breakdown */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Score Breakdown
          </div>
          {[
            { label: 'Tasks Completed', value: scoreData.breakdown.tasks, weight: '35%', color: 'var(--color-accent)' },
            { label: 'Habits Consistency', value: scoreData.breakdown.habits, weight: '25%', color: 'var(--color-success)' },
            { label: 'Focus Time', value: scoreData.breakdown.focus, weight: '20%', color: 'var(--color-warning)' },
            { label: 'Study / Flashcards', value: scoreData.breakdown.study, weight: '10%', color: 'var(--color-danger)' },
            { label: 'Consistency Bonus', value: scoreData.breakdown.consistency, weight: '10%', color: '#8b5cf6' },
          ].map(({ label, value, weight, color }) => (
            <div key={label} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color }}>
                  {Math.round(value)}<span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>/100 · {weight}</span>
                </span>
              </div>
              <div style={{ height: '5px', borderRadius: '3px', backgroundColor: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(value, 100)}%`,
                  borderRadius: '3px',
                  backgroundColor: color,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Sparkline */}
        {scoreData.scoreHistory.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>TREND</div>
            <Sparkline data={scoreData.scoreHistory} width={120} height={48} color={scoreColor} />
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}

// ─── Main AnalyticsPage ───────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange]);

  // ─── Data hooks ────────────────────────────────────────────────────────────
  const { data: allTasks = [] } = useTasks();
  const { data: habitStatuses = [] } = useTodayStatus();
  const { data: allHabits = [] } = useHabits();
  const { data: allDecks = [] } = useDecks();
  const focusStore = useFocusSessionStore();
  const reviewStore = useDailyReviewStore();
  const activityStore = useActivityStore();
  const timer = useTimerStore();

  // ─── Computed date ranges ─────────────────────────────────────────────────
  const { start, end, prevStart, prevEnd } = dateRange;

  const rangeInterval = { start, end };
  const prevInterval = { start: prevStart, end: prevEnd };

  // ─── Task velocity data ────────────────────────────────────────────────────
  const allDays = useMemo(() => eachDayOfInterval({ start, end }), [start, end]);

  const tasksByDay = useMemo(() => {
    return allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = allTasks.filter((t) => {
        if (t.status !== 'done' || !t.completedAt) return false;
        try {
          return format(parseISO(t.completedAt), 'yyyy-MM-dd') === dateStr;
        } catch { return false; }
      }).length;
      return { date: d, label: format(d, 'M/d'), count };
    });
  }, [allDays, allTasks]);

  const tasksCompleted = tasksByDay.reduce((s, d) => s + d.count, 0);
  const prevTasksCompleted = allTasks.filter((t) => {
    if (t.status !== 'done' || !t.completedAt) return false;
    try {
      const d = parseISO(t.completedAt);
      return isWithinInterval(d, prevInterval);
    } catch { return false; }
  }).length;

  const avgTasksPerDay = allDays.length > 0 ? (tasksCompleted / allDays.length).toFixed(1) : '0';

  // ─── Focus time data ──────────────────────────────────────────────────────
  const focusByDay = useMemo(() => {
    return allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const minutes = focusStore.sessions
        .filter((s) => {
          try { return format(parseISO(s.startedAt), 'yyyy-MM-dd') === dateStr; }
          catch { return false; }
        })
        .reduce((sum, s) => sum + s.actualMinutes, 0);
      return { date: d, label: format(d, 'M/d'), minutes };
    });
  }, [allDays, focusStore.sessions]);

  // Also add timer store elapsed (current session proxy)
  const focusTotalMin = focusByDay.reduce((s, d) => s + d.minutes, 0) +
    (timer.secondsElapsed > 0 ? Math.round(timer.secondsElapsed / 60) : 0);

  const prevFocusMin = focusStore.sessions
    .filter((s) => {
      try { return isWithinInterval(parseISO(s.startedAt), prevInterval); }
      catch { return false; }
    })
    .reduce((sum, s) => sum + s.actualMinutes, 0);

  const avgFocusMin = allDays.length > 0 ? Math.round(focusTotalMin / allDays.length) : 0;

  // ─── Habit data ────────────────────────────────────────────────────────────
  // For heatmap, build habit completions per day from activity store
  const habitActivities = activityStore.activities.filter((a) => a.type === 'habit_checked');

  const habitsByDay = useMemo(() => {
    return allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return habitActivities.filter((a) => {
        try { return format(parseISO(a.timestamp), 'yyyy-MM-dd') === dateStr; }
        catch { return false; }
      }).length;
    });
  }, [allDays, habitActivities]);

  const habitsCompleted = habitsByDay.reduce((s, v) => s + v, 0);
  const prevHabitsCompleted = habitActivities.filter((a) => {
    try { return isWithinInterval(parseISO(a.timestamp), prevInterval); }
    catch { return false; }
  }).length;

  const habitsConsistency = useMemo(() => {
    if (allHabits.length === 0) return 0;
    const habitData = habitStatuses;
    const completed = habitData.filter((h) => h.isCompletedToday).length;
    return habitData.length > 0 ? Math.round((completed / habitData.length) * 100) : 0;
  }, [allHabits, habitStatuses]);

  // Sort habits by consistency (use streak as proxy)
  const sortedHabits = useMemo(() => {
    return [...habitStatuses].sort((a, b) => b.streak - a.streak);
  }, [habitStatuses]);

  // ─── Flashcard data ────────────────────────────────────────────────────────
  const flashcardActivities = activityStore.activities.filter((a) => a.type === 'flashcard_studied');
  const cardsStudied = flashcardActivities.filter((a) => {
    try { return isWithinInterval(parseISO(a.timestamp), rangeInterval); }
    catch { return false; }
  }).length;

  const cardsByDay = useMemo(() => {
    return allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      return flashcardActivities.filter((a) => {
        try { return format(parseISO(a.timestamp), 'yyyy-MM-dd') === dateStr; }
        catch { return false; }
      }).length;
    });
  }, [allDays, flashcardActivities]);

  // Deck stats aggregated
  const totalCards = allDecks.reduce((s) => s, 0); // We'll get this from hook below
  const prevCardsStudied = flashcardActivities.filter((a) => {
    try { return isWithinInterval(parseISO(a.timestamp), prevInterval); }
    catch { return false; }
  }).length;

  // ─── Heatmap data ──────────────────────────────────────────────────────────
  const heatmapDays = useMemo((): HeatmapDay[] => {
    const heatStart = subDays(new Date(), 83); // ~12 weeks
    const heatDays = eachDayOfInterval({ start: heatStart, end: new Date() });
    return heatDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const tasks = allTasks.filter((t) => {
        if (t.status !== 'done' || !t.completedAt) return false;
        try { return format(parseISO(t.completedAt), 'yyyy-MM-dd') === dateStr; } catch { return false; }
      }).length;
      const habits = habitActivities.filter((a) => {
        try { return format(parseISO(a.timestamp), 'yyyy-MM-dd') === dateStr; } catch { return false; }
      }).length;
      const focusMin = focusStore.sessions.filter((s) => {
        try { return format(parseISO(s.startedAt), 'yyyy-MM-dd') === dateStr; } catch { return false; }
      }).reduce((sum, s) => sum + s.actualMinutes, 0);
      const cards = flashcardActivities.filter((a) => {
        try { return format(parseISO(a.timestamp), 'yyyy-MM-dd') === dateStr; } catch { return false; }
      }).length;
      return { date: dateStr, count: tasks + habits + Math.ceil(focusMin / 15) + cards, tasks, habits, focusMin, cards };
    });
  }, [allTasks, habitActivities, focusStore.sessions, flashcardActivities]);

  // ─── Productivity Score ────────────────────────────────────────────────────
  const scoreData = useMemo((): ScoreData => {
    // Task score (35 pts): normalize by target of ~5/day
    const targetTasks = Math.max(allDays.length * 3, 1);
    const taskScore = Math.min((tasksCompleted / targetTasks) * 100, 100);

    // Habit score (25 pts): consistency %
    const habitScore = habitsConsistency;

    // Focus score (20 pts): target 60min/day
    const targetFocus = allDays.length * 60;
    const focusScore = Math.min((focusTotalMin / Math.max(targetFocus, 1)) * 100, 100);

    // Study score (10 pts): target 10 cards/day
    const targetCards = allDays.length * 5;
    const studyScore = Math.min((cardsStudied / Math.max(targetCards, 1)) * 100, 100);

    // Consistency bonus (10 pts): based on daily review streak
    const reviewStreak = reviewStore.getStreak();
    const consistencyScore = Math.min(reviewStreak * 10, 100);

    const score =
      taskScore * 0.35 +
      habitScore * 0.25 +
      focusScore * 0.20 +
      studyScore * 0.10 +
      consistencyScore * 0.10;

    // Prev score
    const prevTargetTasks = Math.max(7 * 3, 1);
    const prevTaskScore = Math.min((prevTasksCompleted / prevTargetTasks) * 100, 100);
    const prevFocusScore = Math.min((prevFocusMin / (7 * 60)) * 100, 100);
    const prevHabitScore = prevHabitsCompleted > 0 ? 60 : 0;
    const prevScore =
      prevTaskScore * 0.35 +
      prevHabitScore * 0.25 +
      prevFocusScore * 0.20 +
      prevCardsStudied * 0.10 +
      0 * 0.10;

    // Score history: use daily review scores if available, else estimate per day
    const scoreHistory = allDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const review = reviewStore.getReview(dateStr);
      if (review) return review.productivityScore;
      // Estimate
      const dayTasks = tasksByDay.find((t) => format(t.date, 'yyyy-MM-dd') === dateStr)?.count ?? 0;
      return Math.min(dayTasks * 15, 100);
    });

    return {
      score,
      prevScore,
      scoreHistory,
      breakdown: {
        tasks: taskScore,
        habits: habitScore,
        focus: focusScore,
        study: studyScore,
        consistency: consistencyScore,
      },
    };
  }, [tasksCompleted, habitsConsistency, focusTotalMin, cardsStudied, allDays, reviewStore, tasksByDay, prevTasksCompleted, prevFocusMin, prevHabitsCompleted, prevCardsStudied]);

  // ─── Streaks & Records ─────────────────────────────────────────────────────
  const longestTaskStreak = useMemo(() => {
    const completedDates = new Set(
      allTasks
        .filter((t) => t.status === 'done' && t.completedAt)
        .map((t) => format(parseISO(t.completedAt!), 'yyyy-MM-dd'))
    );
    let longest = 0;
    let current = 0;
    const allCalDays = eachDayOfInterval({ start: subDays(new Date(), 365), end: new Date() });
    for (const d of allCalDays) {
      if (completedDates.has(format(d, 'yyyy-MM-dd'))) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    return longest;
  }, [allTasks]);

  const longestHabitStreaks = useMemo(() => {
    return [...habitStatuses]
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);
  }, [habitStatuses]);

  const mostProductiveDay = useMemo(() => {
    let best = { date: '', count: 0 };
    for (const d of heatmapDays) {
      if (d.count > best.count) best = d;
    }
    return best;
  }, [heatmapDays]);

  const mostFocusDay = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of focusStore.sessions) {
      try {
        const d = format(parseISO(s.startedAt), 'yyyy-MM-dd');
        byDay.set(d, (byDay.get(d) ?? 0) + s.actualMinutes);
      } catch {}
    }
    let best = { date: '', minutes: 0 };
    byDay.forEach((min, date) => { if (min > best.minutes) best = { date, minutes: min }; });
    return best;
  }, [focusStore.sessions]);

  // Lifetime stats
  const lifetimeTasks = allTasks.filter((t) => t.status === 'done').length;
  const lifetimeHabits = activityStore.activities.filter((a) => a.type === 'habit_checked').length;
  const lifetimeFocusMin = focusStore.sessions.reduce((s, sess) => s + sess.actualMinutes, 0);
  const lifetimeCards = flashcardActivities.length;

  // ─── Weekly Summary ────────────────────────────────────────────────────────
  const weekSummary = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const weekInterval = { start: weekStart, end: weekEnd };

    const weekTasks = allTasks.filter((t) => {
      try {
        if (!t.completedAt) return false;
        return isWithinInterval(parseISO(t.completedAt), weekInterval);
      } catch { return false; }
    }).length;

    const createdThisWeek = allTasks.filter((t) => {
      try { return isWithinInterval(parseISO(t.createdAt ?? ''), weekInterval); }
      catch { return false; }
    }).length;

    const overdueThisWeek = allTasks.filter((t) => {
      return t.status !== 'done' && t.dueDate != null && t.dueDate < format(new Date(), 'yyyy-MM-dd');
    }).length;

    const weekFocusMin = focusStore.sessions
      .filter((s) => { try { return isWithinInterval(parseISO(s.startedAt), weekInterval); } catch { return false; } })
      .reduce((sum, s) => sum + s.actualMinutes, 0);
    const weekFocusSessions = focusStore.sessions.filter((s) => {
      try { return isWithinInterval(parseISO(s.startedAt), weekInterval); } catch { return false; }
    }).length;

    const weekCards = flashcardActivities.filter((a) => {
      try { return isWithinInterval(parseISO(a.timestamp), weekInterval); } catch { return false; }
    }).length;

    // Best day
    const weekDays = eachDayOfInterval({ start: weekStart, end: new Date() });
    let bestDay = { label: '—', score: 0 };
    for (const d of weekDays) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const hd = heatmapDays.find((hd) => hd.date === dateStr);
      const review = reviewStore.getReview(dateStr);
      const dayScore = review?.productivityScore ?? (hd?.count ?? 0) * 10;
      if (dayScore > bestDay.score) bestDay = { label: format(d, 'EEEE'), score: Math.min(dayScore, 100) };
    }

    return {
      tasksCompleted: weekTasks,
      tasksCreated: createdThisWeek,
      overdueCount: overdueThisWeek,
      habitsConsistency,
      bestHabitStreak: habitStatuses.reduce((m, h) => Math.max(m, h.streak), 0),
      focusMin: weekFocusMin,
      focusSessions: weekFocusSessions,
      cardsStudied: weekCards,
      productivityScore: Math.round(scoreData.score),
      bestDay,
    };
  }, [allTasks, focusStore.sessions, flashcardActivities, habitsConsistency, habitStatuses, heatmapDays, reviewStore, scoreData.score]);

  // ─── Flashcard deck aggregate ──────────────────────────────────────────────
  // Use DeckStatsSection component to load per-deck stats
  const totalDeckCards = allDecks.length; // placeholder — actual count needs per-deck hook

  // ─── Empty state check ─────────────────────────────────────────────────────
  const hasAnyData = lifetimeTasks > 0 || lifetimeHabits > 0 || lifetimeFocusMin > 0 || lifetimeCards > 0;

  // ─── Trend pill colors ─────────────────────────────────────────────────────
  const taskTrend = calcTrend(tasksCompleted, prevTasksCompleted);
  const focusTrend = calcTrend(focusTotalMin, prevFocusMin);
  const habitTrend = calcTrend(habitsCompleted, prevHabitsCompleted);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '32px 40px 80px',
      maxWidth: '1440px',
      margin: '0 auto',
      minHeight: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>
            📈 Productivity Analytics
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Your quantified self dashboard
          </p>
        </div>

        {/* Time range pills */}
        <div style={{
          display: 'flex', gap: '4px',
          backgroundColor: 'var(--color-bg-tertiary)',
          borderRadius: '10px', padding: '4px',
          border: '1px solid var(--color-border)',
        }}>
          {([
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: '30days', label: 'Last 30 Days' },
            { key: 'all', label: 'All Time' },
          ] as { key: TimeRange; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                transition: 'all 0.15s',
                backgroundColor: timeRange === key ? 'var(--color-bg-elevated)' : 'transparent',
                color: timeRange === key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                boxShadow: timeRange === key ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!hasAnyData && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '20px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
            Start Tracking to See Your Analytics
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
            Complete tasks, check in on habits, run focus sessions, and study flashcards. Your productivity story will appear here.
          </p>
        </div>
      )}

      {hasAnyData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Row 1: Score + Heatmap (full width) */}
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'start' }}>
            <ProductivityScoreSection scoreData={scoreData} />

            {/* Activity Heatmap */}
            <AnalyticsCard>
              <CardHeader emoji="🟩" title="Activity Heatmap"
                right={<span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Last 12 weeks</span>}
              />
              <ActivityHeatmap days={heatmapDays} />
            </AnalyticsCard>
          </div>

          {/* Row 2: Task Velocity + Focus Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Task Velocity */}
            <AnalyticsCard>
              <CardHeader emoji="⚡" title="Task Velocity"
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: getTrendColor(taskTrend.trend),
                    }}>
                      {getTrendArrow(taskTrend.trend)} {taskTrend.pct}%
                    </span>
                  </div>
                }
              />
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <StatBlock
                  value={tasksCompleted}
                  label="Tasks completed"
                  color="var(--color-accent)"
                />
                <StatBlock
                  value={avgTasksPerDay}
                  label="Avg per day"
                  color="var(--color-text-secondary)"
                />
              </div>
              <BarChart
                data={tasksByDay.map((d) => d.count)}
                labels={tasksByDay.map((d) => d.label)}
                color="var(--color-accent)"
                height={100}
                unit=" tasks"
                showMovingAvg={true}
              />
            </AnalyticsCard>

            {/* Focus Time */}
            <AnalyticsCard>
              <CardHeader emoji="⏱" title="Focus Time"
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: getTrendColor(focusTrend.trend) }}>
                      {getTrendArrow(focusTrend.trend)} {focusTrend.pct}%
                    </span>
                  </div>
                }
              />
              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <StatBlock
                  value={formatDuration(focusTotalMin)}
                  label="Total focus"
                  color="var(--color-warning)"
                />
                <StatBlock
                  value={formatDuration(avgFocusMin)}
                  label="Daily average"
                  color="var(--color-text-secondary)"
                />
              </div>
              <AreaChart
                data={focusByDay.map((d) => d.minutes)}
                labels={focusByDay.map((d) => d.label)}
                width={500}
                height={100}
                color="var(--color-warning)"
                gradientId="focusAreaGrad"
                unit="min"
              />
            </AnalyticsCard>
          </div>

          {/* Row 3: Habits Consistency + Flashcard Progress */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Habits Consistency Grid */}
            <AnalyticsCard>
              <CardHeader emoji="🔄" title="Habits Consistency"
                right={
                  <div style={{
                    fontSize: '13px', fontWeight: 700,
                    color: habitsConsistency >= 80 ? 'var(--color-success)' : habitsConsistency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                  }}>
                    {habitsConsistency}% overall
                  </div>
                }
              />
              {sortedHabits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  No habits tracked yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '120px' }}>HABIT</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', flex: 1 }}>LAST 30 DAYS</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '36px', textAlign: 'right' }}>RATE</div>
                  </div>
                  {sortedHabits.slice(0, 8).map((habit) => (
                    <HabitDotRow key={habit.id} habit={habit} />
                  ))}
                </div>
              )}
            </AnalyticsCard>

            {/* Flashcard Progress */}
            <AnalyticsCard>
              <CardHeader emoji="🃏" title="Flashcard Progress" />
              <FlashcardProgressSection
                decks={allDecks}
                cardsByDay={cardsByDay}
                dayLabels={allDays.map((d) => format(d, 'M/d'))}
                cardsStudied={cardsStudied}
              />
            </AnalyticsCard>
          </div>

          {/* Row 4: Streaks & Records */}
          <AnalyticsCard>
            <CardHeader emoji="🏆" title="Streaks & Records" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              <TrophyCard
                icon="🔥"
                label="Task Streak"
                value={`${longestTaskStreak}d`}
                sub="Consecutive days with completions"
                color="var(--color-warning)"
              />
              {longestHabitStreaks.map((h) => (
                <TrophyCard
                  key={h.id}
                  icon={h.icon ?? '✅'}
                  label={h.name}
                  value={`${h.streak}d`}
                  sub="Current streak"
                  color={h.color ?? 'var(--color-success)'}
                />
              ))}
              {mostProductiveDay.date && (
                <TrophyCard
                  icon="📅"
                  label="Best Day"
                  value={format(parseISO(mostProductiveDay.date), 'MMM d')}
                  sub={`${mostProductiveDay.count} activities`}
                  color="var(--color-accent)"
                />
              )}
              {mostFocusDay.date && (
                <TrophyCard
                  icon="⏱"
                  label="Most Focus"
                  value={formatDuration(mostFocusDay.minutes)}
                  sub={mostFocusDay.date ? format(parseISO(mostFocusDay.date), 'MMM d') : ''}
                  color="var(--color-warning)"
                />
              )}
            </div>

            {/* Lifetime stats */}
            <div style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}>
              <StatBlock value={lifetimeTasks} label="Total tasks done" color="var(--color-accent)" />
              <StatBlock value={lifetimeHabits} label="Habit check-ins" color="var(--color-success)" />
              <StatBlock value={formatDuration(lifetimeFocusMin)} label="Hours focused" color="var(--color-warning)" />
              <StatBlock value={lifetimeCards} label="Cards studied" color="var(--color-danger)" />
            </div>
          </AnalyticsCard>

          {/* Row 5: Weekly Summary */}
          <AnalyticsCard style={{
            background: 'linear-gradient(135deg, var(--color-bg-elevated) 0%, var(--color-accent-soft) 100%)',
            borderColor: 'var(--color-accent)',
          }}>
            <CardHeader emoji="📋" title="Weekly Summary"
              right={
                <div style={{
                  fontSize: '22px', fontWeight: 800,
                  color: weekSummary.productivityScore >= 75 ? 'var(--color-success)' : 'var(--color-accent)',
                }}>
                  {weekSummary.productivityScore}/100
                </div>
              }
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              <SummaryItem
                emoji="✅"
                label="Tasks"
                lines={[
                  `${weekSummary.tasksCompleted} completed`,
                  `${weekSummary.tasksCreated} created`,
                  weekSummary.overdueCount > 0 ? `${weekSummary.overdueCount} overdue` : 'No overdue',
                ]}
              />
              <SummaryItem
                emoji="🔄"
                label="Habits"
                lines={[
                  `${weekSummary.habitsConsistency}% consistency`,
                  `Best streak: ${weekSummary.bestHabitStreak}d`,
                ]}
              />
              <SummaryItem
                emoji="⏱"
                label="Focus"
                lines={[
                  formatDuration(weekSummary.focusMin),
                  `${weekSummary.focusSessions} sessions`,
                ]}
              />
              <SummaryItem
                emoji="🃏"
                label="Study"
                lines={[
                  `${weekSummary.cardsStudied} cards`,
                ]}
              />
              <SummaryItem
                emoji="⭐"
                label="Best Day"
                lines={[
                  weekSummary.bestDay.label,
                  weekSummary.bestDay.score > 0 ? `Score: ${Math.round(weekSummary.bestDay.score)}` : '—',
                ]}
                highlight={true}
              />
            </div>
          </AnalyticsCard>

        </div>
      )}
    </div>
  );
}

// ─── Sub-components (kept here to avoid extra files) ─────────────────────────

function HabitDotRow({ habit }: { habit: HabitWithStatus }) {
  // Use activity store entries for this habit
  const activityStore = useActivityStore();
  const entries = useMemo(() => {
    return activityStore.activities
      .filter((a) => a.type === 'habit_checked' && a.entityId === habit.id)
      .map((a) => ({ date: format(parseISO(a.timestamp), 'yyyy-MM-dd'), value: 1 }));
  }, [activityStore.activities, habit.id]);

  return <HabitDotGrid habit={habit} entries={entries} />;
}

function FlashcardProgressSection({
  decks,
  cardsByDay,
  dayLabels,
  cardsStudied,
}: {
  decks: import('@/shared/types/flashcard').Deck[];
  cardsByDay: number[];
  dayLabels: string[];
  cardsStudied: number;
}) {
  const { data: deckStats } = useDeckStats(decks[0]?.id ?? '');

  const totalCards = deckStats?.totalCards ?? 0;
  const masteredCards = deckStats
    ? deckStats.totalCards - deckStats.newCards - deckStats.learningCards
    : 0;
  const learningCards = deckStats?.learningCards ?? 0;
  const newCards = deckStats?.newCards ?? 0;

  const donutSegments = totalCards > 0
    ? [
        { value: masteredCards, color: 'var(--color-success)', label: 'Mastered' },
        { value: learningCards, color: 'var(--color-warning)', label: 'Learning' },
        { value: newCards, color: 'var(--color-text-muted)', label: 'New' },
      ]
    : [{ value: 1, color: 'var(--color-bg-tertiary)', label: 'No data' }];

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '16px' }}>
        <DonutChart
          segments={donutSegments}
          size={90}
          label={totalCards > 0 ? `${Math.round((masteredCards / totalCards) * 100)}%` : '—'}
        />
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
              {cardsStudied}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>cards this period</span>
          </div>
          {totalCards > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { label: 'Mastered', value: masteredCards, color: 'var(--color-success)' },
                { label: 'Learning', value: learningCards, color: 'var(--color-warning)' },
                { label: 'New', value: newCards, color: 'var(--color-text-muted)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards per day trend */}
      {cardsByDay.some((v) => v > 0) && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            CARDS STUDIED PER DAY
          </div>
          <BarChart
            data={cardsByDay}
            labels={dayLabels}
            color="var(--color-danger)"
            height={60}
            unit=" cards"
          />
        </div>
      )}

      {/* Due forecast */}
      {deckStats && deckStats.dueToday > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-accent-soft)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--color-accent)',
          fontWeight: 500,
        }}>
          📅 {deckStats.dueToday} cards due today
        </div>
      )}

      {decks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No flashcard decks yet
        </div>
      )}
    </div>
  );
}

function SummaryItem({
  emoji,
  label,
  lines,
  highlight = false,
}: {
  emoji: string;
  label: string;
  lines: string[];
  highlight?: boolean;
}) {
  return (
    <div style={{
      padding: '14px',
      borderRadius: '12px',
      backgroundColor: highlight ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
      border: `1px solid ${highlight ? 'var(--color-accent)' : 'var(--color-border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px' }}>{emoji}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{
          fontSize: i === 0 ? '14px' : '12px',
          fontWeight: i === 0 ? 600 : 400,
          color: i === 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
          marginBottom: '2px',
        }}>
          {line}
        </div>
      ))}
    </div>
  );
}
