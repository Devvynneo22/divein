import { useState } from 'react';
import { Play } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
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

interface DeckCardProps {
  deck: Deck;
  stats: DeckStats | undefined;
  onClick: () => void;
  onStudy: (e: React.MouseEvent) => void;
}

export function DeckCard({ deck, stats, onClick, onStudy }: DeckCardProps) {
  const [hovered, setHovered] = useState(false);
  const gradient = getDeckGradient(deck.color);

  const totalCards = stats?.totalCards ?? 0;
  const masteredCards = stats?.reviewCards ?? 0; // review-stage ≈ mastered
  const dueToday = stats?.dueToday ?? 0;
  const masteredPct = totalCards > 0 ? (masteredCards / totalCards) * 100 : 0;

  const lastStudied = (() => {
    try {
      return formatDistanceToNow(parseISO(deck.updatedAt), { addSuffix: true });
    } catch {
      return 'Never';
    }
  })();

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Gradient color stripe */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ background: gradient }} />

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Title */}
        <h3
          className="font-semibold leading-snug line-clamp-2"
          style={{ color: 'var(--color-text-primary)', fontSize: '18px' }}
        >
          {deck.name}
        </h3>

        {/* Card count + Due badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {totalCards} {totalCards === 1 ? 'card' : 'cards'}
          </span>
          {dueToday > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-warning-soft)',
                color: 'var(--color-warning)',
                border: '1px solid rgba(207,142,23,0.3)',
              }}
            >
              {dueToday} due
            </span>
          )}
          {dueToday === 0 && totalCards > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--color-success-soft)',
                color: 'var(--color-success)',
              }}
            >
              ✓ Up to date
            </span>
          )}
        </div>

        {/* Last studied */}
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Updated {lastStudied}
        </p>

        {/* Progress bar */}
        <div className="mt-auto pt-1">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <span>Mastered</span>
            <span>
              {masteredCards}/{totalCards}
            </span>
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

      {/* Study button — always in DOM, fades in on hover (no layout shift) */}
      <div className="px-5 pb-5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStudy(e);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{
            background: gradient,
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(6px)',
            pointerEvents: hovered ? 'auto' : 'none',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <Play size={13} fill="white" />
          Study
        </button>
      </div>
    </div>
  );
}
