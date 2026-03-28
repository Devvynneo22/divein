interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const SIZES = {
  sm: 16,
  md: 24,
  lg: 40,
} as const;

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const px = SIZES[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem 0',
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'nexus-spin 0.8s linear infinite' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="var(--color-border)"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {text && (
        <span
          style={{
            fontSize: size === 'sm' ? '0.75rem' : '0.8125rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {text}
        </span>
      )}
      <style>{`
        @keyframes nexus-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
