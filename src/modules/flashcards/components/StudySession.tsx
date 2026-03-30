import { useState, useCallback, useEffect, useRef } from 'react';
import { X, RotateCcw, CheckCircle2, Clock, Zap } from 'lucide-react';
import type { Card, ReviewQuality, UIRating } from '@/shared/types/flashcard';
import { UI_RATING_QUALITY } from '@/shared/types/flashcard';
import { previewInterval } from '@/shared/lib/sm2';
import { useReviewCard } from '../hooks/useFlashcards';
import { getDeckGradient } from './DeckCard';

interface StudySessionProps {
  deckId: string;
  queue: Card[];
  deckColor?: string | null;
  deckName?: string;
  onExit: () => void;
}

interface SessionStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
  startTime: number;
}

const RATING_CONFIG = [
  {
    rating: 'again' as UIRating,
    emoji: '❌',
    label: 'Hard',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-soft)',
    border: 'rgba(224,62,62,0.3)',
    hoverBg: 'rgba(224,62,62,0.15)',
  },
  {
    rating: 'hard' as UIRating,
    emoji: '😐',
    label: 'OK',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-soft)',
    border: 'rgba(207,142,23,0.3)',
    hoverBg: 'rgba(207,142,23,0.15)',
  },
  {
    rating: 'good' as UIRating,
    emoji: '✅',
    label: 'Easy',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    border: 'rgba(15,123,15,0.3)',
    hoverBg: 'rgba(15,123,15,0.15)',
  },
] as const;

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatIntervalLabel(days: number): string {
  if (days < 1) return '<1d';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return `${Math.round(days / 30)}mo`;
}

export function StudySession({ queue, deckColor, deckName, onExit }: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    startTime: Date.now(),
  });

  const reviewCard = useReviewCard();
  const totalCards = queue.length;
  const currentCard: Card | undefined = queue[currentIndex];
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;
  const gradient = getDeckGradient(deckColor ?? null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!showingAnswer) {
          e.preventDefault();
          handleShowAnswer();
        }
      } else if (showingAnswer && !isAnimating) {
        if (e.key === '1') handleRate('again');
        else if (e.key === '2') handleRate('hard');
        else if (e.key === '3') handleRate('good');
        else if (e.key === 'Escape') onExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleShowAnswer() {
    setIsFlipped(true);
    setTimeout(() => setShowingAnswer(true), 250);
  }

  const handleRate = useCallback(
    (rating: UIRating) => {
      if (!currentCard || isAnimating) return;
      const quality = UI_RATING_QUALITY[rating] as ReviewQuality;
      reviewCard.mutate({ cardId: currentCard.id, quality });
      setSessionStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      // Brief animation before advancing
      setIsAnimating(true);
      setTimeout(() => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= totalCards) {
          setIsComplete(true);
        } else {
          setCurrentIndex(nextIndex);
          setIsFlipped(false);
          setShowingAnswer(false);
        }
        setIsAnimating(false);
      }, 300);
    },
    [currentCard, currentIndex, totalCards, reviewCard, isAnimating],
  );

  // ── Session complete ──────────────────────────────────────────────────────
  if (isComplete) {
    const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
    const correct = sessionStats.good + sessionStats.easy;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Date.now() - sessionStats.startTime;

    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-8 py-12 px-4 text-center">
        {/* Trophy */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: gradient }}
        >
          <span style={{ fontSize: '2.5rem' }}>🎉</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Session Complete!
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Great work on {deckName ?? 'this deck'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
          <StatBox label="Accuracy" value={`${pct}%`} color="var(--color-accent)" />
          <StatBox label="Cards" value={String(total)} color="var(--color-text-primary)" />
          <StatBox label="Time" value={formatDuration(elapsed)} color="var(--color-text-primary)" icon={<Clock size={14} />} />
          <StatBox label="Streak" value={`${sessionStats.good + sessionStats.easy}`} color="var(--color-success)" icon={<Zap size={14} />} />
        </div>

        {/* Rating breakdown */}
        <div
          className="flex gap-3 w-full max-w-sm rounded-2xl p-4"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          {RATING_CONFIG.map(({ label, emoji, color }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
              <span className="text-lg font-bold tabular-nums" style={{ color }}>
                {sessionStats[label === 'Hard' ? 'again' : label === 'OK' ? 'hard' : 'good']}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setShowingAnswer(false);
              setIsComplete(false);
              setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
            }}
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
          >
            <RotateCcw size={14} className="inline mr-1.5" />
            Study Again
          </button>
          <button
            onClick={onExit}
            className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: gradient }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  // ── Empty queue ───────────────────────────────────────────────────────────
  if (!currentCard || totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 py-16 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: gradient }}
        >
          <CheckCircle2 size={36} color="white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            All caught up! 🎉
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            No cards due right now. Come back tomorrow.
          </p>
        </div>
        <button
          onClick={onExit}
          className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
        >
          Back to Deck
        </button>
      </div>
    );
  }

  // ── Main study view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar: progress + exit */}
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        {/* Progress label */}
        <span className="text-xs font-medium tabular-nums flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          Card {currentIndex + 1} of {totalCards}
        </span>

        {/* Progress bar */}
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: gradient }}
          />
        </div>

        {/* Exit */}
        <button
          onClick={onExit}
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
          title="Exit session (Esc)"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── 3D Flip Card ── */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
        <div
          className="w-full max-w-2xl"
          style={{ perspective: '1200px' }}
          onClick={!showingAnswer ? handleShowAnswer : undefined}
        >
          <div
            ref={cardRef}
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '320px',
              cursor: !showingAnswer ? 'pointer' : 'default',
            }}
          >
            {/* Front face */}
            <div
              className="absolute inset-0 rounded-3xl flex flex-col overflow-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Gradient header strip */}
              <div
                className="h-2 w-full flex-shrink-0"
                style={{ background: gradient }}
              />
              <div
                className="flex-1 flex flex-col items-center justify-center p-10"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 1.5rem 1.5rem',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-6"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Question
                </p>
                <p
                  className="text-center leading-relaxed font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    fontSize: 'clamp(18px, 2.5vw, 24px)',
                    maxWidth: '80%',
                  }}
                >
                  {currentCard.front}
                </p>
                <p
                  className="mt-8 text-xs"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Space or click to reveal
                </p>
              </div>
            </div>

            {/* Back face */}
            <div
              className="absolute inset-0 rounded-3xl flex flex-col overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Gradient header strip */}
              <div
                className="h-2 w-full flex-shrink-0"
                style={{ background: gradient }}
              />
              <div
                className="flex-1 flex flex-col items-center justify-center p-10"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 1.5rem 1.5rem',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-6"
                  style={{ color: 'var(--color-success)' }}
                >
                  Answer
                </p>
                <p
                  className="text-center leading-relaxed font-medium"
                  style={{
                    color: 'var(--color-text-primary)',
                    fontSize: 'clamp(18px, 2.5vw, 24px)',
                    maxWidth: '80%',
                  }}
                >
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action area ── */}
      <div className="pt-6 pb-4 flex flex-col items-center gap-4 flex-shrink-0">
        {!showingAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="px-10 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{
              background: gradient,
              color: 'white',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Show Answer
          </button>
        ) : (
          <div className="flex gap-3 w-full max-w-md">
            {RATING_CONFIG.map(({ rating, emoji, label, color, bg, border, hoverBg }) => {
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
                  disabled={reviewCard.isPending || isAnimating}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: bg,
                    border: `1px solid ${border}`,
                    color,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = bg; }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                  <span>{label}</span>
                  <span className="text-xs opacity-60 font-normal">{formatIntervalLabel(days)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Keyboard hints */}
        {showingAnswer && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>1</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>2</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}>3</kbd>{' '}
            to rate
          </p>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 p-4 rounded-2xl"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      {icon && <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>}
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
    </div>
  );
}
