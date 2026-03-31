import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuggestionStore } from '@/shared/stores/suggestionStore';
import type { Suggestion } from '@/shared/stores/suggestionStore';

// ─── Priority styling ─────────────────────────────────────────────────────────

const PRIORITY_BORDER: Record<Suggestion['priority'], string> = {
  high: 'var(--color-danger)',
  medium: 'var(--color-warning)',
  low: 'var(--color-accent)',
};

const PRIORITY_BG: Record<Suggestion['priority'], string> = {
  high: 'var(--color-danger-soft)',
  medium: 'var(--color-warning-soft)',
  low: 'var(--color-accent-soft)',
};

const PRIORITY_ICON_BG: Record<Suggestion['priority'], string> = {
  high: 'var(--color-danger-soft)',
  medium: 'var(--color-warning-soft)',
  low: 'var(--color-accent-soft)',
};

// ─── Single card ──────────────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: Suggestion;
  onDismiss: (id: string) => void;
  visible: boolean;
}

function SuggestionCard({ suggestion, onDismiss, visible }: SuggestionCardProps) {
  const navigate = useNavigate();
  const [dismissing, setDismissing] = useState(false);
  const [hoverDismiss, setHoverDismiss] = useState(false);
  const [hoverAction, setHoverAction] = useState(false);

  const borderColor = PRIORITY_BORDER[suggestion.priority];
  const iconBg = PRIORITY_ICON_BG[suggestion.priority];

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissing(true);
    setTimeout(() => onDismiss(suggestion.id), 200);
  }

  function handleAction(e: React.MouseEvent) {
    e.stopPropagation();
    if (suggestion.actionRoute) {
      navigate(suggestion.actionRoute);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: 'var(--color-bg-elevated)',
        borderLeft: `3px solid ${borderColor}`,
        border: `1px solid var(--color-border)`,
        borderLeftWidth: '3px',
        borderLeftColor: borderColor,
        boxShadow: 'var(--shadow-sm)',
        transition: 'opacity 0.2s ease, transform 0.2s ease, max-height 0.2s ease',
        opacity: dismissing || !visible ? 0 : 1,
        transform: dismissing ? 'translateY(-8px)' : 'translateY(0)',
        overflow: 'hidden',
        maxHeight: dismissing ? '0' : '80px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        {suggestion.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestion.title}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestion.description}
        </div>
      </div>

      {/* Action button */}
      {suggestion.actionLabel && suggestion.actionRoute && (
        <button
          onClick={handleAction}
          onMouseEnter={() => setHoverAction(true)}
          onMouseLeave={() => setHoverAction(false)}
          style={{
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
            border: `1px solid ${borderColor}`,
            backgroundColor: hoverAction ? borderColor : 'transparent',
            color: hoverAction ? '#fff' : borderColor,
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestion.actionLabel}
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        onMouseEnter={() => setHoverDismiss(true)}
        onMouseLeave={() => setHoverDismiss(false)}
        aria-label="Dismiss suggestion"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0,
          backgroundColor: hoverDismiss ? 'var(--color-bg-hover)' : 'transparent',
          color: 'var(--color-text-muted)',
          transition: 'background-color 0.12s',
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export function SuggestionBanner() {
  const getActive = useSuggestionStore((s) => s.getActive);
  const dismiss = useSuggestionStore((s) => s.dismiss);
  const dismissAll = useSuggestionStore((s) => s.dismissAll);
  const [visible, setVisible] = useState(true);
  const [hoverDismissAll, setHoverDismissAll] = useState(false);

  const active = getActive();
  const top3 = active.slice(0, 3);

  const handleDismissAll = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      dismissAll();
      setVisible(true);
    }, 220);
  }, [dismissAll]);

  if (top3.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {/* Cards */}
      {top3.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onDismiss={dismiss}
          visible={visible}
        />
      ))}

      {/* Dismiss all */}
      {top3.length >= 2 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '4px' }}>
          <button
            onClick={handleDismissAll}
            onMouseEnter={() => setHoverDismissAll(true)}
            onMouseLeave={() => setHoverDismissAll(false)}
            style={{
              fontSize: '11px',
              color: hoverDismissAll ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '3px 6px',
              borderRadius: '4px',
              transition: 'color 0.12s',
            }}
          >
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
