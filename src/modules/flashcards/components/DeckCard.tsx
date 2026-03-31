import { useState } from 'react';
import { Play, LayoutList } from 'lucide-react';
import type { Deck, DeckStats } from '@/shared/types/flashcard';

// 8 gradient presets keyed by base color
export const DECK_GRADIENT_MAP: Record<string, string> = {
  '#3b82f6': 'linear-gradient(135deg, #3b82f6, #6366f1)',
  '#8b5cf6': 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  '#ec4899': 'linear-gradient(135deg, #ec4899, #f43f5e)',
  '#ef4444': 'linear-gradient(135deg, #ef4444, #f97316)',
  '#f59e0b': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  '#22c55e': 'linear-gradient(135deg, #22c55e, #10b981)',
  '#14b8a6': 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  '#f97316': 'linear-gradient(135deg, #f97316, #eab308)',
};

export function getDeckGradient(color: string | null): string {
  const c = color ?? '#3b82f6';
  return DECK_GRADIENT_MAP[c] ?? `linear-gradient(135deg, ${c}, ${c})`;
}

// Small SVG mastery ring (24x24)
function MasteryRing({ pct, color }: { pct: number; color: string }) {
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle
        cx="12" cy="12" r={r}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="3"
      />
      <circle
        cx="12" cy="12" r={r}
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 12 12)"
        style={{ transition: 'stroke-dashoffset 0.5s ease', opacity: pct > 0 ? 1 : 0.3 }}
      />
    </svg>
  );
}

interface DeckCardProps {
  deck: Deck;
  stats: DeckStats | undefined;
  onClick: () => void;
  onStudy: (e: React.MouseEvent) => void;
}

export function DeckCard({ deck, stats, onClick, onStudy }: DeckCardProps) {
  const [hovered, setHovered] = useState(false);
  const [studyHovered, setStudyHovered] = useState(false);
  const [cardsHovered, setCardsHovered] = useState(false);
  const gradient = getDeckGradient(deck.color);
  const baseColor = deck.color ?? '#3b82f6';

  const totalCards = stats?.totalCards ?? 0;
  const masteredCards = stats?.reviewCards ?? 0;
  const dueToday = stats?.dueToday ?? 0;
  const masteredPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // Dot pattern overlay using radial-gradient
  const dotPattern = 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        boxShadow: hovered
          ? `var(--shadow-lg), 0 0 20px ${baseColor}33`
          : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
        minHeight: '220px',
      }}
    >
      {/* ── Gradient header with deck name ── */}
      <div
        className="relative flex-shrink-0 flex items-end px-4 pb-3"
        style={{
          height: '72px',
          background: gradient,
          overflow: 'hidden',
        }}
      >
        {/* Dot pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: dotPattern,
            backgroundSize: '10px 10px',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />

        {/* Mastery ring — top left */}
        <div
          style={{ position: 'absolute', top: '10px', left: '12px' }}
          title={`${masteredPct}% mastered`}
        >
          <MasteryRing pct={masteredPct} color={baseColor} />
        </div>

        <h3
          className="font-bold leading-tight line-clamp-2 pr-2 relative z-10"
          style={{
            color: 'white',
            fontSize: '15px',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            paddingLeft: '32px', // leave space for mastery ring
          }}
        >
          {deck.name}
        </h3>

        {/* Due today badge — top right */}
        {dueToday > 0 && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold z-10"
            style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              color: 'var(--color-warning)',
            }}
          >
            <span style={{ fontSize: '10px' }}>⚡</span>
            {dueToday} due
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Stats row */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{totalCards} {totalCards === 1 ? 'card' : 'cards'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span
            style={{
              color: dueToday > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)',
              fontWeight: dueToday > 0 ? 600 : 400,
            }}
          >
            {dueToday} due
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{masteredPct}% mastered</span>
        </div>

        {/* Tags as pills */}
        {deck.tags && deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deck.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {tag}
              </span>
            ))}
            {deck.tags.length > 3 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-muted)',
                }}
              >
                +{deck.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Status badge */}
        {dueToday > 0 ? (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{
              backgroundColor: 'var(--color-warning-soft)',
              color: 'var(--color-warning)',
              border: '1px solid rgba(207,142,23,0.25)',
            }}
          >
            <span>🔔</span>
            <span>{dueToday} card{dueToday !== 1 ? 's' : ''} due today</span>
          </div>
        ) : totalCards > 0 ? (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
            style={{
              backgroundColor: 'var(--color-success-soft)',
              color: 'var(--color-success)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <span>✓</span>
            <span>All caught up</span>
          </div>
        ) : (
          <div
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
            }}
          >
            Empty deck — add some cards
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-auto">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>Mastery</span>
            <span>{masteredCards}/{totalCards}</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${masteredPct}%`,
                background: gradient,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Action buttons — always visible ── */}
      <div
        className="flex gap-2 px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Study button */}
        <button
          onMouseEnter={() => setStudyHovered(true)}
          onMouseLeave={() => setStudyHovered(false)}
          onClick={onStudy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{
            background: gradient,
            boxShadow: studyHovered ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.15)',
            transform: studyHovered ? 'scale(1.02)' : 'scale(1)',
            transition: 'box-shadow 0.2s ease, transform 0.15s ease',
          }}
        >
          <Play size={12} fill="white" />
          Study
        </button>

        {/* Cards button */}
        <button
          onMouseEnter={() => setCardsHovered(true)}
          onMouseLeave={() => setCardsHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{
            backgroundColor: cardsHovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-tertiary)',
            color: cardsHovered ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
          title="View cards"
        >
          <LayoutList size={12} />
          Cards
        </button>
      </div>
    </div>
  );
}
