import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from '@/shared/stores/toastStore';
import type { Toast } from '@/shared/stores/toastStore';

// ─── Icons ───────────────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: Toast['type'] }) {
  const map: Record<Toast['type'], string> = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    warning: '⚠️',
  };
  return (
    <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
      {map[type]}
    </span>
  );
}

// ─── Accent border colors ─────────────────────────────────────────────────────

function accentColor(type: Toast['type']): string {
  switch (type) {
    case 'success': return 'var(--color-success)';
    case 'error':   return 'var(--color-danger)';
    case 'info':    return 'var(--color-accent)';
    case 'warning': return 'var(--color-warning)';
  }
}

// ─── Individual toast item ────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const duration = toast.duration ?? 3000;
  const [exiting, setExiting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  // Auto-remove after duration
  useEffect(() => {
    // Schedule auto-dismiss after duration
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  // Entrance animation: start hidden, then enter
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  function handleDismiss() {
    if (exiting) return;
    setExiting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => onRemove(toast.id), 200);
  }

  const accent = accentColor(toast.type);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        width: 320,
        borderRadius: 10,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-popup)',
        overflow: 'hidden',
        // Enter/exit animation
        transform: exiting
          ? 'translateX(100%)'
          : visible
          ? 'translateX(0)'
          : 'translateX(100%)',
        opacity: exiting ? 0 : visible ? 1 : 0,
        transition: exiting
          ? 'transform 0.2s ease, opacity 0.2s ease'
          : 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease',
        // Left accent bar via borderLeft
        borderLeft: `3px solid ${accent}`,
      }}
    >
      {/* Main content row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
        }}
      >
        <ToastIcon type={toast.type} />

        {/* Message */}
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            lineHeight: 1.4,
          }}
        >
          {toast.message}
        </span>

        {/* Optional action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              handleDismiss();
            }}
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 6,
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            {toast.action.label}
          </button>
        )}

        {/* Dismiss button — fades in on hover */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
            color: hovered ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            opacity: hovered ? 1 : 0.5,
            transition: 'opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          backgroundColor: `${accent}30`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            backgroundColor: accent,
            width: '100%',
            // Shrink from full to 0 over `duration` ms
            // If hovered, pause the animation by pausing it
            animationName: 'toast-progress',
            animationDuration: `${duration}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            animationPlayState: hovered ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

// ─── CSS injection for progress keyframe ─────────────────────────────────────

const STYLE_ID = '__toast-progress-style__';

function ensureProgressStyle() {
  if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes toast-progress {
        from { transform: scaleX(1); transform-origin: left; }
        to   { transform: scaleX(0); transform-origin: left; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, remove } = useToastStore();

  // Inject CSS keyframe once
  useEffect(() => {
    ensureProgressStyle();
  }, []);

  if (typeof document === 'undefined') return null;

  const portal = createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse', // newest on top
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={remove} />
        </div>
      ))}
    </div>,
    document.body,
  );

  return portal;
}
