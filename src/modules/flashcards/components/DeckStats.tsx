import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { addDays, format, startOfDay } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Deck {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  newCardsPerDay: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  sourceNoteId: string | null;
  tags: string[];
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
  lastReviewed: string | null;
  status: 'new' | 'learning' | 'review' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

interface DeckStatsProps {
  deck: Deck;
  cards: Card[];
  deckColor?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(hex);
}

function hexToRgba(hex: string, alpha: number): string {
  if (!isValidHex(hex)) return `rgba(99,102,241,${alpha})`;
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({ title, children, defaultExpanded = true }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '0.01em' }}>{title}</span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-muted)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <ChevronDown size={16} />
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 18px 18px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── XP Progress Ring ─────────────────────────────────────────────────────────

interface XPRingProps {
  deck: Deck;
  cards: Card[];
  accentColor: string;
}

function XPRing({ deck, cards, accentColor }: XPRingProps) {
  const storageKey = `divein-xp-${deck.id}`;

  const { todayXP, totalXP, level } = useMemo(() => {
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const reviewedToday = cards.filter(c => {
      if (!c.lastReviewed) return false;
      return format(startOfDay(new Date(c.lastReviewed)), 'yyyy-MM-dd') === today;
    }).length;
    const todayXP = reviewedToday * 10;

    let stored = 0;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        stored = parsed.totalXP ?? 0;
      }
    } catch {
      // ignore
    }

    // Upsert today's XP into stored total
    let totalXP = stored;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed.todayDate !== today) {
        totalXP = stored + todayXP;
        localStorage.setItem(storageKey, JSON.stringify({ totalXP, todayDate: today, todayXP }));
      } else {
        totalXP = parsed.totalXP ?? stored;
      }
    } catch {
      // ignore
    }

    const level = Math.floor(totalXP / 500) + 1;
    return { todayXP, totalXP, level };
  }, [cards, deck.id, storageKey]);

  const goalXP = deck.newCardsPerDay * 10 || 100;
  const progress = Math.min(todayXP / goalXP, 1);

  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = progress * circumference;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '18px 22px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Ring */}
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>Lv.{level}</span>
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)', marginTop: 1 }}>
            {todayXP}/{goalXP}
          </span>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Level {level}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
          {todayXP} XP today · {totalXP} XP total
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Daily goal: {goalXP} XP ({deck.newCardsPerDay} cards × 10)
        </div>
        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 5,
            background: 'var(--color-border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: accentColor,
              borderRadius: 99,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
          {Math.round(progress * 100)}% of daily goal
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  pulse?: boolean;
  icon?: string;
}

function StatCard({ label, value, sub, color, pulse, icon }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        boxShadow: 'var(--shadow-sm)',
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {pulse && (
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--color-danger)',
                display: 'block',
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--color-danger)',
                animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
                opacity: 0.6,
              }}
            />
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: color || 'var(--color-text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Milestone Badges ─────────────────────────────────────────────────────────

interface BadgeDef {
  emoji: string;
  label: string;
  description: string;
  unlocked: boolean;
  color: string;
}

interface MilestoneBadgesProps {
  badges: BadgeDef[];
}

function MilestoneBadges({ badges }: MilestoneBadgesProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {badges.map((badge, i) => (
        <div
          key={badge.label}
          style={{ position: 'relative' }}
          onMouseEnter={() => { setTooltip(badge.description); setTooltipIdx(i); }}
          onMouseLeave={() => { setTooltip(null); setTooltipIdx(null); }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              cursor: 'default',
              position: 'relative',
              background: badge.unlocked ? badge.color : 'var(--color-bg-secondary)',
              border: badge.unlocked
                ? `2px solid ${badge.color}`
                : '2px solid var(--color-border)',
              opacity: badge.unlocked ? 1 : 0.55,
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: badge.unlocked ? 'var(--shadow-md)' : 'none',
            }}
            onMouseEnter={e => {
              if (badge.unlocked) {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.12)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = badge.unlocked ? 'var(--shadow-md)' : 'none';
            }}
          >
            {badge.emoji}
            {!badge.unlocked && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  fontSize: 13,
                }}
              >
                🔒
              </span>
            )}
          </div>
          {tooltipIdx === i && tooltip && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 10px',
                whiteSpace: 'nowrap',
                fontSize: 11,
                color: 'var(--color-text-secondary)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                {badge.emoji} {badge.label}
              </div>
              {tooltip}
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid var(--color-border)',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  total: number;
}

function DonutChart({ segments, total }: DonutChartProps) {
  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const strokeDashoffset = -offset;
    offset += dash;
    return { ...seg, dash, gap, strokeDashoffset };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
            />
          ) : (
            arcs.map((arc, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.strokeDashoffset}
                strokeLinecap="butt"
              />
            ))
          )}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{total}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>cards</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flex: 1 }}>{seg.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {seg.value}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', width: 34, textAlign: 'right' }}>
              {total > 0 ? Math.round(seg.value / total * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ease Histogram ───────────────────────────────────────────────────────────

interface EaseHistogramProps {
  cards: Card[];
}

const EASE_RANGES = [
  { label: '1.3–1.5', min: 1.3, max: 1.5, color: '#ef4444' },
  { label: '1.5–1.8', min: 1.5, max: 1.8, color: '#f97316' },
  { label: '1.8–2.1', min: 1.8, max: 2.1, color: '#eab308' },
  { label: '2.1–2.5', min: 2.1, max: 2.5, color: '#84cc16' },
  { label: '2.5–3.0', min: 2.5, max: 3.0, color: '#22c55e' },
  { label: '3.0+',   min: 3.0, max: Infinity, color: '#10b981' },
];

function EaseHistogram({ cards }: EaseHistogramProps) {
  const buckets = EASE_RANGES.map(range => ({
    ...range,
    count: cards.filter(c => c.easeFactor >= range.min && c.easeFactor < range.max).length,
  }));

  const maxCount = Math.max(...buckets.map(b => b.count), 1);

  const svgW = 340;
  const svgH = 110;
  const padL = 28;
  const padB = 28;
  const padT = 10;
  const padR = 10;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padB - padT;
  const barGap = 4;
  const barW = (chartW - barGap * (buckets.length - 1)) / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block' }}
    >
      {/* Y axis ticks */}
      {[0, 0.5, 1].map(frac => {
        const y = padT + chartH * (1 - frac);
        const val = Math.round(frac * maxCount);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{val}</text>
          </g>
        );
      })}

      {/* Bars */}
      {buckets.map((b, i) => {
        const x = padL + i * (barW + barGap);
        const barH = (b.count / maxCount) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={b.count > 0 ? y : padT + chartH - 1}
              width={barW}
              height={b.count > 0 ? barH : 1}
              rx={3}
              fill={b.color}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={padT + chartH + 14}
              textAnchor="middle"
              fontSize={7}
              fill="var(--color-text-muted)"
            >
              {b.label}
            </text>
            {b.count > 0 && (
              <text
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize={8}
                fill={b.color}
                fontWeight="600"
              >
                {b.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Interval Distribution ────────────────────────────────────────────────────

interface IntervalDistProps {
  cards: Card[];
  accentColor: string;
}

const INTERVAL_BUCKETS = [
  { label: 'New', min: 0, max: 0 },
  { label: '1d',  min: 1, max: 1 },
  { label: '2–3d', min: 2, max: 3 },
  { label: '4–7d', min: 4, max: 7 },
  { label: '1–2w', min: 8, max: 14 },
  { label: '2–4w', min: 15, max: 28 },
  { label: '1–3mo', min: 29, max: 90 },
  { label: '3mo+', min: 91, max: Infinity },
];

function IntervalDist({ cards, accentColor }: IntervalDistProps) {
  const buckets = INTERVAL_BUCKETS.map((b, i) => ({
    ...b,
    count: cards.filter(c => c.intervalDays >= b.min && c.intervalDays <= b.max).length,
    opacity: 0.35 + (i / (INTERVAL_BUCKETS.length - 1)) * 0.65,
  }));

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const svgW = 340;
  const svgH = 110;
  const padL = 28;
  const padB = 28;
  const padT = 10;
  const padR = 10;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padB - padT;
  const barGap = 4;
  const barW = (chartW - barGap * (buckets.length - 1)) / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block' }}
    >
      {[0, 0.5, 1].map(frac => {
        const y = padT + chartH * (1 - frac);
        const val = Math.round(frac * maxCount);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{val}</text>
          </g>
        );
      })}

      {buckets.map((b, i) => {
        const x = padL + i * (barW + barGap);
        const barH = (b.count / maxCount) * chartH;
        const y = padT + chartH - barH;
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={b.count > 0 ? y : padT + chartH - 1}
              width={barW}
              height={b.count > 0 ? barH : 1}
              rx={3}
              fill={accentColor}
              opacity={b.opacity}
            />
            <text
              x={x + barW / 2}
              y={padT + chartH + 14}
              textAnchor="middle"
              fontSize={7}
              fill="var(--color-text-muted)"
            >
              {b.label}
            </text>
            {b.count > 0 && (
              <text
                x={x + barW / 2}
                y={y - 3}
                textAnchor="middle"
                fontSize={8}
                fill={accentColor}
                fontWeight="600"
              >
                {b.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Study Velocity ───────────────────────────────────────────────────────────

interface StudyVelocityProps {
  cards: Card[];
  accentColor: string;
}

function StudyVelocity({ cards, accentColor }: StudyVelocityProps) {
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, -13 + i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = cards.filter(c => {
        if (!c.lastReviewed) return false;
        return format(startOfDay(new Date(c.lastReviewed)), 'yyyy-MM-dd') === dayStr;
      }).length;
      return { date: day, count, label: format(day, 'MMM d') };
    });
  }, [cards]);

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const svgW = 340;
  const svgH = 110;
  const padL = 28;
  const padB = 28;
  const padT = 10;
  const padR = 10;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padB - padT;

  const points = days.map((d, i) => {
    const x = padL + (i / (days.length - 1)) * chartW;
    const y = padT + chartH - (d.count / maxCount) * chartH;
    return { x, y, ...d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Area polygon
  const areaPoints = [
    `${points[0].x},${padT + chartH}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${padT + chartH}`,
  ].join(' ');

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block' }}
    >
      {/* Grid lines */}
      {[0, 0.5, 1].map(frac => {
        const y = padT + chartH * (1 - frac);
        const val = Math.round(frac * maxCount);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{val}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={hexToRgba(accentColor, 0.1)}
      />

      {/* Polyline */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={accentColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill={accentColor}
          stroke="var(--color-bg-elevated)"
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis labels — show every 7th */}
      {points.filter((_, i) => i === 0 || i === 6 || i === 13).map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={padT + chartH + 14}
          textAnchor="middle"
          fontSize={7.5}
          fill="var(--color-text-muted)"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// ─── 14-Day Forecast Bar Chart ─────────────────────────────────────────────────

interface ForecastChartProps {
  cards: Card[];
  accentColor: string;
}

function ForecastChart({ cards, accentColor }: ForecastChartProps) {
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const day = addDays(today, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = cards.filter(c => {
        if (c.status === 'suspended') return false;
        return format(startOfDay(new Date(c.nextReview)), 'yyyy-MM-dd') === dayStr;
      }).length;
      return { label: i === 0 ? 'Today' : format(day, 'MMM d'), count };
    });
  }, [cards]);

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const svgW = 340;
  const svgH = 120;
  const padL = 28;
  const padB = 32;
  const padT = 10;
  const padR = 10;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padB - padT;
  const barGap = 3;
  const barW = (chartW - barGap * (days.length - 1)) / days.length;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block' }}
    >
      {[0, 0.5, 1].map(frac => {
        const y = padT + chartH * (1 - frac);
        const val = Math.round(frac * maxCount);
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{val}</text>
          </g>
        );
      })}

      {days.map((d, i) => {
        const x = padL + i * (barW + barGap);
        const barH = (d.count / maxCount) * chartH;
        const y = padT + chartH - barH;
        const isToday = i === 0;
        return (
          <g key={i}>
            <rect
              x={x}
              y={d.count > 0 ? y : padT + chartH - 1}
              width={barW}
              height={d.count > 0 ? barH : 1}
              rx={3}
              fill={accentColor}
              opacity={isToday ? 1 : 0.55}
            />
            {i % 2 === 0 && (
              <text
                x={x + barW / 2}
                y={padT + chartH + 14}
                textAnchor="middle"
                fontSize={7}
                fill="var(--color-text-muted)"
                transform={`rotate(-35, ${x + barW / 2}, ${padT + chartH + 14})`}
              >
                {d.label}
              </text>
            )}
            {d.count > 0 && barH > 14 && (
              <text
                x={x + barW / 2}
                y={y + 10}
                textAnchor="middle"
                fontSize={7}
                fill="white"
                fontWeight="600"
              >
                {d.count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

interface HeatmapProps {
  cards: Card[];
  accentColor: string;
}

function StudyHeatmap({ cards, accentColor }: HeatmapProps) {
  const today = startOfDay(new Date());
  const WEEKS = 12;
  const DAYS = 7;

  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    cards.forEach(c => {
      if (!c.lastReviewed) return;
      const key = format(startOfDay(new Date(c.lastReviewed)), 'yyyy-MM-dd');
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [cards]);

  // Build grid: 12 weeks × 7 days, ending today
  const todayDow = today.getDay(); // 0=Sun
  const startDay = addDays(today, -(WEEKS * 7 - 1 + todayDow));

  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const day = addDays(startDay, i);
    const key = format(day, 'yyyy-MM-dd');
    const count = activityMap[key] || 0;
    return { day, count };
  });

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  const cellSize = 14;
  const cellGap = 2;
  const svgW = WEEKS * (cellSize + cellGap) + 30;
  const svgH = DAYS * (cellSize + cellGap) + 24;

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', minWidth: svgW }}
      >
        {/* Day labels */}
        {dayLabels.map((label, di) => (
          <text
            key={di}
            x={8}
            y={20 + di * (cellSize + cellGap) + cellSize / 2}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-text-muted)"
            dominantBaseline="middle"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell, idx) => {
          const week = Math.floor(idx / 7);
          const dow = idx % 7;
          const x = 20 + week * (cellSize + cellGap);
          const y = 16 + dow * (cellSize + cellGap);
          const intensity = cell.count / maxCount;
          const fill = cell.count === 0
            ? 'var(--color-border)'
            : hexToRgba(accentColor, 0.2 + intensity * 0.8);

          return (
            <rect
              key={idx}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={fill}
            >
              <title>{format(cell.day, 'MMM d, yyyy')}: {cell.count} review{cell.count !== 1 ? 's' : ''}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10, color: 'var(--color-text-muted)' }}>
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <div
            key={v}
            style={{
              width: 11,
              height: 11,
              borderRadius: 2,
              background: v === 0 ? 'var(--color-border)' : hexToRgba(accentColor, 0.2 + v * 0.8),
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ─── Retention Rate Bar ────────────────────────────────────────────────────────

interface RetentionBarProps {
  cards: Card[];
  accentColor: string;
}

function RetentionBar({ cards, accentColor }: RetentionBarProps) {
  const mature = cards.filter(c => c.intervalDays >= 21).length;
  const reviewed = cards.filter(c => c.lastReviewed != null).length;
  const retention = reviewed > 0 ? Math.round((mature / reviewed) * 100) : 0;

  const getColor = (pct: number) => {
    if (pct >= 80) return 'var(--color-success)';
    if (pct >= 60) return accentColor;
    if (pct >= 40) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const color = getColor(retention);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Mature cards (21+ day interval) vs reviewed
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color }}>
          {retention}%
        </span>
      </div>
      <div
        style={{
          height: 10,
          background: 'var(--color-border)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${retention}%`,
            background: color,
            borderRadius: 99,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
        <span>{mature} mature cards</span>
        <span>{reviewed} total reviewed</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DeckStats({ deck, cards, deckColor }: DeckStatsProps) {
  // Resolve accent color
  const resolvedColor = deckColor || deck.color;
  const accentColor =
    resolvedColor && isValidHex(resolvedColor)
      ? resolvedColor
      : 'var(--color-accent)';
  const accentHex =
    resolvedColor && isValidHex(resolvedColor)
      ? resolvedColor
      : '#6366f1';

  // ── Computed stats ──────────────────────────────────────────────────────────
  const today = startOfDay(new Date());

  const totalCards = cards.length;

  const dueToday = useMemo(
    () =>
      cards.filter(c => {
        if (c.status === 'suspended') return false;
        const nr = startOfDay(new Date(c.nextReview));
        return nr <= today;
      }).length,
    [cards]
  );

  const mastered = cards.filter(c => c.status === 'review' && c.intervalDays >= 21).length;

  const avgEase = useMemo(() => {
    if (cards.length === 0) return 0;
    return cards.reduce((sum, c) => sum + c.easeFactor, 0) / cards.length;
  }, [cards]);

  const leeches = cards.filter(c => c.easeFactor < 1.5 && c.repetitions > 3).length;

  const streak = useMemo(() => {
    try {
      const raw = localStorage.getItem('divein-study-streak');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return parsed.streak ?? 0;
    } catch {
      return 0;
    }
  }, []);

  // Ease color
  const easeColor =
    avgEase > 2.5
      ? 'var(--color-success)'
      : avgEase > 2.0
      ? 'var(--color-warning)'
      : 'var(--color-danger)';

  // Milestone badges
  const anyReviewed = cards.some(c => c.lastReviewed != null);
  const reviewStatusPct = totalCards > 0
    ? cards.filter(c => c.status === 'review').length / totalCards
    : 0;

  const badges: BadgeDef[] = [
    {
      emoji: '🎯',
      label: 'First Review',
      description: 'Review at least one card',
      unlocked: anyReviewed,
      color: hexToRgba(accentHex, 0.2),
    },
    {
      emoji: '🔥',
      label: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      unlocked: streak >= 7,
      color: 'rgba(249,115,22,0.2)',
    },
    {
      emoji: '💯',
      label: 'Perfect Session',
      description: 'Complete a perfect review session (coming soon)',
      unlocked: false,
      color: 'rgba(234,179,8,0.2)',
    },
    {
      emoji: '🧠',
      label: '100 Cards',
      description: 'Add 100 or more cards to this deck',
      unlocked: totalCards >= 100,
      color: 'rgba(168,85,247,0.2)',
    },
    {
      emoji: '⭐',
      label: 'Master',
      description: '50% or more cards in review status',
      unlocked: reviewStatusPct >= 0.5,
      color: 'rgba(234,179,8,0.2)',
    },
    {
      emoji: '🏆',
      label: 'Scholar',
      description: 'Add 500 or more cards to this deck',
      unlocked: totalCards >= 500,
      color: 'rgba(16,185,129,0.2)',
    },
  ];

  // Donut segments
  const donutSegments: DonutSegment[] = [
    {
      value: cards.filter(c => c.status === 'new').length,
      color: 'var(--color-text-muted)',
      label: 'New',
    },
    {
      value: cards.filter(c => c.status === 'learning').length,
      color: 'var(--color-warning)',
      label: 'Learning',
    },
    {
      value: cards.filter(c => c.status === 'review').length,
      color: accentHex,
      label: 'Review',
    },
    {
      value: cards.filter(c => c.status === 'suspended').length,
      color: 'var(--color-danger)',
      label: 'Suspended',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Ping keyframe */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* XP Progress Ring */}
      <XPRing deck={deck} cards={cards} accentColor={accentHex} />

      {/* Summary Stat Cards */}
      <CollapsibleSection title="Overview">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard
            label="Total Cards"
            value={totalCards}
            sub={`${deck.newCardsPerDay} new/day limit`}
          />
          <StatCard
            label="Due Today"
            value={dueToday}
            sub="cards pending review"
            color={dueToday > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
            pulse={dueToday > 0}
          />
          <StatCard
            label="Mastered"
            value={mastered}
            sub="21+ day interval"
            color="var(--color-success)"
          />
          <StatCard
            label="Avg Ease"
            value={cards.length > 0 ? avgEase.toFixed(2) : '—'}
            sub={avgEase > 2.5 ? 'Great' : avgEase > 2.0 ? 'OK' : 'Low'}
            color={cards.length > 0 ? easeColor : 'var(--color-text-muted)'}
          />
          <StatCard
            label="Leeches"
            value={leeches}
            sub="ease<1.5 & reps>3"
            color={leeches > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'}
          />
          <StatCard
            label="Study Streak"
            value={streak}
            sub="days in a row"
            icon="🔥"
            color={streak >= 7 ? 'var(--color-warning)' : streak > 0 ? accentHex : 'var(--color-text-muted)'}
          />
        </div>
      </CollapsibleSection>

      {/* Milestone Badges */}
      <CollapsibleSection title="Milestones">
        <MilestoneBadges badges={badges} />
      </CollapsibleSection>

      {/* Card Maturity Donut */}
      <CollapsibleSection title="Card Maturity">
        <DonutChart segments={donutSegments} total={totalCards} />
      </CollapsibleSection>

      {/* Retention Rate */}
      <CollapsibleSection title="Retention Rate">
        <RetentionBar cards={cards} accentColor={accentHex} />
      </CollapsibleSection>

      {/* 14-Day Forecast */}
      <CollapsibleSection title="14-Day Review Forecast">
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No cards scheduled yet
          </div>
        ) : (
          <ForecastChart cards={cards} accentColor={accentHex} />
        )}
      </CollapsibleSection>

      {/* Ease Distribution */}
      <CollapsibleSection title="Ease Distribution">
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No cards yet
          </div>
        ) : (
          <>
            <EaseHistogram cards={cards} />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EASE_RANGES.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{r.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Interval Distribution */}
      <CollapsibleSection title="Interval Distribution">
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No cards yet
          </div>
        ) : (
          <IntervalDist cards={cards} accentColor={accentHex} />
        )}
      </CollapsibleSection>

      {/* Study Velocity */}
      <CollapsibleSection title="Study Velocity (Last 14 Days)">
        {cards.every(c => !c.lastReviewed) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No study activity recorded yet
          </div>
        ) : (
          <StudyVelocity cards={cards} accentColor={accentHex} />
        )}
      </CollapsibleSection>

      {/* Study Heatmap */}
      <CollapsibleSection title="Study Activity (12 Weeks)">
        {cards.every(c => !c.lastReviewed) ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            No study activity recorded yet
          </div>
        ) : (
          <StudyHeatmap cards={cards} accentColor={accentHex} />
        )}
      </CollapsibleSection>
    </div>
  );
}
