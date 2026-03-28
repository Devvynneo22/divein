import { CheckSquare, FileText, Clock, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Task } from '@/shared/types/task';
import type { Note } from '@/shared/types/note';
import type { TimeEntry } from '@/shared/types/timer';
import type { ProjectStats } from '@/shared/types/project';

interface ProjectOverviewProps {
  stats: ProjectStats;
  tasks: Task[];
  notes: Note[];
  timeEntries: TimeEntry[];
  accentColor: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '0m';
}

const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export function ProjectOverview({
  stats,
  tasks,
  notes,
  timeEntries,
  accentColor,
}: ProjectOverviewProps) {
  const completionPct =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  // Recent tasks: last 5 by updatedAt
  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  // Recent notes: last 3
  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  // Recent time entries: last 5
  const recentEntries = [...timeEntries]
    .filter((e) => !e.isRunning)
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckSquare size={16} />}
          label="Total Tasks"
          value={String(stats.totalTasks)}
          accent={accentColor}
        />
        <StatCard
          icon={<BarChart3 size={16} />}
          label="Completed"
          value={`${completionPct}%`}
          sub={`${stats.completedTasks} / ${stats.totalTasks}`}
          accent={accentColor}
        />
        <StatCard
          icon={<FileText size={16} />}
          label="Notes"
          value={String(stats.totalNotes)}
          accent={accentColor}
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Time Logged"
          value={formatDuration(stats.totalTimeSeconds)}
          accent={accentColor}
        />
      </div>

      {/* Recent Tasks */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Recent Tasks
        </h3>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No tasks yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === 'done'
                      ? 'bg-[var(--color-success)]'
                      : task.status === 'in_progress'
                      ? 'bg-[var(--color-warning)]'
                      : 'bg-[var(--color-text-muted)]'
                  }`}
                />
                <span
                  className={`text-sm flex-1 min-w-0 truncate ${
                    task.status === 'done'
                      ? 'line-through text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Notes */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Recent Notes
        </h3>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {note.title || 'Untitled'}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">
                    {format(parseISO(note.updatedAt), 'MMM d')}
                  </span>
                </div>
                {note.contentText && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                    {note.contentText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Time Summary */}
      {recentEntries.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
            Recent Time Entries
          </h3>
          <div className="flex flex-col gap-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)]"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] truncate">
                    {entry.description ?? 'No description'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(parseISO(entry.startTime), 'MMM d, h:mm a')}
                  </p>
                </div>
                <span className="text-sm font-medium text-[var(--color-text-secondary)] flex-shrink-0">
                  {formatDuration(entry.durationSec ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="px-4 py-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}
