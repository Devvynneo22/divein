import React from 'react';

interface EmptyStateProps {
  icon: string; // emoji
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <>
      {/* Inline keyframes for float animation */}
      <style>{`
        @keyframes divein-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes divein-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          minHeight: 320,
          animation: 'divein-fade-up 0.35s ease both',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '48px 32px',
            maxWidth: 480,
            gap: 0,
          }}
        >
          {/* Background decoration blob */}
          <div
            aria-hidden
            style={{
              position: 'relative',
              width: 120,
              height: 120,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Radial gradient decoration */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 60%, var(--color-accent-soft) 0%, transparent 75%)',
                opacity: 0.8,
              }}
            />
            {/* Soft outer ring */}
            <div
              style={{
                position: 'absolute',
                inset: 8,
                borderRadius: '50%',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-elevated)',
              }}
            />
            {/* Emoji icon */}
            <span
              style={{
                position: 'relative',
                fontSize: 48,
                lineHeight: 1,
                animation: 'divein-float 3.2s ease-in-out infinite',
                display: 'block',
                userSelect: 'none',
              }}
              role="img"
              aria-label={title}
            >
              {icon}
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0,
              marginBottom: 8,
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              maxWidth: 360,
              margin: '0 auto',
              marginBottom: 28,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>

          {/* Actions */}
          {(actionLabel || secondaryLabel) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {actionLabel && onAction && (
                <button
                  onClick={onAction}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: 'var(--color-accent)',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                    letterSpacing: 0.1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {actionLabel}
                </button>
              )}

              {secondaryLabel && onSecondary && (
                <button
                  onClick={onSecondary}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text-muted)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'color 0.15s ease',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  {secondaryLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
