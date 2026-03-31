import React, { useState, useMemo } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import type { Deck, Card } from '@/shared/types/flashcard';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeckStatsProps {
  deck: Deck;
  cards: Card[];
  deckColor?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isValidHex(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

// ─── Section 1: Summary Stat Card ─────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div
      className="flex-1 flex flex-col gap-2 px-5 py-4 rounded-2xl"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        minWidth: 0,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{ color: accent ?? 'var(--color-text-primary)' }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Section 2: Donut Chart ───────────────────────────────────────────────────

const DONUT_R = 50;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R; // ≈ 314.16

interface MaturitySegment {
  label: string;
  count: number;
  color: string;
}

interface DonutChartProps {
  segments: MaturitySegment[];
  total: number;
}

function DonutChart({ segments, total }: DonutChartProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Compute segment dashes + offsets
  let cumulativeLen = 0;
  const computed = segments.map((seg) => {
    const dashLen = total > 0 ? (seg.count / total) * CIRCUMFERENCE : 0;
    const offset = -cumulativeLen;
    cumulativeLen += dashLen;
    return { ...seg, dashLen, offset };
  });

  const isEmpty = total === 0;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* SVG Donut */}
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 120 120" width="140" height="140">
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={DONUT_R}
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth="20"
          />
          {isEmpty ? null : computed.map((seg) => (
            seg.count === 0 ? null : (
              <circle
                key={seg.label}
                cx="60"
                cy="60"
                r={DONUT_R}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredLabel === seg.label ? 22 : 20}
                strokeDasharray={`${seg.dashLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-width 0.15s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredLabel(seg.label)}
                onMouseLeave={() => setHoveredLabel(null)}
              />
            )
          ))}
          {/* Center label */}
          <text
            x="60"
            y="56"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '22px', fontWeight: 700, fill: 'var(--color-text-primary)' }}
          >
            {total}
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '9px', fill: 'var(--color-text-muted)' }}
          >
            cards
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
          const isHovered = hoveredLabel === seg.label;
          return (
            <div
              key={seg.label}
              className="flex items-center gap-2 cursor-default"
              onMouseEnter={() => setHoveredLabel(seg.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              style={{ opacity: hoveredLabel && !isHovered ? 0.5 : 1, transition: 'opacity 0.15s ease' }}
            >
              <div
                className="rounded-full flex-shrink-0"
                style={{ width: 8, height: 8, backgroundColor: seg.color }}
              />
              <span
                className="text-xs flex-1 truncate"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {seg.label}
              </span>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {seg.count}
              </span>
              <span
                className="text-xs tabular-nums"
                style={{ color: 'var(--color-text-muted)', minWidth: '32px', textAlign: 'right' }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section 3: 14-Day Forecast Bar Chart ─────────────────────────────────────

interface ForecastDay {
  date: Date;
  dateStr: string;
  label: string;
  fullLabel: string;
  count: number;
  isToday: boolean;
}

interface ForecastChartProps {
  data: ForecastDay[];
  accentColor: string;
}

function ForecastChart({ data, accentColor }: ForecastChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const CHART_H = 120;
  const LABEL_H = 24;
  const TOTAL_H = CHART_H + LABEL_H;
  const BAR_AREA_H = CHART_H - 8; // usable bar height
  const BAR_WIDTH = 28;
  const BAR_GAP = 12;
  const BAR_STEP = BAR_WIDTH + BAR_GAP;
  const SVG_W = data.length * BAR_STEP + BAR_GAP;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${SVG_W} ${TOTAL_H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        preserveAspectRatio="xMinYMid meet"
        onMouseLeave={() => setTooltip(null)}
      >
        {data.map((day, i) => {
          const barH = Math.max(2, (day.count / maxCount) * BAR_AREA_H);
          const x = i * BAR_STEP + BAR_GAP / 2;
          const y = CHART_H - barH;
          const fill = day.isToday ? accentColor : 'var(--color-bg-tertiary)';
          const stroke = day.isToday ? accentColor : 'var(--color-border)';

          return (
            <g key={day.dateStr}>
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barH}
                rx="4"
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
                style={{ cursor: day.count > 0 ? 'pointer' : 'default', transition: 'opacity 0.15s ease' }}
                onMouseEnter={(e) => {
                  const svgEl = e.currentTarget.closest('svg')!;
                  const rect = svgEl.getBoundingClientRect();
                  const svgX = e.clientX - rect.left;
                  const svgY = e.clientY - rect.top;
                  setTooltip({
                    x: svgX,
                    y: svgY - 36,
                    text: `${day.fullLabel}: ${day.count} card${day.count !== 1 ? 's' : ''}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* Count label above bar (only if > 0) */}
              {day.count > 0 && (
                <text
                  x={x + BAR_WIDTH / 2}
                  y={y - 3}
                  textAnchor="middle"
                  style={{ fontSize: '8px', fill: 'var(--color-text-muted)', fontWeight: 600 }}
                >
                  {day.count}
                </text>
              )}
              {/* X axis label */}
              <text
                x={x + BAR_WIDTH / 2}
                y={CHART_H + 16}
                textAnchor="middle"
                style={{
                  fontSize: '9px',
                  fill: day.isToday ? accentColor : 'var(--color-text-muted)',
                  fontWeight: day.isToday ? 700 : 400,
                }}
              >
                {day.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line
          x1={BAR_GAP / 2}
          y1={CHART_H}
          x2={SVG_W - BAR_GAP / 2}
          y2={CHART_H}
          stroke="var(--color-border)"
          strokeWidth="1"
        />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ─── Section 4: Activity Heatmap ──────────────────────────────────────────────

interface HeatmapProps {
  countByDate: Record<string, number>;
  accentColor: string;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function ActivityHeatmap({ countByDate, accentColor }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);
  const CELL = 10;
  const GAP = 2;
  const STEP = CELL + GAP;
  const NUM_WEEKS = 12;
  const NUM_DAYS = 7;
  const MONTH_LABEL_W = 36;

  // Build grid: 12 weeks × 7 days, starting from the Monday 12 weeks ago
  const today = startOfDay(new Date());

  // Find the Monday of the week 12 weeks ago
  const rawStart = addDays(today, -(NUM_WEEKS * 7 - 1));
  const rawStartDow = rawStart.getDay(); // 0=Sun, 1=Mon
  const mondayOffset = rawStartDow === 0 ? -6 : 1 - rawStartDow;
  const firstMonday = addDays(rawStart, mondayOffset);

  // Build all cells
  const cells: Array<{
    date: Date;
    dateStr: string;
    week: number;   // row index
    day: number;    // col index (0=Mon, 6=Sun)
    count: number;
    isFuture: boolean;
  }> = [];

  for (let week = 0; week < NUM_WEEKS; week++) {
    for (let day = 0; day < NUM_DAYS; day++) {
      const date = addDays(firstMonday, week * 7 + day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const todayStr = format(today, 'yyyy-MM-dd');
      cells.push({
        date,
        dateStr,
        week,
        day,
        count: countByDate[dateStr] ?? 0,
        isFuture: dateStr > todayStr,
      });
    }
  }

  // Month labels: for each week row, show month name if Monday of that week is a new month
  const monthLabels: Array<{ week: number; label: string }> = [];
  let lastMonth = -1;
  for (let week = 0; week < NUM_WEEKS; week++) {
    const monday = addDays(firstMonday, week * 7);
    const month = monday.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ week, label: format(monday, 'MMM') });
      lastMonth = month;
    }
  }

  // Color helper
  function cellColor(count: number, isFuture: boolean): string {
    if (isFuture || count === 0) return 'var(--color-bg-tertiary)';
    const valid = isValidHex(accentColor);
    if (!valid) {
      if (count <= 2) return 'rgba(99,102,241,0.30)';
      if (count <= 5) return 'rgba(99,102,241,0.65)';
      return 'rgba(99,102,241,1)';
    }
    if (count <= 2) return hexToRgba(accentColor, 0.30);
    if (count <= 5) return hexToRgba(accentColor, 0.65);
    return accentColor;
  }

  const gridW = NUM_DAYS * STEP - GAP;
  const gridH = NUM_WEEKS * STEP - GAP;

  return (
    <div style={{ position: 'relative' }}>
      <div className="flex gap-4">
        {/* Month labels (left side) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: MONTH_LABEL_W,
            flexShrink: 0,
            paddingTop: '20px', // account for day-of-week header
          }}
        >
          {Array.from({ length: NUM_WEEKS }, (_, i) => {
            const ml = monthLabels.find((m) => m.week === i);
            return (
              <div
                key={i}
                style={{
                  height: STEP,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '10px',
                  color: 'var(--color-text-muted)',
                  fontWeight: ml ? 600 : 400,
                  opacity: ml ? 1 : 0,
                }}
              >
                {ml?.label ?? ''}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div>
          {/* Day of week labels */}
          <div className="flex" style={{ gap: GAP, marginBottom: GAP }}>
            {DAY_LABELS.map((d, i) => (
              <div
                key={i}
                style={{
                  width: CELL,
                  height: CELL + 2,
                  fontSize: '9px',
                  color: 'var(--color-text-muted)',
                  textAlign: 'center',
                  lineHeight: `${CELL + 2}px`,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${NUM_DAYS}, ${CELL}px)`,
              gridTemplateRows: `repeat(${NUM_WEEKS}, ${CELL}px)`,
              gap: GAP,
              width: gridW,
              height: gridH,
            }}
          >
            {cells.map((cell) => (
              <div
                key={cell.dateStr}
                title={`${format(cell.date, 'MMM d')}: ${cell.count} card${cell.count !== 1 ? 's' : ''}`}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: cellColor(cell.count, cell.isFuture),
                  cursor: cell.count > 0 ? 'pointer' : 'default',
                  transition: 'transform 0.1s ease',
                  gridColumn: cell.day + 1,
                  gridRow: cell.week + 1,
                }}
                onMouseEnter={(e) => {
                  if (!cell.isFuture) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredCell({
                      date: format(cell.date, 'MMM d'),
                      count: cell.count,
                      x: rect.left + CELL / 2,
                      y: rect.top - 8,
                    });
                    e.currentTarget.style.transform = 'scale(1.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  setHoveredCell(null);
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip (portal-like, fixed position) */}
      {hoveredCell && (
        <div
          style={{
            position: 'fixed',
            left: hoveredCell.x,
            top: hoveredCell.y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '11px',
            color: 'var(--color-text-primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50,
          }}
        >
          {hoveredCell.date}: {hoveredCell.count} card{hoveredCell.count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ─── Section 5: Retention Bar ─────────────────────────────────────────────────

interface RetentionBarProps {
  pct: number;
  accentColor: string;
}

function RetentionBar({ pct, accentColor }: RetentionBarProps) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="text-4xl font-black tabular-nums"
        style={{ color: 'var(--color-text-primary)', minWidth: '72px' }}
      >
        {pct}%
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: '10px', backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: '9999px',
              backgroundColor: pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {pct >= 80
            ? '🌟 Excellent retention — keep it up!'
            : pct >= 60
            ? '📈 Good progress — review more often to improve'
            : '🔄 Keep reviewing — consistency is key'}
        </p>
      </div>
    </div>
  );
}

// ─── Section container ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeckStats({ deck, cards, deckColor }: DeckStatsProps) {
  const accentColor = (deckColor && isValidHex(deckColor)) ? deckColor : '#3b82f6';
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');

  // ── Section 1: Summary ──
  const totalCards = cards.length;
  const dueToday = cards.filter((c) => c.nextReview <= todayStr).length;
  const mastered = cards.filter((c) => c.status === 'review' && c.intervalDays >= 21).length;
  const avgEase =
    totalCards > 0
      ? (cards.reduce((sum, c) => sum + c.easeFactor, 0) / totalCards).toFixed(1)
      : '—';

  // ── Section 2: Maturity breakdown ──
  const maturitySegments: MaturitySegment[] = useMemo(() => {
    const newCount = cards.filter((c) => c.status === 'new').length;
    const learningCount = cards.filter((c) => c.status === 'learning').length;
    const youngCount = cards.filter((c) => c.status === 'review' && c.intervalDays < 21).length;
    const matureCount = cards.filter((c) => c.status === 'review' && c.intervalDays >= 21).length;
    const suspendedCount = cards.filter((c) => c.status === 'suspended').length;
    return [
      { label: 'New', count: newCount, color: '#6366f1' },
      { label: 'Learning', count: learningCount, color: '#f59e0b' },
      { label: 'Young', count: youngCount, color: '#22c55e' },
      { label: 'Mature', count: matureCount, color: '#10b981' },
      { label: 'Suspended', count: suspendedCount, color: '#94a3b8' },
    ];
  }, [cards]);

  const maturityTotal = maturitySegments.reduce((sum, s) => sum + s.count, 0);

  // ── Section 3: 14-day forecast ──
  const forecastData: ForecastDay[] = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const count = cards.filter((c) => c.nextReview === dateStr).length;
      return {
        date,
        dateStr,
        label: format(date, 'EEE'),
        fullLabel: format(date, 'MMM d'),
        count,
        isToday: i === 0,
      };
    });
  }, [cards, todayStr]);

  // ── Section 4: Heatmap ──
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const card of cards) {
      if (card.lastReviewed) {
        const dateStr = card.lastReviewed.slice(0, 10);
        map[dateStr] = (map[dateStr] ?? 0) + 1;
      }
    }
    return map;
  }, [cards]);

  // ── Section 5: Retention ──
  const retentionPct = useMemo(() => {
    if (totalCards === 0) return 0;
    const retained = cards.filter((c) => c.easeFactor > 2.0).length;
    return Math.round((retained / totalCards) * 100);
  }, [cards, totalCards]);

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Section 1: Summary row ── */}
      <div className="flex gap-3">
        <StatCard icon="🃏" label="Total Cards" value={totalCards} />
        <StatCard
          icon="⚡"
          label="Due Today"
          value={dueToday}
          accent={dueToday > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
        />
        <StatCard icon="⭐" label="Mastered" value={mastered} accent={accentColor} />
        <StatCard icon="📊" label="Avg Ease" value={avgEase} />
      </div>

      {/* ── Sections 2 & 5 side by side ── */}
      <div className="flex gap-5">
        {/* Section 2: Donut */}
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col gap-4"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            🥧 Card Maturity
          </h3>
          <DonutChart segments={maturitySegments} total={maturityTotal} />
        </div>

        {/* Section 5: Retention */}
        <div
          className="flex-1 rounded-2xl p-5 flex flex-col gap-4"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            🎯 Retention Rate
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Estimated correct recall in the last 30 days
          </p>
          <div className="flex-1 flex items-center">
            <RetentionBar pct={retentionPct} accentColor={accentColor} />
          </div>
          {/* Breakdown note */}
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', marginTop: 'auto' }}>
            Based on ease factor proxy ({cards.filter((c) => c.easeFactor > 2.0).length} of {totalCards} cards above threshold)
          </p>
        </div>
      </div>

      {/* ── Section 3: 14-Day Forecast ── */}
      <Section title="📅 14-Day Review Forecast">
        {forecastData.every((d) => d.count === 0) ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No reviews scheduled in the next 14 days
          </p>
        ) : (
          <ForecastChart data={forecastData} accentColor={accentColor} />
        )}
      </Section>

      {/* ── Section 4: Activity Heatmap ── */}
      <Section title="🔥 Study Activity (Last 12 Weeks)">
        {Object.keys(countByDate).length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No study activity recorded yet — start reviewing to see your heatmap!
          </p>
        ) : (
          <ActivityHeatmap countByDate={countByDate} accentColor={accentColor} />
        )}
      </Section>
    </div>
  );
}
