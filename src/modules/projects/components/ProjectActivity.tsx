import { Clock, Timer, CalendarDays } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
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

// Group entries by date string YYYY-MM-DD
function groupByDate(entries: TimeEntry[]): Array<{ date: string; entries: TimeEntry[] }> {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = entry.startTime.slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({ date, entries }));
}

export function ProjectActivity({ timeEntries, accentColor }: ProjectActivityProps) {
  const completed = timeEntries.filter((e) => !e.isRunning);
  const totalSeconds = completed.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
  const sorted = [...completed].sort((a, b) => b.startTime.localeCompare(a.startTime));
  const grouped = groupByDate(sorted);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
          <Timer size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            No activity yet
          </p>
          <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            Start a timer and assign it to this project to track your time here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary card */}
      <div
        className="flex items-center justify-between px-5 py-4 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
          border: `1px solid ${accentColor}30`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: accentColor + '20' }}
          >
            <Clock size={18} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor, opacity: 0.8 }}>
              Total Time Logged
            </p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
              {formatDuration(totalSeconds)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {completed.length} session{completed.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Timeline groups */}
      <div className="flex flex-col gap-5">
        {grouped.map(({ date, entries }) => {
          const dayTotal = entries.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
          const dateObj = parseISO(date);

          return (
            <div key={date}>
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                    {format(dateObj, 'EEEE, MMMM d')}
                  </span>
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                  {formatDuration(dayTotal)}
                </span>
              </div>

              {/* Entries */}
              <div className="flex flex-col gap-1.5 pl-4 border-l-2" style={{ borderColor: accentColor + '30' }}>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative flex items-center justify-between gap-3 px-3 py-3 rounded-xl"
                    style={{
                      backgroundColor: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        backgroundColor: 'var(--color-bg-primary)',
                        borderColor: accentColor,
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {entry.description ?? 'No description'}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {format(parseISO(entry.startTime), 'h:mm a')}
                        {entry.endTime && (
                          <> — {format(parseISO(entry.endTime), 'h:mm a')}</>
                        )}
                        {' · '}
                        {formatDistanceToNow(parseISO(entry.startTime), { addSuffix: true })}
                      </p>
                    </div>

                    <span
                      className="text-sm font-bold flex-shrink-0 tabular-nums"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {formatDuration(entry.durationSec ?? 0)}
                    </span>

                    {entry.isPomodoro && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(239,68,68,0.12)',
                          color: '#ef4444',
                        }}
                      >
                        🍅
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
