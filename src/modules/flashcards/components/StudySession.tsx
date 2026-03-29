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
  bgColor: string;
  textColorVar: string;
  borderColorVar: string;
  hoverBg: string;
}[] = [
  {
    rating: 'again',
    label: 'Again',
    bgColor: 'var(--color-danger-soft)',
    textColorVar: 'var(--color-danger)',
    borderColorVar: 'var(--color-danger)',
    hoverBg: 'var(--color-danger-soft)',
  },
  {
    rating: 'hard',
    label: 'Hard',
    bgColor: 'var(--color-warning-soft)',
    textColorVar: 'var(--color-warning)',
    borderColorVar: 'var(--color-warning)',
    hoverBg: 'var(--color-warning-soft)',
  },
  {
    rating: 'good',
    label: 'Good',
    bgColor: 'var(--color-success-soft)',
    textColorVar: 'var(--color-success)',
    borderColorVar: 'var(--color-success)',
    hoverBg: 'var(--color-success-soft)',
  },
  {
    rating: 'easy',
    label: 'Easy',
    bgColor: 'var(--color-accent-soft)',
    textColorVar: 'var(--color-accent)',
    borderColorVar: 'var(--color-accent)',
    hoverBg: 'var(--color-accent-muted)',
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
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-success-soft)' }}
          >
            <CheckCircle2 size={40} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Session Complete! 🎉
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Great work — you reviewed {total} cards
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <div
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{pct}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Correct</div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{total}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Cards Reviewed</div>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--color-danger)' }}>{sessionStats.again}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Again</div>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--color-warning)' }}>{sessionStats.hard}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Hard</div>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--color-success)' }}>{sessionStats.good}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Good</div>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="text-lg font-semibold" style={{ color: 'var(--color-accent)' }}>{sessionStats.easy}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Easy</div>
          </div>
        </div>

        <button
          onClick={onExit}
          className="px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
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
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-success-soft)' }}
        >
          <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Nothing due today! 🎉
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            You're all caught up. Come back tomorrow.
          </p>
        </div>
        <button
          onClick={onExit}
          className="px-5 py-2.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
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
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: 'var(--color-accent)',
            }}
          />
        </div>
        <span className="text-xs flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
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
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-6" style={{ color: 'var(--color-text-muted)' }}>
                <Brain size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Question</span>
              </div>
              <p className="text-xl text-center leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {currentCard.front}
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-6" style={{ color: 'var(--color-success)' }}>
                <CheckCircle2 size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Answer</span>
              </div>
              <p className="text-xl text-center leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>
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
            className="px-8 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.borderColor = 'var(--color-border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            Show Answer
          </button>
        ) : (
          <div className="flex gap-3 w-full max-w-xl">
            {RATING_CONFIG.map(({ rating, label, bgColor, textColorVar, borderColorVar, hoverBg }) => {
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
                  className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColorVar}`,
                    color: textColorVar,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBg;
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = bgColor;
                    e.currentTarget.style.opacity = '1';
                  }}
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

        {/* Exit */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <RotateCcw size={12} />
          Exit session
        </button>
      </div>
    </div>
  );
}
