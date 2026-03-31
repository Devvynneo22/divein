import { useState, useCallback, useEffect } from 'react';
import { X, RotateCcw, CheckCircle2 } from 'lucide-react';
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
  allCards?: Card[];
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
    label: 'Again',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-soft)',
    border: 'rgba(224,62,62,0.3)',
    hoverBg: 'rgba(224,62,62,0.15)',
  },
  {
    rating: 'hard' as UIRating,
    emoji: '😐',
    label: 'Hard',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-soft)',
    border: 'rgba(207,142,23,0.3)',
    hoverBg: 'rgba(207,142,23,0.15)',
  },
  {
    rating: 'good' as UIRating,
    emoji: '✅',
    label: 'Good',
    color: 'var(--color-success)',
    bg: 'var(--color-success-soft)',
    border: 'rgba(15,123,15,0.3)',
    hoverBg: 'rgba(15,123,15,0.15)',
  },
  {
    rating: 'easy' as UIRating,
    emoji: '⚡',
    label: 'Easy',
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-soft)',
    border: 'rgba(59,130,246,0.3)',
    hoverBg: 'rgba(59,130,246,0.15)',
  },
] as const;

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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

function getNextReviewDate(cards: Card[]): string {
  if (cards.length === 0) return 'Unknown';
  const timestamps = cards
    .map((c) => new Date(c.nextReview).getTime())
    .filter((t) => !isNaN(t));
  if (timestamps.length === 0) return 'Unknown';
  const minDate = new Date(Math.min(...timestamps));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  minDate.setHours(0, 0, 0, 0);

  if (minDate.getTime() <= todayStart.getTime()) return 'Today';
  if (minDate.getTime() === tomorrowStart.getTime()) return 'Tomorrow';
  return minDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeStreak(): number {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem('divein-study-streak');
    if (raw) {
      const data = JSON.parse(raw) as { lastStudyDate: string; streak: number };
      if (data.lastStudyDate === today) {
        return data.streak;
      } else if (data.lastStudyDate === yesterday) {
        const newStreak = data.streak + 1;
        localStorage.setItem(
          'divein-study-streak',
          JSON.stringify({ lastStudyDate: today, streak: newStreak }),
        );
        return newStreak;
      }
    }
    localStorage.setItem(
      'divein-study-streak',
      JSON.stringify({ lastStudyDate: today, streak: 1 }),
    );
    return 1;
  } catch {
    return 1;
  }
}

export function StudySession({ queue, deckColor, deckName, allCards, onExit }: StudySessionProps) {
  const [localQueue, setLocalQueue] = useState<Card[]>(queue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [cardVisible, setCardVisible] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [missedIds, setMissedIds] = useState<Set<string>>(new Set());
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    startTime: Date.now(),
  });

  const reviewCard = useReviewCard();
  const totalCards = localQueue.length;
  const currentCard: Card | undefined = localQueue[currentIndex];
  const progress = totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;
  const gradient = getDeckGradient(deckColor ?? null);

  // Live session timer
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isComplete]);

  // Update streak once when session completes
  useEffect(() => {
    if (isComplete) {
      setStreakCount(computeStreak());
    }
  }, [isComplete]);

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
        else if (e.key === '4') handleRate('easy');
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

      if (rating === 'again') {
        setMissedIds((prev) => new Set(prev).add(currentCard.id));
      }

      setIsAnimating(true);
      setCardVisible(false);
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
        setCardVisible(true);
      }, 200);
    },
    [currentCard, currentIndex, totalCards, reviewCard, isAnimating],
  );

  function handleRetryMissed() {
    setLocalQueue(localQueue.filter((c) => missedIds.has(c.id)));
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowingAnswer(false);
    setIsComplete(false);
    setIsAnimating(false);
    setTimerSeconds(0);
    setMissedIds(new Set());
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
  }

  function handleStudyAgain() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowingAnswer(false);
    setIsComplete(false);
    setIsAnimating(false);
    setTimerSeconds(0);
    setMissedIds(new Set());
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
  }

  // Running score for header
  const correctSoFar = sessionStats.good + sessionStats.easy;
  const incorrectSoFar = sessionStats.again + sessionStats.hard;

  // ── Session complete ──────────────────────────────────────────────────────
  if (isComplete) {
    const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
    const correct = sessionStats.good + sessionStats.easy;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const elapsed = Date.now() - sessionStats.startTime;

    const accuracyEmoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '💪' : '📚';
    const ringColor =
      pct >= 70
        ? 'var(--color-success)'
        : pct >= 50
          ? 'var(--color-warning)'
          : 'var(--color-danger)';
    const strokeOffset = 282.7 * (1 - pct / 100);

    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 py-10 px-4 text-center">
        {/* Accuracy emoji */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: gradient }}
        >
          <span style={{ fontSize: '2.25rem' }}>{accuracyEmoji}</span>
        </div>

        <div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Session Complete!
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Great work on {deckName ?? 'this deck'}
          </p>
          {streakCount > 1 && (
            <p
              className="text-sm mt-1 font-semibold"
              style={{ color: 'var(--color-warning)' }}
            >
              🔥 {streakCount} day streak!
            </p>
          )}
        </div>

        {/* SVG accuracy ring + stats row */}
        <div className="flex items-center gap-8 flex-wrap justify-center">
          {/* Accuracy ring */}
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-bg-tertiary)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeDasharray="282.7"
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="18"
              fontWeight="bold"
              fill="var(--color-text-primary)"
            >
              {pct}%
            </text>
          </svg>

          {/* Quick stats */}
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1rem' }}>🃏</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {total} cards reviewed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1rem' }}>⏱️</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDuration(elapsed)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1rem' }}>✓</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                {correct} correct
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '1rem' }}>✗</span>
              <span className="text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
                {sessionStats.again + sessionStats.hard} incorrect
              </span>
            </div>
          </div>
        </div>

        {/* Rating breakdown — horizontal bar chart */}
        <div
          className="w-full max-w-sm rounded-2xl p-4 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Rating Breakdown
          </p>
          {RATING_CONFIG.map(({ rating, label, emoji, color }) => {
            const count = sessionStats[rating];
            const pctBar = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-3">
                <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>{emoji}</span>
                <span className="text-xs font-medium w-10 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                  {label}
                </span>
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: '8px', backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pctBar}%`,
                      backgroundColor: color,
                      borderRadius: '9999px',
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums w-6 text-right flex-shrink-0" style={{ color }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={handleStudyAgain}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
            }}
          >
            <RotateCcw size={13} className="inline mr-1.5" />
            Study Again
          </button>

          {sessionStats.again > 0 && (
            <button
              onClick={handleRetryMissed}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                border: '1px solid rgba(224,62,62,0.35)',
                color: 'var(--color-danger)',
                backgroundColor: 'var(--color-danger-soft)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(224,62,62,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)';
              }}
            >
              ❌ Retry Missed ({sessionStats.again})
            </button>
          )}

          <button
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: gradient }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  // ── Empty queue ───────────────────────────────────────────────────────────
  if (!currentCard || totalCards === 0) {
    const nextDate =
      allCards && allCards.length > 0 ? getNextReviewDate(allCards) : null;

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
            No cards due right now.
          </p>
          {nextDate && (
            <p className="text-sm mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Next review: <span style={{ color: 'var(--color-accent)' }}>{nextDate}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {allCards && allCards.length > 0 && (
            <button
              onClick={() => {
                setLocalQueue(allCards);
                setCurrentIndex(0);
                setIsFlipped(false);
                setShowingAnswer(false);
                setTimerSeconds(0);
                setMissedIds(new Set());
                setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: gradient,
                color: 'white',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Study Anyway
            </button>
          )}
          <button
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
            }}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  // ── Main study view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar: progress + exit */}
      <div className="flex flex-col gap-2 mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Progress label */}
          <span
            className="text-xs font-medium tabular-nums flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {currentIndex + 1} / {totalCards}
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

        {/* Deck name + timer + running score */}
        <div className="flex items-center gap-3 px-1">
          {deckName && (
            <span
              className="text-xs font-medium truncate"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {deckName}
            </span>
          )}
          <span
            className="text-xs tabular-nums font-mono flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {formatTimer(timerSeconds)}
          </span>
          {(correctSoFar > 0 || incorrectSoFar > 0) && (
            <span
              className="text-xs font-medium flex-shrink-0 ml-auto"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <span style={{ color: 'var(--color-success)' }}>{correctSoFar} ✓</span>
              {' · '}
              <span style={{ color: 'var(--color-danger)' }}>{incorrectSoFar} ✗</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Card counter ── */}
      <div className="flex justify-center mb-2 flex-shrink-0">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Card {currentIndex + 1} of {totalCards}
        </span>
      </div>

      {/* ── 3D Flip Card ── */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
        <div
          className="w-full max-w-2xl"
          style={{
            perspective: '1200px',
            opacity: cardVisible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
          onClick={!showingAnswer ? handleShowAnswer : undefined}
        >
          <div
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
              <div className="h-2 w-full flex-shrink-0" style={{ background: gradient }} />
              <div
                className="flex-1 flex flex-col p-10"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 1.5rem 1.5rem',
                }}
              >
                {/* Deck name top-left */}
                {deckName && (
                  <span
                    className="text-xs font-medium mb-4 self-start"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {deckName}
                  </span>
                )}

                {/* Question content centered */}
                <div className="flex-1 flex flex-col items-center justify-center">
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

                  {/* Tags */}
                  {currentCard.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-5 justify-center">
                      {currentCard.tags.map((tag) => (
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
                    </div>
                  )}
                </div>

                <p
                  className="text-xs text-center mt-6"
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
              <div className="h-2 w-full flex-shrink-0" style={{ background: gradient }} />
              <div
                className="flex-1 flex flex-col items-center justify-center p-10"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  borderRadius: '0 0 1.5rem 1.5rem',
                  boxShadow: '0 0 0 2px var(--color-success-soft) inset',
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
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Show Answer
          </button>
        ) : (
          <div className="flex gap-3 w-full max-w-xl">
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
                  className="flex-1 flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: bg,
                    border: `1px solid ${border}`,
                    color,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = bg;
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                  <span>{label}</span>
                  <span className="text-xs opacity-60 font-normal">
                    {formatIntervalLabel(days)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Keyboard hints */}
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {!showingAnswer ? (
            <>
              <kbd
                className="px-1.5 py-0.5 rounded text-xs font-mono"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Space
              </kbd>
              {' '}to reveal
            </>
          ) : (
            <>
              {(['1', '2', '3', '4'] as const).map((k, i) => (
                <span key={k}>
                  {i > 0 && ' '}
                  <kbd
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {k}
                  </kbd>
                </span>
              ))}{' '}
              to rate
            </>
          )}
        </p>
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
