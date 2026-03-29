import type { TaskStatus } from '@/shared/types/task';

interface StatusIconProps {
  status: TaskStatus;
  size?: number;
}

const STATUS_COLOR_VAR: Record<TaskStatus, string> = {
  backlog:     'var(--color-status-backlog, #a1a1aa)',
  inbox:       'var(--color-status-inbox, #a1a1aa)',
  todo:        'var(--color-status-todo, #60a5fa)',
  in_progress: 'var(--color-status-in-progress, #fb923c)',
  in_review:   'var(--color-status-in-review, #c084fc)',
  done:        'var(--color-status-done, #4ade80)',
  cancelled:   'var(--color-status-cancelled, #f87171)',
};

export function StatusIcon({ status, size = 10 }: StatusIconProps) {
  const color = STATUS_COLOR_VAR[status];
  const r = size / 2;
  const cx = r;
  const cy = r;

  if (status === 'done') {
    // Filled circle with a checkmark
    const checkScale = size / 10;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Done"
        style={{ flexShrink: 0 }}
      >
        <circle cx={cx} cy={cy} r={r} fill={color} />
        <polyline
          points={`${2.5 * checkScale},${5 * checkScale} ${4.2 * checkScale},${7 * checkScale} ${7.5 * checkScale},${3 * checkScale}`}
          stroke="white"
          strokeWidth={1.2 * checkScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === 'in_progress') {
    // Circle with a filled inner dot to indicate activity
    const innerR = r * 0.45;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="In Progress"
        style={{ flexShrink: 0 }}
      >
        <circle cx={cx} cy={cy} r={r - 0.75} stroke={color} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={innerR} fill={color} />
      </svg>
    );
  }

  if (status === 'in_review') {
    // Circle with a dashed stroke to suggest review/pending
    const dashArray = `${(Math.PI * (r - 0.75) * 2) / 4} ${(Math.PI * (r - 0.75) * 2) / 4}`;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="In Review"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r - 0.75}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={dashArray}
          strokeDashoffset={0}
        />
      </svg>
    );
  }

  if (status === 'cancelled') {
    // Circle with an X inside
    const offset = r * 0.35;
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Cancelled"
        style={{ flexShrink: 0 }}
      >
        <circle cx={cx} cy={cy} r={r - 0.75} stroke={color} strokeWidth={1.5} />
        <line
          x1={cx - offset}
          y1={cy - offset}
          x2={cx + offset}
          y2={cy + offset}
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
        <line
          x1={cx + offset}
          y1={cy - offset}
          x2={cx - offset}
          y2={cy + offset}
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // backlog, inbox, todo — hollow circle with colored stroke
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={status}
      style={{ flexShrink: 0 }}
    >
      <circle cx={cx} cy={cy} r={r - 0.75} stroke={color} strokeWidth={1.5} />
    </svg>
  );
}
