"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, RotateCcw, CheckCircle, Clock, Zap, Award } from "lucide-react";
import { Card, ReviewQuality, UIRating, UI_RATING_QUALITY } from "@/shared/types/flashcard";
import { previewInterval } from "@/shared/lib/sm2";
import { useReviewCard } from "../hooks/useFlashcards";
import { getDeckGradient } from "./DeckCard";

// ─── Rating Config ────────────────────────────────────────────────────────────

const RATING_CONFIG: {
  rating: UIRating;
  label: string;
  shortcut: string;
  color: string;
  bgVar: string;
  borderVar: string;
}[] = [
  {
    rating: "again",
    label: "Again",
    shortcut: "1",
    color: "var(--color-danger)",
    bgVar: "var(--color-danger-soft)",
    borderVar: "var(--color-danger)",
  },
  {
    rating: "hard",
    label: "Hard",
    shortcut: "2",
    color: "var(--color-warning)",
    bgVar: "var(--color-warning-soft)",
    borderVar: "var(--color-warning)",
  },
  {
    rating: "good",
    label: "Good",
    shortcut: "3",
    color: "var(--color-success)",
    bgVar: "var(--color-success-soft)",
    borderVar: "var(--color-success)",
  },
  {
    rating: "easy",
    label: "Easy",
    shortcut: "4",
    color: "var(--color-accent)",
    bgVar: "var(--color-accent-soft)",
    borderVar: "var(--color-accent)",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return formatTimer(totalSeconds);
}

function formatIntervalLabel(days: number): string {
  if (days < 1) return "<1d";
  if (days === 1) return "1d";
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function getNextReviewDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.round(days));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeStreak(ratings: UIRating[]): number {
  let streak = 0;
  for (let i = ratings.length - 1; i >= 0; i--) {
    if (ratings[i] === "good" || ratings[i] === "easy") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── RichText Renderer ────────────────────────────────────────────────────────

interface RichTextProps {
  text: string;
  className?: string;
}

function RichText({ text, className }: RichTextProps) {
  const parse = (input: string): React.ReactNode[] => {
    // Split on newlines first
    const lines = input.split("\n");
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) result.push(<br key={`br-${lineIdx}`} />);

      // Check if it's a list item
      if (line.startsWith("- ")) {
        const content = line.slice(2);
        result.push(
          <li key={`li-${lineIdx}`} style={{ marginLeft: 16 }}>
            {parseInline(content)}
          </li>
        );
      } else {
        result.push(...parseInline(line, lineIdx));
      }
    });

    return result;
  };

  const parseInline = (text: string, keyPrefix?: number): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Combined regex for bold, italic, code, image
    const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(!?\[([^\]]*)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const k = `${keyPrefix ?? 0}-${match.index}`;

      if (match[1]) {
        // **bold**
        nodes.push(<strong key={k}>{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        nodes.push(<em key={k}>{match[4]}</em>);
      } else if (match[5]) {
        // `code`
        nodes.push(
          <code
            key={k}
            style={{
              fontFamily: "monospace",
              background: "var(--color-bg-tertiary)",
              padding: "1px 5px",
              borderRadius: 4,
              fontSize: "0.9em",
            }}
          >
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        // image or link
        const full = match[7];
        if (full.startsWith("!")) {
          const alt = match[8];
          const url = match[9];
          nodes.push(
            <img
              key={k}
              src={url}
              alt={alt}
              style={{ maxWidth: "100%", borderRadius: 8, display: "inline-block" }}
            />
          );
        } else {
          const label = match[8];
          const url = match[9];
          nodes.push(
            <a key={k} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
              {label}
            </a>
          );
        }
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  return <span className={className}>{parse(text)}</span>;
}

// ─── Cloze Helpers ────────────────────────────────────────────────────────────

function hasCloze(text: string): boolean {
  return /\{\{c\d+::([^}]+)\}\}/.test(text);
}

function renderClozeQuestion(text: string): React.ReactNode {
  const parts = text.split(/(\{\{c\d+::[^}]+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
        if (match) {
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                borderBottom: "2px solid var(--color-accent)",
                minWidth: 48,
                color: "transparent",
                userSelect: "none",
                padding: "0 4px",
              }}
            >
              {match[1]}
            </span>
          );
        }
        return <RichText key={i} text={part} />;
      })}
    </>
  );
}

function renderClozeAnswer(text: string): React.ReactNode {
  const parts = text.split(/(\{\{c\d+::[^}]+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/\{\{c\d+::([^}]+)\}\}/);
        if (match) {
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                borderRadius: 20,
                padding: "1px 10px",
                fontWeight: 600,
              }}
            >
              {match[1]}
            </span>
          );
        }
        return <RichText key={i} text={part} />;
      })}
    </>
  );
}

// ─── Heat Strip ───────────────────────────────────────────────────────────────

type HeatResult = "good" | "hard" | "again" | "remaining";

function ratingToHeat(r: UIRating): HeatResult {
  if (r === "good" || r === "easy") return "good";
  if (r === "hard") return "hard";
  return "again";
}

const HEAT_COLORS: Record<HeatResult, string> = {
  good: "var(--color-success)",
  hard: "var(--color-warning)",
  again: "var(--color-danger)",
  remaining: "var(--color-border)",
};

interface HeatStripProps {
  total: number;
  ratings: UIRating[];
}

function HeatStrip({ total, ratings }: HeatStripProps) {
  const dots: HeatResult[] = [];
  for (let i = 0; i < total; i++) {
    if (i < ratings.length) {
      dots.push(ratingToHeat(ratings[i]));
    } else {
      dots.push("remaining");
    }
  }

  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: HEAT_COLORS[d],
            flexShrink: 0,
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

// ─── SVG Confetti ─────────────────────────────────────────────────────────────

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 1.5 + Math.random() * 1.5,
    color: ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"][
      Math.floor(Math.random() * 6)
    ],
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }));

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {pieces.map((p) => (
        <rect
          key={p.id}
          x={`${p.x}%`}
          y="-20"
          width={p.size}
          height={p.size / 2}
          fill={p.color}
          rx={2}
          transform={`rotate(${p.rotate})`}
          style={{
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

// ─── Motivational Messages ────────────────────────────────────────────────────

function getMotivationalMessage(accuracy: number, total: number): string {
  if (accuracy >= 95) return "Flawless! You're on fire! 🔥";
  if (accuracy >= 80) return "Excellent work! Keep it up! 🌟";
  if (accuracy >= 60) return "Good session! Room to grow. 💪";
  if (accuracy >= 40) return "Keep practicing — it gets easier. 🧠";
  return "Every rep counts. Don't give up! 🤞";
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface StudySessionProps {
  deckId: string;
  queue: Card[];
  deckColor?: string | null;
  deckName?: string;
  allCards?: Card[];
  onExit: () => void;
}

export function StudySession({
  deckId,
  queue,
  deckColor,
  deckName,
  allCards,
  onExit,
}: StudySessionProps) {
  const reviewCardMutation = useReviewCard();
  const reviewCard = reviewCardMutation.mutate;
  const isLoading = reviewCardMutation.isPending;

  // ── Session state ──
  const [cards, setCards] = useState<Card[]>(() => [...queue]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [ratings, setRatings] = useState<UIRating[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // ── Per-card timer ──
  const [cardSeconds, setCardSeconds] = useState(0);
  const cardTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardTimesRef = useRef<number[]>([]);

  // ── Slide transition ──
  const [slideState, setSlideState] = useState<"idle" | "exit" | "enter">("idle");
  const [pendingNext, setPendingNext] = useState<null | (() => void)>(null);

  // ── Undo ──
  interface UndoSnapshot {
    cards: Card[];
    index: number;
    ratings: UIRating[];
    cardTimes: number[];
  }
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Streak ──
  const streak = computeStreak(ratings);

  // ── Session timer ──
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Per-card timer ──
  const resetCardTimer = useCallback(() => {
    setCardSeconds(0);
    if (cardTimerRef.current) clearInterval(cardTimerRef.current);
    cardTimerRef.current = setInterval(() => setCardSeconds((s) => s + 1), 1000);
  }, []);

  useEffect(() => {
    resetCardTimer();
    return () => {
      if (cardTimerRef.current) clearInterval(cardTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // ── Slide transition logic ──
  const triggerSlide = useCallback((cb: () => void) => {
    setSlideState("exit");
    setTimeout(() => {
      cb();
      setSlideState("enter");
      setTimeout(() => setSlideState("idle"), 320);
    }, 300);
  }, []);

  // ── Flip card ──
  const handleFlip = useCallback(() => {
    if (!isFlipped) setIsFlipped(true);
  }, [isFlipped]);

  // ── Rate card ──
  const handleRate = useCallback(
    async (rating: UIRating) => {
      if (!isFlipped && !hasCloze(cards[currentIndex]?.front ?? "")) return;

      const quality: ReviewQuality = UI_RATING_QUALITY[rating];
      const card = cards[currentIndex];

      // Save undo snapshot
      const snap: UndoSnapshot = {
        cards: [...cards],
        index: currentIndex,
        ratings: [...ratings],
        cardTimes: [...cardTimesRef.current],
      };
      setUndoSnapshot(snap);

      // Record card time
      cardTimesRef.current = [...cardTimesRef.current, cardSeconds];

      // Update ratings
      const newRatings = [...ratings, rating];
      setRatings(newRatings);

      // Fire API
      try {
        await reviewCard({ cardId: card.id, quality });
      } catch {
        // silent fail
      }

      // Show undo button
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setShowUndo(true);
      undoTimerRef.current = setTimeout(() => {
        setShowUndo(false);
        setUndoSnapshot(null);
      }, 4000);

      // Advance
      if (currentIndex + 1 >= cards.length) {
        triggerSlide(() => {
          setIsComplete(true);
        });
      } else {
        triggerSlide(() => {
          setCurrentIndex((i) => i + 1);
          setIsFlipped(false);
        });
      }
    },
    [isFlipped, cards, currentIndex, ratings, cardSeconds, reviewCard, triggerSlide]
  );

  // ── Undo ──
  const handleUndo = useCallback(() => {
    if (!undoSnapshot) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    cardTimesRef.current = undoSnapshot.cardTimes;
    setCards(undoSnapshot.cards);
    setCurrentIndex(undoSnapshot.index);
    setRatings(undoSnapshot.ratings);
    setIsFlipped(false);
    setIsComplete(false);
    setShowUndo(false);
    setUndoSnapshot(null);
    resetCardTimer();
  }, [undoSnapshot, resetCardTimer]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isComplete) return;
      if (e.key === "Escape") { onExit(); return; }
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); handleFlip(); return; }
      if (isFlipped || hasCloze(cards[currentIndex]?.front ?? "")) {
        if (e.key === "1") handleRate("again");
        if (e.key === "2") handleRate("hard");
        if (e.key === "3") handleRate("good");
        if (e.key === "4") handleRate("easy");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isComplete, isFlipped, cards, currentIndex, handleFlip, handleRate, onExit]);

  // ── Derived ──
  const currentCard = cards[currentIndex];
  const total = cards.length;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const isCloze = currentCard ? hasCloze(currentCard.front) : false;
  const gradient = getDeckGradient(deckColor ?? null);

  // Completion stats
  const goodCount = ratings.filter((r) => r === "good" || r === "easy").length;
  const accuracy = total > 0 ? Math.round((goodCount / ratings.length) * 100) : 0;
  const avgCardTime =
    cardTimesRef.current.length > 0
      ? Math.round(cardTimesRef.current.reduce((a, b) => a + b, 0) / cardTimesRef.current.length)
      : 0;

  // Slide styles
  const cardStyle: React.CSSProperties = {
    transition: "transform 0.3s ease, opacity 0.3s ease",
    transform:
      slideState === "exit"
        ? "translateX(-100%)"
        : slideState === "enter"
        ? "translateX(100%)"
        : "translateX(0)",
    opacity: slideState === "idle" ? 1 : 0,
    width: "100%",
  };

  // ── Complete Screen ──────────────────────────────────────────────────────────
  if (isComplete) {
    const showConfetti = accuracy >= 80;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-bg-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {showConfetti && <Confetti />}

        <div
          style={{
            background: "var(--color-bg-elevated)",
            borderRadius: 20,
            padding: 40,
            maxWidth: 480,
            width: "100%",
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--color-border)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>
              {accuracy >= 80 ? "🎉" : accuracy >= 60 ? "💪" : "🧠"}
            </div>
            <h2
              style={{
                color: "var(--color-text-primary)",
                fontSize: 24,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Session Complete!
            </h2>
            <p style={{ color: "var(--color-text-muted)", marginTop: 6, fontSize: 15 }}>
              {getMotivationalMessage(accuracy, total)}
            </p>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              { label: "Cards", value: total, icon: "📚" },
              { label: "Accuracy", value: `${accuracy}%`, icon: "🎯" },
              { label: "Time", value: formatTimer(sessionSeconds), icon: "⏱️" },
              { label: "Avg/Card", value: `${avgCardTime}s`, icon: "⚡" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "var(--color-bg-secondary)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.icon}</div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontWeight: 700,
                    fontSize: 22,
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Heat strip summary */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 12,
                marginBottom: 6,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Session Results
            </div>
            <HeatStrip total={total} ratings={ratings} />
            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              {[
                { label: "Easy/Good", color: "var(--color-success)", count: ratings.filter((r) => r === "easy" || r === "good").length },
                { label: "Hard", color: "var(--color-warning)", count: ratings.filter((r) => r === "hard").length },
                { label: "Again", color: "var(--color-danger)", count: ratings.filter((r) => r === "again").length },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.color,
                    }}
                  />
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {s.label}: <strong style={{ color: "var(--color-text-primary)" }}>{s.count}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={onExit}
            style={{
              width: "100%",
              background: gradient,
              border: "none",
              borderRadius: 12,
              padding: "14px 0",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: "var(--shadow-md)",
            }}
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  // ── Study Screen ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: "var(--color-bg-elevated)",
          borderBottom: "1px solid var(--color-border)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onExit}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            padding: 4,
            borderRadius: 8,
          }}
          title="Exit (Esc)"
        >
          <X size={20} />
        </button>

        <div style={{ flex: 1 }}>
          {deckName && (
            <div
              style={{
                color: "var(--color-text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 4,
              }}
            >
              {deckName}
            </div>
          )}

          {/* Progress bar */}
          <div
            style={{
              height: 6,
              background: "var(--color-bg-tertiary)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: gradient,
                borderRadius: 99,
                transition: "width 0.4s ease",
              }}
            />
          </div>

          {/* Heat strip */}
          <HeatStrip total={total} ratings={ratings} />
        </div>

        {/* Card counter + per-card timer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <div
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {currentIndex + 1} / {total}
          </div>
          <div
            style={{
              color: "var(--color-text-muted)",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Clock size={10} />
            {cardSeconds}s
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: streak >= 5 ? "var(--color-accent-soft)" : "var(--color-bg-secondary)",
              borderRadius: 20,
              padding: "4px 10px",
              border: "1px solid var(--color-border)",
              boxShadow: streak >= 5 ? "0 0 12px var(--color-accent)" : undefined,
              transition: "all 0.3s",
            }}
          >
            <span style={{ fontSize: 14 }}>🔥</span>
            <span
              style={{
                color: streak >= 5 ? "var(--color-accent)" : "var(--color-text-primary)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {streak}
            </span>
          </div>
        )}

        {/* Session timer */}
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Zap size={12} />
          {formatTimer(sessionSeconds)}
        </div>
      </div>

      {/* Card area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", maxWidth: 560, ...cardStyle }}>
          {/* Card */}
          <div
            onClick={!isCloze ? handleFlip : undefined}
            style={{
              background: "var(--color-bg-elevated)",
              borderRadius: 20,
              padding: 36,
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-lg)",
              cursor: isCloze ? "default" : isFlipped ? "default" : "pointer",
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              userSelect: "none",
              position: "relative",
              transition: "border-color 0.2s",
            }}
          >
            {/* Gradient accent top strip */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: gradient,
                borderRadius: "20px 20px 0 0",
              }}
            />

            {/* Front */}
            {!isFlipped || isCloze ? (
              <div>
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 16,
                  }}
                >
                  {isCloze ? "Fill in the blank" : "Question"}
                </div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {isCloze
                    ? isFlipped
                      ? renderClozeAnswer(currentCard.front)
                      : renderClozeQuestion(currentCard.front)
                    : <RichText text={currentCard.front} />}
                </div>
                {!isFlipped && !isCloze && (
                  <div
                    style={{
                      marginTop: 24,
                      color: "var(--color-text-muted)",
                      fontSize: 13,
                    }}
                  >
                    Press <kbd style={{ background: "var(--color-bg-tertiary)", padding: "2px 7px", borderRadius: 6, fontFamily: "monospace" }}>Space</kbd> to reveal
                  </div>
                )}
              </div>
            ) : (
              // Back (flipped non-cloze)
              <div style={{ width: "100%" }}>
                {/* Show front small */}
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 14,
                    marginBottom: 16,
                    paddingBottom: 16,
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <RichText text={currentCard.front} />
                </div>
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  Answer
                </div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  <RichText text={currentCard.back} />
                </div>
              </div>
            )}
          </div>

          {/* Cloze reveal button */}
          {isCloze && !isFlipped && (
            <button
              onClick={handleFlip}
              style={{
                marginTop: 16,
                width: "100%",
                background: gradient,
                border: "none",
                borderRadius: 12,
                padding: "14px 0",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "var(--shadow-md)",
              }}
            >
              Reveal Answer
            </button>
          )}

          {/* Rating buttons */}
          {(isFlipped || isCloze) && (
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {RATING_CONFIG.map((cfg) => {
                const days = previewInterval(
                  UI_RATING_QUALITY[cfg.rating],
                  currentCard.repetitions,
                  currentCard.easeFactor,
                  currentCard.intervalDays,
                );
                return (
                  <button
                    key={cfg.rating}
                    onClick={() => handleRate(cfg.rating)}
                    disabled={isLoading}
                    style={{
                      background: cfg.bgVar,
                      border: `1.5px solid ${cfg.borderVar}`,
                      borderRadius: 12,
                      padding: "12px 8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      transition: "transform 0.1s, box-shadow 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--shadow-md)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    <span style={{ color: cfg.color, fontWeight: 700, fontSize: 14 }}>
                      {cfg.label}
                    </span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>
                      {formatIntervalLabel(days)}
                    </span>
                    <span
                      style={{
                        background: "var(--color-bg-secondary)",
                        color: "var(--color-text-muted)",
                        borderRadius: 6,
                        padding: "1px 6px",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    >
                      {cfg.shortcut}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Undo button */}
      {showUndo && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
          }}
        >
          <button
            onClick={handleUndo}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "10px 18px",
              cursor: "pointer",
              color: "var(--color-text-primary)",
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "var(--shadow-lg)",
              animation: "undoSlideIn 0.2s ease",
            }}
          >
            <RotateCcw size={15} />
            Undo
          </button>
          <style>{`
            @keyframes undoSlideIn {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default StudySession;
