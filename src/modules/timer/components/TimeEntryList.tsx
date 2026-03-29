import { useState } from 'react';
import { Trash2, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import type { TimeEntry } from '@/shared/types/timer';
import { useTasks } from '../hooks/useTimer';

interface TimeEntryListProps {
  entries: TimeEntry[];
  todayTotalSec: number;
  onDelete: (id: string) => void;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTimeRange(start: string, end: string | null): string {
  const s = format(new Date(start), 'HH:mm');
  if (!end) return `${s} — …`;
  const e = format(new Date(end), 'HH:mm');
  return `${s} — ${e}`;
}

function formatTotalTime(sec: number): string {
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return `${m}m`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function TimeEntryList({ entries, todayTotalSec, onDelete }: TimeEntryListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { data: tasks = [] } = useTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Today
        </h3>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Total: {formatTotalTime(todayTotalSec)}
        </span>
      </div>

      {entries.length === 0 ? (
        <p
          className="text-center text-sm py-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          No entries yet. Start the timer!
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onMouseEnter={() => setHoveredId(entry.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* Left: description + task + time range */}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {entry.description ?? (
                    <span style={{ color: 'var(--color-text-muted)' }} className="italic">No description</span>
                  )}
                </p>
                {entry.taskId && taskMap.get(entry.taskId) && (
                  <p
                    className="text-xs mt-0.5 flex items-center gap-1 truncate"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    <ListTodo size={11} className="shrink-0" />
                    {taskMap.get(entry.taskId)!.title}
                  </p>
                )}
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {formatTimeRange(entry.startTime, entry.endTime)}
                </p>
              </div>

              {/* Pomodoro badge */}
              {entry.isPomodoro && (
                <span className="text-base shrink-0" title="Pomodoro session">
                  🍅
                </span>
              )}

              {/* Duration */}
              <span
                className="text-sm font-medium shrink-0 tabular-nums"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {entry.isRunning ? '●' : formatDuration(entry.durationSec ?? 0)}
              </span>

              {/* Delete button — visible on hover */}
              <button
                onClick={() => onDelete(entry.id)}
                className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all"
                style={{
                  color: 'var(--color-text-muted)',
                  opacity: hoveredId === entry.id ? 1 : 0,
                }}
                title="Delete entry"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-danger)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
