interface ModuleSkeletonProps {
  rows?: number;
}

export function ModuleSkeleton({ rows = 5 }: ModuleSkeletonProps) {
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Title skeleton */}
      <div
        className="nexus-skeleton"
        style={{ width: '40%', height: 24, borderRadius: 6 }}
      />
      {/* Row skeletons */}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
        >
          <div
            className="nexus-skeleton"
            style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
          />
          <div
            className="nexus-skeleton"
            style={{
              height: 16,
              borderRadius: 4,
              width: `${55 + ((i * 17) % 35)}%`,
            }}
          />
        </div>
      ))}
      <style>{`
        .nexus-skeleton {
          background: var(--color-bg-tertiary);
          animation: nexus-pulse 1.5s ease-in-out infinite;
        }
        @keyframes nexus-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
