import type { TaskPriority } from '@/shared/types/task';

interface PriorityIconProps {
  priority: TaskPriority;
  size?: number;
  showLabel?: boolean;
}

const PRIORITY_META: Record<
  TaskPriority,
  { colorVar: string; label: string; bars: number; dash: boolean }
> = {
  4: { colorVar: 'var(--color-priority-urgent, #ef4444)', label: 'Urgent', bars: 4, dash: false },
  3: { colorVar: 'var(--color-priority-high, #f97316)',  label: 'High',   bars: 3, dash: false },
  2: { colorVar: 'var(--color-priority-medium, #eab308)', label: 'Medium', bars: 2, dash: false },
  1: { colorVar: 'var(--color-priority-low, #3b82f6)',   label: 'Low',    bars: 1, dash: false },
  0: { colorVar: 'var(--color-priority-none, #71717a)',  label: 'None',   bars: 0, dash: true  },
};

export function PriorityIcon({ priority, size = 14, showLabel = false }: PriorityIconProps) {
  const meta = PRIORITY_META[priority];
  const { colorVar, label, bars, dash } = meta;

  // Bar dimensions — fits within size×size viewBox
  // 4 bars side by side with 1px gaps
  const totalBars = 4;
  const gap = 1;
  const barWidth = (size - gap * (totalBars - 1)) / totalBars; // ~2.75 at size=14
  const maxBarHeight = size * 0.85;
  const minBarHeight = size * 0.35;

  const icon = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={label}
      style={{ flexShrink: 0 }}
    >
      {dash ? (
        // Priority 0 — gray dash
        <line
          x1={size * 0.15}
          y1={size / 2}
          x2={size * 0.85}
          y2={size / 2}
          stroke={colorVar}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ) : (
        // Priority 1–4 — ascending bar chart
        Array.from({ length: totalBars }, (_, i) => {
          const filled = i < bars;
          const heightRatio = minBarHeight + ((maxBarHeight - minBarHeight) * i) / (totalBars - 1);
          const x = i * (barWidth + gap);
          const y = size - heightRatio;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={heightRatio}
              rx={0.75}
              fill={filled ? colorVar : 'var(--color-border, #3f3f46)'}
            />
          );
        })
      )}
    </svg>
  );

  if (!showLabel) return icon;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {icon}
      <span style={{ fontSize: 12, color: colorVar, lineHeight: 1 }}>{label}</span>
    </span>
  );
}
