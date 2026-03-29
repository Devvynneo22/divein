import { useState } from 'react';
import {
  CheckSquare, FileText, Clock, BarChart3,
  Target, Plus, Trash2, Edit3, Check, X, Calendar,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import type { Task } from '@/shared/types/task';
import type { Note } from '@/shared/types/note';
import type { TimeEntry } from '@/shared/types/timer';
import type { ProjectStats, Milestone, MilestoneStatus } from '@/shared/types/project';
import {
  useMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '../hooks/useProjects';

interface ProjectOverviewProps {
  projectId: string;
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

const STATUS_DOT_COLOR: Record<string, string> = {
  done: 'var(--color-success)',
  in_progress: 'var(--color-warning)',
};

export function ProjectOverview({
  projectId,
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
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Recent Tasks
        </h3>
        {recentTasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No tasks yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: STATUS_DOT_COLOR[task.status] ?? 'var(--color-text-muted)',
                  }}
                />
                <span
                  className="text-sm flex-1 min-w-0 truncate"
                  style={{
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    color: task.status === 'done' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  }}
                >
                  {task.title}
                </span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Notes */}
      <section>
        <h3
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Recent Notes
        </h3>
        {recentNotes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {note.title || 'Untitled'}
                  </span>
                  <span
                    className="text-xs flex-shrink-0"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {format(parseISO(note.updatedAt), 'MMM d')}
                  </span>
                </div>
                {note.contentText && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {note.contentText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Milestones */}
      <MilestonesSection projectId={projectId} tasks={tasks} accentColor={accentColor} />

      {/* Time Summary */}
      {recentEntries.length > 0 && (
        <section>
          <h3
            className="text-sm font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Recent Time Entries
          </h3>
          <div className="flex flex-col gap-2">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {entry.description ?? 'No description'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {format(parseISO(entry.startTime), 'MMM d, h:mm a')}
                  </p>
                </div>
                <span
                  className="text-sm font-medium flex-shrink-0"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
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
    <div
      className="px-4 py-3 rounded-xl"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <span
          className="text-xs uppercase tracking-wide font-medium"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Milestones Section ──────────────────────────────────────────────────────

interface MilestonesSectionProps {
  projectId: string;
  tasks: Task[];
  accentColor: string;
}

function MilestonesSection({ projectId, tasks, accentColor }: MilestonesSectionProps) {
  const { data: milestones = [] } = useMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');

  function resetForm() {
    setFormName('');
    setFormDescription('');
    setFormDueDate('');
    setShowForm(false);
    setEditingId(null);
  }

  function handleSave() {
    if (!formName.trim()) return;

    if (editingId) {
      updateMilestone.mutate({
        id: editingId,
        data: {
          name: formName.trim(),
          description: formDescription.trim() || null,
          dueDate: formDueDate || null,
        },
      });
    } else {
      createMilestone.mutate({
        projectId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        dueDate: formDueDate || undefined,
      });
    }
    resetForm();
  }

  function handleEdit(m: Milestone) {
    setEditingId(m.id);
    setFormName(m.name);
    setFormDescription(m.description ?? '');
    setFormDueDate(m.dueDate ? m.dueDate.split('T')[0] : '');
    setShowForm(true);
  }

  function handleToggleStatus(m: Milestone) {
    const newStatus: MilestoneStatus = m.status === 'open' ? 'completed' : 'open';
    updateMilestone.mutate({ id: m.id, data: { status: newStatus } });
  }

  function getDaysUntil(dueDate: string): string {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Target size={14} />
          Milestones
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--color-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div
          className="mb-3 p-3 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Milestone name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-1.5 mb-2 rounded-md text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="w-full px-3 py-1.5 mb-2 rounded-md text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <div className="flex gap-1 ml-auto">
              <button
                onClick={handleSave}
                className="p-1.5 rounded-md transition-colors"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
              >
                <Check size={14} />
              </button>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {milestones.length === 0 && !showForm ? (
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No milestones yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((milestone) => {
            const linkedTasks = tasks.filter((t) => t.milestoneId === milestone.id);
            const completedCount = linkedTasks.filter((t) => t.status === 'done').length;
            const totalCount = linkedTasks.length;
            const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isOverdue = milestone.dueDate && isPast(parseISO(milestone.dueDate)) && milestone.status === 'open';

            return (
              <div
                key={milestone.id}
                className="group px-3 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  opacity: milestone.status === 'completed' ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  {/* Toggle status */}
                  <button
                    onClick={() => handleToggleStatus(milestone)}
                    className="mt-0.5 flex-shrink-0 transition-colors"
                    style={{
                      color: milestone.status === 'completed'
                        ? 'var(--color-success)'
                        : 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      if (milestone.status !== 'completed') {
                        e.currentTarget.style.color = 'var(--color-success)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (milestone.status !== 'completed') {
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }
                    }}
                  >
                    <Target size={16} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-medium"
                        style={{
                          textDecoration: milestone.status === 'completed' ? 'line-through' : 'none',
                          color: milestone.status === 'completed'
                            ? 'var(--color-text-muted)'
                            : 'var(--color-text-primary)',
                        }}
                      >
                        {milestone.name}
                      </span>
                      {milestone.status === 'completed' && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--color-success-soft)',
                            color: 'var(--color-success)',
                          }}
                        >
                          Done
                        </span>
                      )}
                    </div>
                    {milestone.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {milestone.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleEdit(milestone)}
                      className="transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => deleteMilestone.mutate(milestone.id)}
                      className="transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: milestone.status === 'completed' ? 'var(--color-success)' : accentColor,
                      }}
                    />
                  </div>
                  <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {completedCount}/{totalCount}
                  </span>
                </div>

                {/* Due date */}
                {milestone.dueDate && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Calendar
                      size={11}
                      style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                    />
                    <span
                      className="text-[11px]"
                      style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                    >
                      {format(parseISO(milestone.dueDate), 'MMM d, yyyy')} · {getDaysUntil(milestone.dueDate)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
