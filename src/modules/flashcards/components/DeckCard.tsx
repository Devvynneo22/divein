import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Deck, DeckStats } from '@/shared/types/flashcard';

interface DeckCardProps {
  deck: Deck;
  stats: DeckStats | undefined;
  onClick: () => void;
}

export function DeckCard({ deck, stats, onClick }: DeckCardProps) {
  const accentColor = deck.color ?? '#3b82f6';
  const hasDue = (stats?.dueToday ?? 0) > 0;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="card card-interactive group relative flex flex-col text-left rounded-xl overflow-hidden"
      style={{
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
      }}
    >
      {/* Color stripe */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex flex-col gap-3 p-5 flex-1">
        {/* Icon + Name */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <BookOpen size={20} style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
              {deck.name}
            </h3>
            {deck.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                {deck.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {stats?.totalCards ?? 0} cards
          </span>
          {hasDue ? (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${accentColor}25`,
                color: accentColor,
              }}
            >
              {stats!.dueToday} due
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Up to date
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
