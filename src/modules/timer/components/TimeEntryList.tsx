import { useState } from 'react';
import { Trash2, ListTodo, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { TimeEntry } from '@/shared/types/timer';
import { useTasks } from '../hooks/useTimer';

interface TimeEntryListProps {
  entries: TimeEntry[];
  todayTotalSec: number;
  onDelete: (id: string) => void;
}

function formatDurationHMS(sec: number): string {
  if (sec <= 0) return '0:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `0:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatTimeLabel(start: string): string {
  return format(new Date(start), 'HH:mm');
}

export function TimeEntryList({ entries, todayTotalSec, onDelete }: TimeEntryListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { data: tasks = [] } = useTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <div className="flex flex-col h-full">
      {/* ─── Total today header ───────────────────────────────────────── */}
      <div
        className="rounded-xl p-4 mb-4 flex items-center justify-between"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-accent-soft, color-mix(in srgb, var(--color-accent) 15%, transparent))' }}
          >
            <Clock size={15} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Today's total
            </p>
            <p
              className="text-lg font-bold leading-tight tabular-nums"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily:
                  '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
              }}
            >
              {formatTotalTime(todayTotalSec)}
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
          }}
        >
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* ─── Entries list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl"
            style={{
              border: '1.5px dashed var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <Clock size={28} style={{ opacity: 0.35 }} />
            <p className="text-sm font-medium">No time tracked yet today</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
              Start the timer to log your first entry
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {entries.map((entry) => {
              const isHovered = hoveredId === entry.id;
              const linkedTask = entry.taskId ? taskMap.get(entry.taskId) : undefined;
              const startLabel = formatTimeLabel(entry.startTime);
              const durationStr = entry.isRunning
                ? '●  live'
                : formatDurationHMS(entry.durationSec ?? 0);

              return (
                <div
                  key={entry.id}
                  onMouseEnter={() => setHoveredId(entry.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all"
                  style={{
                    backgroundColor: isHovered
                      ? 'var(--color-bg-tertiary)'
                      : 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    boxShadow: isHovered ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {/* Start time badge */}
                  <div
                    className="shrink-0 text-center"
                    style={{ minWidth: 36 }}
                  >
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {startLabel}
                    </span>
                  </div>

                  {/* Separator dot */}
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: entry.isPomodoro
                        ? 'var(--color-accent)'
                        : 'var(--color-bg-tertiary)',
                      border: '1.5px solid var(--color-border)',
                    }}
                    title={entry.isPomodoro ? 'Pomodoro session' : undefined}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate leading-snug"
                      style={{
                        color: entry.description
                          ? 'var(--color-text-primary)'
                          : 'var(--color-text-muted)',
                        fontStyle: entry.description ? 'normal' : 'italic',
                      }}
                    >
                      {entry.description ?? 'No description'}
                    </p>
                    {linkedTask && (
                      <p
                        className="text-xs flex items-center gap-1 mt-0.5 truncate"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        <ListTodo size={11} className="shrink-0" />
                        {linkedTask.title}
                      </p>
                    )}
                  </div>

                  {/* Duration */}
                  <span
                    className="shrink-0 text-xs font-semibold tabular-nums"
                    style={{
                      color: entry.isRunning
                        ? 'var(--color-success)'
                        : 'var(--color-text-secondary)',
                      fontFamily:
                        '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
                      minWidth: 54,
                      textAlign: 'right',
                    }}
                  >
                    {durationStr}
                  </span>

                  {/* Delete button — visible on hover */}
                  <button
                    onClick={() => onDelete(entry.id)}
                    title="Delete entry"
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      color: 'var(--color-text-muted)',
                      backgroundColor: 'transparent',
                      opacity: isHovered ? 1 : 0,
                      pointerEvents: isHovered ? 'auto' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--color-danger)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'var(--color-danger-soft, color-mix(in srgb, var(--color-danger) 12%, transparent))';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        'var(--color-text-muted)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'transparent';
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
