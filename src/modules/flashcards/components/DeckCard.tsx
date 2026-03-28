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

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col text-left rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-tertiary)] transition-all duration-200 shadow-sm hover:shadow-md"
    >
      {/* Color stripe */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Icon + Name */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <BookOpen size={18} style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm leading-tight truncate">
              {deck.name}
            </h3>
            {deck.description && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                {deck.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs text-[var(--color-text-muted)]">
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
            <span className="text-xs text-[var(--color-text-muted)]">
              Up to date
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
