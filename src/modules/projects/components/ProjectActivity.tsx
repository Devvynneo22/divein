import { Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TimeEntry } from '@/shared/types/timer';

interface ProjectActivityProps {
  timeEntries: TimeEntry[];
  accentColor: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ProjectActivity({ timeEntries, accentColor }: ProjectActivityProps) {
  const completed = timeEntries.filter((e) => !e.isRunning);
  const totalSeconds = completed.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);

  const sorted = [...completed].sort((a, b) =>
    b.startTime.localeCompare(a.startTime),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Clock size={32} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No time entries for this project yet
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
          Start a timer and assign it to this project to track your time
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Total summary */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{
          borderColor: accentColor + '40',
          backgroundColor: accentColor + '10',
          border: `1px solid ${accentColor}40`,
        }}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: accentColor }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Total Time Logged
          </span>
        </div>
        <span className="text-lg font-bold" style={{ color: accentColor }}>
          {formatDuration(totalSeconds)}
        </span>
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-2">
        {sorted.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                {entry.description ?? 'No description'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {format(parseISO(entry.startTime), 'EEEE, MMM d · h:mm a')}
                {entry.endTime && (
                  <> — {format(parseISO(entry.endTime), 'h:mm a')}</>
                )}
              </p>
            </div>
            <span
              className="text-sm font-semibold flex-shrink-0 tabular-nums"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {formatDuration(entry.durationSec ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
