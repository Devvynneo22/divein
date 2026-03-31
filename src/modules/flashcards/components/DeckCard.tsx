import React, { useState } from 'react';
import { BookOpen, Trash2, ChevronRight, Zap, CheckCircle2, Circle } from 'lucide-react';

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

interface DeckStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
}

// ─── Gradient Map ─────────────────────────────────────────────────────────────

export const DECK_GRADIENT_MAP: Record<string, string> = {
  '#3b82f6': 'linear-gradient(135deg, #3b82f6, #6366f1)',
  '#8b5cf6': 'linear-gradient(135deg, #8b5cf6, #a855f7)',
  '#ec4899': 'linear-gradient(135deg, #ec4899, #f43f5e)',
  '#ef4444': 'linear-gradient(135deg, #ef4444, #f97316)',
  '#f59e0b': 'linear-gradient(135deg, #f59e0b, #eab308)',
  '#22c55e': 'linear-gradient(135deg, #22c55e, #10b981)',
  '#14b8a6': 'linear-gradient(135deg, #14b8a6, #06b6d4)',
  '#f97316': 'linear-gradient(135deg, #f97316, #ef4444)',
};

export function getDeckGradient(color: string | null): string {
  if (!color) return DECK_GRADIENT_MAP['#3b82f6'];
  return DECK_GRADIENT_MAP[color.toLowerCase()] ?? DECK_GRADIENT_MAP['#3b82f6'];
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const SHIMMER_STYLE = `
  @keyframes deckShimmer {
    0% { transform: translateX(-100%) skewX(-12deg); }
    100% { transform: translateX(250%) skewX(-12deg); }
  }
  @keyframes deckCardHover {
    from { box-shadow: var(--shadow-sm); }
    to   { box-shadow: var(--shadow-lg); }
  }
  .deck-card {
    transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.22s ease;
    position: relative;
  }
  .deck-card:hover {
    transform: translateY(-3px) scale(1.02);
  }
  .deck-card .deck-delete-btn {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
  .deck-card:hover .deck-delete-btn {
    opacity: 1;
    pointer-events: auto;
  }
  .deck-card .shimmer-overlay {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }
  .deck-card .shimmer-overlay::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.18) 50%,
      transparent 100%
    );
    transform: translateX(-100%) skewX(-12deg);
    opacity: 0;
    transition: opacity 0.1s ease;
  }
  .deck-card:hover .shimmer-overlay::after {
    opacity: 1;
    animation: deckShimmer 0.7s ease-out forwards;
  }
  .deck-list-row {
    transition: background 0.15s ease;
  }
  .deck-list-row .row-delete-btn {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;
  }
  .deck-list-row:hover .row-delete-btn {
    opacity: 1;
    pointer-events: auto;
  }
`;

// ─── MasteryRing ──────────────────────────────────────────────────────────────

function MasteryRing({ pct }: { pct: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0 }}
    >
      {/* Track */}
      <circle
        cx={12}
        cy={12}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={2.5}
      />
      {/* Progress */}
      <circle
        cx={12}
        cy={12}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMastery(stats: DeckStats | undefined): number {
  if (!stats || stats.totalCards === 0) return 0;
  const mature = stats.totalCards - stats.newCards - stats.learningCards;
  return Math.round(Math.max(0, (mature / stats.totalCards) * 100));
}

function StatusBadge({ stats }: { stats: DeckStats | undefined }) {
  if (!stats || stats.totalCards === 0) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: 999,
          background: 'var(--color-bg-tertiary)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
        }}
      >
        Empty
      </span>
    );
  }
  if (stats.dueToday > 0) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 999,
          background: 'var(--color-warning-soft)',
          color: 'var(--color-warning)',
          border: '1px solid var(--color-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Zap size={10} />
        {stats.dueToday} due
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--color-success-soft)',
        color: 'var(--color-success)',
        border: '1px solid var(--color-success)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <CheckCircle2 size={10} />
      Caught up
    </span>
  );
}

// ─── DeckCard (grid) ──────────────────────────────────────────────────────────

interface DeckCardProps {
  deck: Deck;
  stats: DeckStats | undefined;
  onClick: () => void;
  onStudy: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function DeckCard({ deck, stats, onClick, onStudy, onDelete }: DeckCardProps) {
  const gradient = getDeckGradient(deck.color);
  const mastery = getMastery(stats);
  const totalCards = stats?.totalCards ?? 0;
  const dueToday = stats?.dueToday ?? 0;
  const visibleTags = deck.tags.slice(0, 3);
  const extraTags = deck.tags.length - 3;

  // Glow color for hover shadow
  const glowColor = deck.color ? `${deck.color}55` : '#3b82f655';

  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div
        className="deck-card"
        onClick={onClick}
        style={{
          borderRadius: 14,
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          cursor: 'pointer',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          boxShadow: 'var(--shadow-sm)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 8px 32px ${glowColor}, var(--shadow-md)`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            height: 72,
            background: gradient,
            borderRadius: '13px 13px 0 0',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 12px 8px',
          }}
        >
          {/* Dot pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              pointerEvents: 'none',
            }}
          />

          {/* Shimmer overlay */}
          <div className="shimmer-overlay" />

          {/* MasteryRing top-left */}
          <div style={{ position: 'absolute', top: 8, left: 10 }}>
            <MasteryRing pct={mastery} />
          </div>

          {/* Due badge top-right */}
          {dueToday > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 10,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(4px)',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Zap size={9} />
              {dueToday}
            </div>
          )}

          {/* Deck name */}
          <span
            style={{
              position: 'relative',
              zIndex: 1,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.25,
              textShadow: '0 1px 4px rgba(0,0,0,0.35)',
              maxWidth: '85%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {deck.name}
          </span>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {totalCards}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                cards
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: 'var(--color-border)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: dueToday > 0 ? 'var(--color-warning)' : 'var(--color-text-primary)',
                }}
              >
                {dueToday}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                due
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: 'var(--color-border)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: mastery >= 80 ? 'var(--color-success)' : 'var(--color-text-primary)',
                }}
              >
                {mastery}%
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                mastery
              </span>
            </div>
          </div>

          {/* Mastery bar */}
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: 'var(--color-bg-tertiary)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${mastery}%`,
                background: gradient,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Tags */}
          {deck.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {visibleTags.map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'var(--color-accent-soft)',
                    color: 'var(--color-accent)',
                    border: '1px solid var(--color-accent-soft)',
                  }}
                >
                  {tag}
                </span>
              ))}
              {extraTags > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  +{extraTags}
                </span>
              )}
            </div>
          )}

          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <StatusBadge stats={stats} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '0 14px 14px',
            display: 'flex',
            gap: 8,
          }}
        >
          {/* Study button */}
          <button
            onClick={e => { e.stopPropagation(); onStudy(e); }}
            style={{
              flex: 1,
              background: gradient,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 0',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'filter 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <Zap size={13} />
            Study
          </button>

          {/* Cards button */}
          <button
            onClick={e => { e.stopPropagation(); onClick(); }}
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-tertiary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-hover)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-secondary)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
            }}
          >
            <BookOpen size={13} />
            Cards
          </button>
        </div>

        {/* Delete button — appears on hover */}
        {onDelete && (
          <button
            className="deck-delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(e); }}
            title="Delete deck"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 28,
              height: 28,
              borderRadius: 999,
              background: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              border: '1.5px solid var(--color-danger)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              zIndex: 10,
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-soft)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </>
  );
}

// ─── DeckListRow (table/list) ─────────────────────────────────────────────────

interface DeckListRowProps {
  deck: Deck;
  stats: DeckStats | undefined;
  onClick: () => void;
  onStudy: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function DeckListRow({ deck, stats, onClick, onStudy, onDelete }: DeckListRowProps) {
  const gradient = getDeckGradient(deck.color);
  const mastery = getMastery(stats);
  const totalCards = stats?.totalCards ?? 0;
  const dueToday = stats?.dueToday ?? 0;
  const dotColor = deck.color ?? '#3b82f6';

  return (
    <>
      <style>{SHIMMER_STYLE}</style>
      <div
        className="deck-list-row"
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 56,
          padding: '8px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
          position: 'relative',
          borderRadius: 8,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-secondary)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-elevated)';
        }}
      >
        {/* Color dot */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: gradient,
            flexShrink: 0,
            boxShadow: `0 0 6px ${dotColor}66`,
          }}
        />

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {deck.name}
          </span>
          {deck.description && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {deck.description}
            </span>
          )}
        </div>

        {/* Card count */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 40,
            gap: 1,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {totalCards}
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            cards
          </span>
        </div>

        {/* Due badge */}
        <div style={{ minWidth: 48, display: 'flex', justifyContent: 'center' }}>
          {dueToday > 0 ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: 999,
                background: 'var(--color-warning-soft)',
                color: 'var(--color-warning)',
                border: '1px solid var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                whiteSpace: 'nowrap',
              }}
            >
              <Zap size={9} />
              {dueToday}
            </span>
          ) : (
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
              }}
            >
              —
            </span>
          )}
        </div>

        {/* Tiny mastery bar */}
        <div
          style={{
            width: 60,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div
            style={{
              height: 4,
              borderRadius: 999,
              background: 'var(--color-bg-tertiary)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${mastery}%`,
                background: gradient,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              color: 'var(--color-text-muted)',
              textAlign: 'right',
            }}
          >
            {mastery}%
          </span>
        </div>

        {/* Study button */}
        <button
          onClick={e => { e.stopPropagation(); onStudy(e); }}
          style={{
            background: gradient,
            color: '#fff',
            border: 'none',
            borderRadius: 7,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            transition: 'filter 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
          }}
        >
          <Zap size={11} />
          Study
        </button>

        {/* Delete button — appears on hover */}
        {onDelete && (
          <button
            className="row-delete-btn"
            onClick={e => { e.stopPropagation(); onDelete(e); }}
            title="Delete deck"
            style={{
              background: 'transparent',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger)',
              borderRadius: 7,
              padding: '5px 8px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-danger-soft)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <Trash2 size={13} />
          </button>
        )}

        {/* Chevron hint */}
        <ChevronRight
          size={14}
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
        />
      </div>
    </>
  );
}
