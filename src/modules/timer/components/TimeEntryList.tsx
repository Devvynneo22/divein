import { useState } from 'react';
import { Trash2, ListTodo } from 'lucide-react';
import { format, getHours } from 'date-fns';
import type { TimeEntry } from '@/shared/types/timer';
import { useTasks } from '../hooks/useTimer';
import { EmptyState } from '@/shared/components/EmptyState';

interface TimeEntryListProps {
  entries: TimeEntry[];
  todayTotalSec: number;
  onDelete: (id: string) => void;
  onStartTimer?: () => void;
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTotalTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function formatTimeRange(start: string, end: string | null | undefined): string {
  const startFmt = format(new Date(start), 'HH:mm');
  if (!end) return startFmt;
  const endFmt = format(new Date(end), 'HH:mm');
  return `${startFmt}–${endFmt}`;
}

function getHourLabel(isoString: string): string {
  const h = getHours(new Date(isoString));
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

// Group entries by hour
function groupByHour(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const map = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const label = getHourLabel(entry.startTime);
    const group = map.get(label) ?? [];
    group.push(entry);
    map.set(label, group);
  }
  return map;
}

interface EntryRowProps {
  entry: TimeEntry;
  taskName: string | undefined;
  onDelete: (id: string) => void;
}

function EntryRow({ entry, taskName, onDelete }: EntryRowProps) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);

  const timeRange = formatTimeRange(entry.startTime, entry.endTime);
  const duration = entry.isRunning
    ? null
    : formatDuration(entry.durationSec ?? 0);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setDeleteHovered(false); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Running indicator dot */}
      {entry.isRunning ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
            flexShrink: 0,
            boxShadow: '0 0 6px var(--color-success)',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
          title="Currently running"
        />
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: entry.isPomodoro
              ? 'var(--color-accent)'
              : 'var(--color-bg-tertiary)',
            border: '1.5px solid var(--color-border)',
            flexShrink: 0,
          }}
          title={entry.isPomodoro ? 'Pomodoro session' : undefined}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.85rem',
            color: entry.description ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            fontStyle: entry.description ? 'normal' : 'italic',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.description ?? 'No task'}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {timeRange}
          </span>
          {taskName && (
            <>
              <span style={{ color: 'var(--color-border)', fontSize: '0.6rem' }}>•</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.72rem',
                  color: 'var(--color-accent)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 120,
                }}
              >
                <ListTodo size={10} style={{ flexShrink: 0 }} />
                {taskName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Duration badge */}
      <span
        style={{
          flexShrink: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
          padding: '2px 8px',
          borderRadius: 6,
          backgroundColor: entry.isRunning
            ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
            : 'var(--color-bg-elevated)',
          color: entry.isRunning ? 'var(--color-success)' : 'var(--color-text-secondary)',
          border: `1px solid ${entry.isRunning ? 'color-mix(in srgb, var(--color-success) 30%, transparent)' : 'var(--color-border)'}`,
        }}
      >
        {entry.isRunning ? '● live' : duration}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(entry.id)}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        title="Delete entry"
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          backgroundColor: deleteHovered
            ? 'color-mix(in srgb, var(--color-danger) 12%, transparent)'
            : 'transparent',
          color: deleteHovered ? 'var(--color-danger)' : 'var(--color-text-muted)',
          transition: 'all 0.15s ease',
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function TimeEntryList({ entries, todayTotalSec, onDelete, onStartTimer }: TimeEntryListProps) {
  const { data: tasks = [] } = useTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const grouped = groupByHour(entries);
  const hourKeys = Array.from(grouped.keys());
  // Show hour groups only if there are enough entries to warrant it
  const useGroups = entries.length >= 4;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* ── Today total header ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 10,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-muted)',
          }}
        >
          Today
        </span>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
            padding: '3px 10px',
            borderRadius: 20,
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)',
          }}
        >
          {formatTotalTime(todayTotalSec)}
        </span>
      </div>

      {/* ── Entry list ─────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <EmptyState
          icon="⏱️"
          title="No time logged yet"
          description="Start a timer or pomodoro session to track your focus time"
          actionLabel={onStartTimer ? "Start Timer" : undefined}
          onAction={onStartTimer}
        />
      ) : useGroups ? (
        // Grouped by hour
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {hourKeys.map((hourLabel) => {
            const group = grouped.get(hourLabel) ?? [];
            return (
              <div key={hourLabel} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: 'var(--color-text-muted)',
                    paddingLeft: 4,
                    marginBottom: 2,
                  }}
                >
                  {hourLabel}
                </span>
                {group.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    taskName={entry.taskId ? taskMap.get(entry.taskId)?.title : undefined}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        // Flat list
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              taskName={entry.taskId ? taskMap.get(entry.taskId)?.title : undefined}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
