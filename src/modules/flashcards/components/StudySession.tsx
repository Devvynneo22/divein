import { useState, useCallback } from 'react';
import { RotateCcw, CheckCircle2, Brain } from 'lucide-react';
import type { Card, ReviewQuality, UIRating } from '@/shared/types/flashcard';
import { UI_RATING_QUALITY } from '@/shared/types/flashcard';
import { previewInterval } from '@/shared/lib/sm2';
import { useReviewCard } from '../hooks/useFlashcards';

interface StudySessionProps {
  deckId: string;
  queue: Card[];
  onExit: () => void;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

const RATING_CONFIG: {
  rating: UIRating;
  label: string;
  bgClass: string;
  hoverClass: string;
  textColor: string;
}[] = [
  {
    rating: 'again',
    label: 'Again',
    bgClass: 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30',
    hoverClass: 'hover:bg-[var(--color-danger)]/20 hover:border-[var(--color-danger)]/60',
    textColor: 'text-[var(--color-danger)]',
  },
  {
    rating: 'hard',
    label: 'Hard',
    bgClass: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30',
    hoverClass: 'hover:bg-[var(--color-warning)]/20 hover:border-[var(--color-warning)]/60',
    textColor: 'text-[var(--color-warning)]',
  },
  {
    rating: 'good',
    label: 'Good',
    bgClass: 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30',
    hoverClass: 'hover:bg-[var(--color-success)]/20 hover:border-[var(--color-success)]/60',
    textColor: 'text-[var(--color-success)]',
  },
  {
    rating: 'easy',
    label: 'Easy',
    bgClass: 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30',
    hoverClass: 'hover:bg-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/60',
    textColor: 'text-[var(--color-accent)]',
  },
];

function formatIntervalLabel(days: number): string {
  if (days < 1) return '<1d';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function StudySession({ queue, onExit }: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const reviewCard = useReviewCard();
  const totalCards = queue.length;
  const currentCard = queue[currentIndex] as Card | undefined;
  const progress = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;

  function handleShowAnswer() {
    setShowingAnswer(true);
    setIsFlipped(true);
  }

  const handleRate = useCallback(
    (rating: UIRating) => {
      if (!currentCard) return;
      const quality = UI_RATING_QUALITY[rating] as ReviewQuality;

      reviewCard.mutate({ cardId: currentCard.id, quality });

      setSessionStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalCards) {
        setIsComplete(true);
      } else {
        setCurrentIndex(nextIndex);
        setShowingAnswer(false);
        setIsFlipped(false);
      }
    },
    [currentCard, currentIndex, totalCards, reviewCard],
  );

  // ── Session complete ───────────────────────────────────────────────────────
  if (isComplete) {
    const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
    const correct = sessionStats.good + sessionStats.easy;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-8 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-[var(--color-success)]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Session Complete! 🎉
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              Great work — you reviewed {total} cards
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{pct}%</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Correct</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-4 text-center">
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{total}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Cards Reviewed</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 text-center">
            <div className="text-lg font-semibold text-[var(--color-danger)]">{sessionStats.again}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Again</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 text-center">
            <div className="text-lg font-semibold text-[var(--color-warning)]">{sessionStats.hard}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Hard</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 text-center">
            <div className="text-lg font-semibold text-[var(--color-success)]">{sessionStats.good}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Good</div>
          </div>
          <div className="rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3 text-center">
            <div className="text-lg font-semibold text-[var(--color-accent)]">{sessionStats.easy}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Easy</div>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Back to Deck
        </button>
      </div>
    );
  }

  // ── Empty queue ────────────────────────────────────────────────────────────
  if (!currentCard || totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[var(--color-success)]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Nothing due today! 🎉
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            You're all caught up. Come back tomorrow.
          </p>
        </div>
        <button
          onClick={onExit}
          className="px-5 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          Back to Deck
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 tabular-nums">
          {currentIndex + 1} / {totalCards}
        </span>
      </div>

      {/* Card flip area */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl" style={{ perspective: '1000px' }}>
          <div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '280px',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center gap-2 mb-6 text-[var(--color-text-muted)]">
                <Brain size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Question</span>
              </div>
              <p className="text-xl text-[var(--color-text-primary)] text-center leading-relaxed font-medium">
                {currentCard.front}
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="flex items-center gap-2 mb-6 text-[var(--color-success)]">
                <CheckCircle2 size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Answer</span>
              </div>
              <p className="text-xl text-[var(--color-text-primary)] text-center leading-relaxed font-medium">
                {currentCard.back}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action area */}
      <div className="pt-6 pb-2 flex flex-col items-center gap-4">
        {!showingAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="px-8 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-border-hover)] transition-all active:scale-95"
          >
            Show Answer
          </button>
        ) : (
          <div className="flex gap-3 w-full max-w-xl">
            {RATING_CONFIG.map(({ rating, label, bgClass, hoverClass, textColor }) => {
              const quality = UI_RATING_QUALITY[rating];
              const days = previewInterval(
                quality,
                currentCard.repetitions,
                currentCard.easeFactor,
                currentCard.intervalDays,
              );
              return (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  disabled={reviewCard.isPending}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium transition-all active:scale-95 disabled:opacity-50 ${bgClass} ${hoverClass} ${textColor}`}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs opacity-70">
                    {formatIntervalLabel(days)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Skip / exit */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <RotateCcw size={12} />
          Exit session
        </button>
      </div>
    </div>
  );
}
