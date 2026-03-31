// Animated shimmer skeleton components for loading states.
// Usage:
//   <Skeleton width="100%" height={16} radius={8} />
//   <SkeletonText lines={3} />
//   <SkeletonCard height={200} />
//   <SkeletonRow />
//   <SkeletonStatCard />
//
// NOTE: Skeleton is the preferred replacement for LoadingSpinner inside content areas.
// LoadingSpinner remains the correct choice for full-page / suspense boundaries.

import React from 'react';

// ─── Keyframe injection ────────────────────────────────────────────────────────

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`;

(function injectOnce() {
  if (typeof document === 'undefined') return;
  const ID = 'skeleton-shimmer-keyframes';
  if (!document.getElementById(ID)) {
    const el = document.createElement('style');
    el.id = ID;
    el.textContent = SHIMMER_CSS;
    document.head.appendChild(el);
  }
})();

// ─── Shared shimmer style ─────────────────────────────────────────────────────

const shimmerBase: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-bg-tertiary) 50%, var(--color-bg-secondary) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

// ─── Base Skeleton ────────────────────────────────────────────────────────────

export function Skeleton({
  width,
  height,
  radius,
  className,
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        ...shimmerBase,
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius: radius ?? 6,
        flexShrink: 0,
      }}
    />
  );
}

// ─── SkeletonText ─────────────────────────────────────────────────────────────

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
}: {
  lines?: number;
  lastLineWidth?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          radius={4}
        />
      ))}
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
// Matches the project / deck card shape.

export function SkeletonCard({ height = 200 }: { height?: number }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        padding: '20px',
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header: icon + title/subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} radius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width="60%" height={14} radius={4} />
          <Skeleton width="40%" height={11} radius={4} />
        </div>
      </div>

      {/* Body lines */}
      <Skeleton width="100%" height={10} radius={4} />
      <Skeleton width="80%" height={10} radius={4} />

      {/* Footer badges */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <Skeleton width={64} height={22} radius={20} />
        <Skeleton width={64} height={22} radius={20} />
      </div>
    </div>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
// Generic list row — works for tasks, notes sidebar rows, etc.

export function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
      }}
    >
      {/* Icon / checkbox placeholder */}
      <Skeleton width={16} height={16} radius={8} />

      {/* Title — flex fill */}
      <div style={{ flex: 1 }}>
        <Skeleton height={13} radius={4} />
      </div>

      {/* Right badge */}
      <Skeleton width={56} height={13} radius={10} />
    </div>
  );
}

// ─── SkeletonStatCard ─────────────────────────────────────────────────────────
// Matches the PremiumStatCard shape used on the Dashboard.

export function SkeletonStatCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-border)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      {/* Icon circle */}
      <Skeleton width={44} height={44} radius={12} />

      {/* Text block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="50%" height={30} radius={6} />
        <Skeleton width="70%" height={12} radius={4} />
        <Skeleton width="55%" height={11} radius={4} />
      </div>
    </div>
  );
}
