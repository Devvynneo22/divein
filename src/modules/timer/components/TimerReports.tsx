import { useState, useMemo, useRef } from 'react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  parseISO,
} from 'date-fns';
import { Trash2, Download } from 'lucide-react';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useDeleteEntry } from '../hooks/useTimer';
import type { TimeEntry } from '@/shared/types/timer';
import { useFocusSessionStore } from '@/shared/stores/focusSessionStore';
import type { FocusSession } from '@/shared/stores/focusSessionStore';

// ─── Types ───────────────────────────────────────────────────────────────────

type RangeTab = 'today' | 'week' | 'month' | 'custom';

interface TimerReportsProps {
  entries: TimeEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
];

const CIRCUMFERENCE = 2 * Math.PI * 55; // ≈ 345.4

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

function getMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: string;
  emoji: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        boxShadow: 'var(--shadow-sm)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ days, entriesByDay }: {
  days: Date[];
  entriesByDay: Map<string, TimeEntry[]>;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const dayData = useMemo(() => {
    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const dayEntries = entriesByDay.get(key) ?? [];
      const totalSec = dayEntries.reduce((s, e) => s + (e.durationSec ?? 0), 0);
      return { day, key, totalSec };
    });
  }, [days, entriesByDay]);

  const maxSec = Math.max(...dayData.map((d) => d.totalSec), 1);

  const BAR_W = 8;
  const BAR_GAP = 4;
  const CHART_H = 100;
  const LABEL_H = 28;
  const PADDING_L = 4;
  const PADDING_R = 4;

  const svgWidth = PADDING_L + days.length * (BAR_W + BAR_GAP) - BAR_GAP + PADDING_R;
  const svgHeight = CHART_H + LABEL_H;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 2 }}>
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {dayData.map(({ day, totalSec }, i) => {
          const barH = totalSec === 0 ? 2 : Math.max(2, (totalSec / maxSec) * CHART_H);
          const x = PADDING_L + i * (BAR_W + BAR_GAP);
          const y = CHART_H - barH;
          const isCurrentDay = isToday(day);
          const label = format(day, 'EEE');

          return (
            <g key={format(day, 'yyyy-MM-dd')}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={3}
                style={{
                  fill: isCurrentDay
                    ? 'var(--color-accent)'
                    : 'color-mix(in srgb, var(--color-accent) 70%, transparent)',
                  filter: isCurrentDay ? 'drop-shadow(0 0 4px color-mix(in srgb, var(--color-accent) 60%, transparent))' : 'none',
                  cursor: totalSec > 0 ? 'pointer' : 'default',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
                  const parent = (e.currentTarget as SVGRectElement).closest('div')?.getBoundingClientRect();
                  const px = parent ? rect.left - parent.left + BAR_W / 2 : rect.left;
                  const py = parent ? rect.top - parent.top - 8 : rect.top;
                  setTooltip({
                    x: px,
                    y: py,
                    text: `${format(day, 'EEE MMM d')} · ${formatDuration(totalSec)}`,
                  });
                  (e.currentTarget as SVGRectElement).style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  setTooltip(null);
                  (e.currentTarget as SVGRectElement).style.opacity = '1';
                }}
              />
              <text
                x={x + BAR_W / 2}
                y={CHART_H + LABEL_H - 6}
                textAnchor="middle"
                style={{
                  fontSize: '9px',
                  fill: isCurrentDay ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  fontWeight: isCurrentDay ? 700 : 400,
                }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: 'var(--color-text-primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
            zIndex: 50,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({
  segments,
}: {
  segments: { label: string; seconds: number; color: string; percent: number }[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  let cumulativeOffset = 0;
  const CX = 65;
  const CY = 65;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      {/* SVG Donut */}
      <div style={{ flexShrink: 0 }}>
        <svg width={130} height={130}>
          {/* Background ring */}
          <circle
            cx={CX}
            cy={CY}
            r={55}
            fill="none"
            stroke="var(--color-bg-tertiary)"
            strokeWidth={18}
          />
          {segments.map((seg, i) => {
            const segLen = (seg.seconds / segments.reduce((s, x) => s + x.seconds, 1)) * CIRCUMFERENCE;
            const offset = cumulativeOffset;
            cumulativeOffset += segLen;
            return (
              <circle
                key={i}
                cx={CX}
                cy={CY}
                r={55}
                fill="none"
                stroke={seg.color}
                strokeWidth={hoveredIdx === i ? 22 : 18}
                strokeDasharray={`${segLen} ${CIRCUMFERENCE}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{
                  transition: 'stroke-width 0.15s ease',
                  cursor: 'pointer',
                  opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
          {/* Center label */}
          <text
            x={CX}
            y={CY - 4}
            textAnchor="middle"
            style={{ fontSize: '11px', fill: 'var(--color-text-muted)', fontWeight: 600 }}
          >
            {segments.length}
          </text>
          <text
            x={CX}
            y={CY + 10}
            textAnchor="middle"
            style={{ fontSize: '9px', fill: 'var(--color-text-muted)' }}
          >
            {segments.length === 1 ? 'project' : 'projects'}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1,
              transition: 'opacity 0.15s ease',
              cursor: 'default',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: seg.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: '0.82rem',
                color: 'var(--color-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {seg.label}
            </span>
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {formatDuration(seg.seconds)}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
                width: 36,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {seg.percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Entry Row ────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  onDelete,
}: {
  entry: TimeEntry;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        borderRadius: 8,
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
        transition: 'background-color 0.1s ease',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pomodoro badge */}
      {entry.isPomodoro && (
        <span
          title="Pomodoro session"
          style={{ fontSize: '0.85rem', flexShrink: 0 }}
        >
          🍅
        </span>
      )}

      {/* Description */}
      <span
        style={{
          flex: 1,
          fontSize: '0.85rem',
          color: entry.description ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontStyle: entry.description ? 'normal' : 'italic',
        }}
      >
        {entry.description ?? 'No description'}
      </span>

      {/* Time range */}
      <span
        style={{
          fontSize: '0.78rem',
          color: 'var(--color-text-muted)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        {formatTime(entry.startTime)}
        {entry.endTime ? ` – ${formatTime(entry.endTime)}` : ''}
      </span>

      {/* Duration */}
      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          fontVariantNumeric: 'tabular-nums',
          width: 56,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {formatDuration(entry.durationSec ?? 0)}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(entry.id)}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: 5,
          backgroundColor: deleteHovered ? 'var(--color-danger-soft)' : 'transparent',
          color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
          cursor: 'pointer',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s ease, background-color 0.1s ease, color 0.1s ease',
          flexShrink: 0,
          padding: 0,
        }}
        title="Delete entry"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TimerReports({ entries }: TimerReportsProps) {
  const [activeTab, setActiveTab] = useState<RangeTab>('week');
  const [customFrom, setCustomFrom] = useState<string>(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  );
  const [customTo, setCustomTo] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [exportHovered, setExportHovered] = useState(false);

  const { data: projects = [] } = useProjects(true);
  const deleteEntry = useDeleteEntry();

  // ─── Date range ────────────────────────────────────────────────────────────

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (activeTab === 'today') {
      const r = getTodayRange();
      return { rangeStart: r.start, rangeEnd: r.end };
    }
    if (activeTab === 'week') {
      const r = getWeekRange();
      return { rangeStart: r.start, rangeEnd: r.end };
    }
    if (activeTab === 'month') {
      const r = getMonthRange();
      return { rangeStart: r.start, rangeEnd: r.end };
    }
    // custom
    return {
      rangeStart: startOfDay(new Date(customFrom)),
      rangeEnd: endOfDay(new Date(customTo)),
    };
  }, [activeTab, customFrom, customTo]);

  // ─── Filtered entries ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (e.isRunning) return false;
      const start = parseISO(e.startTime);
      return start >= rangeStart && start <= rangeEnd;
    });
  }, [entries, rangeStart, rangeEnd]);

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const totalSec = useMemo(
    () => filtered.reduce((s, e) => s + (e.durationSec ?? 0), 0),
    [filtered],
  );
  const sessionCount = filtered.length;
  const avgSec = sessionCount > 0 ? Math.round(totalSec / sessionCount) : 0;

  // ─── Days in range ─────────────────────────────────────────────────────────

  const days = useMemo(() => {
    try {
      return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    } catch {
      return [];
    }
  }, [rangeStart, rangeEnd]);

  // ─── Group entries by day ──────────────────────────────────────────────────

  const entriesByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of filtered) {
      const key = format(parseISO(e.startTime), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered]);

  // ─── Project breakdown ─────────────────────────────────────────────────────

  const projectSegments = useMemo(() => {
    const projectMap = new Map<string | null, number>();
    for (const e of filtered) {
      const key = e.projectId;
      projectMap.set(key, (projectMap.get(key) ?? 0) + (e.durationSec ?? 0));
    }

    return Array.from(projectMap.entries())
      .map(([id, seconds], i) => {
        const proj = id ? projects.find((p) => p.id === id) : null;
        return {
          label: proj ? `${proj.icon ?? ''} ${proj.name}`.trim() : 'No Project',
          seconds,
          color: CHART_COLORS[i % CHART_COLORS.length],
          percent: totalSec > 0 ? (seconds / totalSec) * 100 : 0,
        };
      })
      .sort((a, b) => b.seconds - a.seconds);
  }, [filtered, projects, totalSec]);

  // ─── Entry log grouped by day (reverse chron) ─────────────────────────────

  const groupedEntries = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime(),
    );

    const groups: { dateKey: string; date: Date; entries: TimeEntry[] }[] = [];
    for (const e of sorted) {
      const d = parseISO(e.startTime);
      const key = format(d, 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last?.dateKey === key) {
        last.entries.push(e);
      } else {
        groups.push({ dateKey: key, date: d, entries: [e] });
      }
    }
    return groups;
  }, [filtered]);

  // ─── Export CSV ────────────────────────────────────────────────────────────

  function handleExportCSV() {
    const header = 'Date,Description,Task,Project,Duration (min),Pomodoro\n';
    const rows = filtered.map((e) => {
      const date = format(parseISO(e.startTime), 'yyyy-MM-dd');
      const desc = `"${(e.description ?? '').replace(/"/g, '""')}"`;
      const task = e.taskId ?? '';
      const proj = e.projectId
        ? (projects.find((p) => p.id === e.projectId)?.name ?? e.projectId)
        : '';
      const durationMin = ((e.durationSec ?? 0) / 60).toFixed(1);
      const pomodoro = e.isPomodoro ? 'Yes' : 'No';
      return `${date},${desc},${task},${proj},${durationMin},${pomodoro}`;
    });

    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Tab pills ─────────────────────────────────────────────────────────────

  const tabs: { id: RangeTab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ── Top bar: date range + export ─────────────────────────────── */}
      <div
        style={{
          padding: '20px 28px 0',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Pill tabs */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '3px',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 7,
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 400,
                  border: 'none',
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          onMouseEnter={() => setExportHovered(true)}
          onMouseLeave={() => setExportHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 500,
            border: '1px solid var(--color-border)',
            backgroundColor: exportHovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Custom date pickers */}
      {activeTab === 'custom' && (
        <div
          style={{
            padding: '12px 28px 0',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 28px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* ── Section 1: Summary strip ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <StatCard
            emoji="⏱"
            label="Total Time"
            value={totalSec > 0 ? formatDuration(totalSec) : '—'}
          />
          <StatCard
            emoji="📋"
            label="Sessions"
            value={sessionCount > 0 ? sessionCount.toString() : '0'}
          />
          <StatCard
            emoji="📊"
            label="Avg Session"
            value={avgSec > 0 ? formatDuration(avgSec) : '—'}
          />
        </div>

        {/* ── Section 2: Daily bar chart ───────────────────────────────── */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-sm)',
            padding: '16px 20px',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 14,
            }}
          >
            Daily Activity
          </div>
          {days.length > 0 ? (
            <div style={{ position: 'relative' }}>
              <BarChart days={days} entriesByDay={entriesByDay} />
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
              No data for selected range.
            </p>
          )}
        </div>

        {/* ── Section 3: Project breakdown ─────────────────────────────── */}
        {projectSegments.length > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              boxShadow: 'var(--shadow-sm)',
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 14,
              }}
            >
              Project Breakdown
            </div>
            <DonutChart segments={projectSegments} />
          </div>
        )}

        {/* ── Section 4: Entry log ──────────────────────────────────────── */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            Entry Log
          </div>

          {groupedEntries.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.88rem',
              }}
            >
              No entries for this period.
            </div>
          ) : (
            groupedEntries.map(({ dateKey, date, entries: dayEntries }) => (
              <div key={dateKey}>
                {/* Day header */}
                <div
                  style={{
                    padding: '10px 20px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isToday(date) ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    }}
                  >
                    {isToday(date) ? 'Today' : format(date, 'EEEE, MMM d')}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {formatDuration(
                      dayEntries.reduce((s, e) => s + (e.durationSec ?? 0), 0),
                    )}
                  </span>
                </div>

                {/* Entries */}
                <div style={{ padding: '0 8px 8px' }}>
                  {dayEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onDelete={(id) => deleteEntry.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// --- Focus Session History Panel ----------------------------------------------

function calcFocusScore(distractions: number, targetMin: number, actualMin: number): number {
  const raw = 100 - distractions * 10 - Math.max(0, targetMin - actualMin);
  return Math.min(100, Math.max(0, raw));
}

export function FocusSessionHistory() {
  const sessions = useFocusSessionStore((s) => s.sessions);
  const getWeeklyMinutes = useFocusSessionStore((s) => s.getWeeklyMinutes);
  const weeklyMinutes = getWeeklyMinutes();

  const weekSessions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return sessions.filter((s) => new Date(s.startedAt) >= cutoff);
  }, [sessions]);

  const avgScore = useMemo(() => {
    if (weekSessions.length === 0) return 0;
    const total = weekSessions.reduce(
      (sum, s) => sum + calcFocusScore(s.distractionCount, s.targetMinutes, s.actualMinutes),
      0,
    );
    return Math.round(total / weekSessions.length);
  }, [weekSessions]);

  if (sessions.length === 0) {
    return (
      <div
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 10 }}>??</div>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          No focus sessions yet
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>
          Start one with Alt+F or the Focus Session button
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        {[
          { label: 'Focus Time', value: `${weeklyMinutes}m`, emoji: '?' },
          { label: 'Sessions', value: String(weekSessions.length), emoji: '??' },
          { label: 'Avg Score', value: String(avgScore), emoji: '?' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-elevated)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{stat.emoji}</div>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.slice(0, 20).map((session: FocusSession) => {
          const score = calcFocusScore(
            session.distractionCount,
            session.targetMinutes,
            session.actualMinutes,
          );
          const scoreColor =
            score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : 'var(--color-danger)';
          const date = new Date(session.startedAt);
          return (
            <div
              key={session.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  border: `2.5px solid ${scoreColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: scoreColor,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {score}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {session.taskTitle}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <span>{format(date, 'MMM d, h:mm a')}</span>
                  <span>�</span>
                  <span>{session.actualMinutes}m focused</span>
                  <span>�</span>
                  <span>
                    {Array.from({ length: session.pomodorosCompleted }).map((_, i: number) => (
                      <span key={i}>??</span>
                    ))}
                    {session.pomodorosCompleted === 0 && '�'}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: session.distractionCount === 0 ? '#22c55e' : 'var(--color-text-muted)',
                  flexShrink: 0,
                  fontWeight: 600,
                }}
              >
                {session.distractionCount === 0 ? '?? Clean' : `${session.distractionCount} ?`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
