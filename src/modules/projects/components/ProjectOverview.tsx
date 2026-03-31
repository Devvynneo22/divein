import { useState, useRef } from 'react';
import {
  FileText, Clock, Target, Plus, Trash2, Edit3, Check, X, Calendar,
  AlertTriangle, Activity, CheckSquare, TrendingUp,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/shared/lib/taskService';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return '0m';
}

const PRIORITY_LABEL: Record<number, string> = {
  0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Urgent',
};
const PRIORITY_COLOR: Record<number, string> = {
  0: 'var(--color-text-muted)',
  1: 'var(--color-p4, #60a5fa)',
  2: 'var(--color-p3, #facc15)',
  3: 'var(--color-p2, #fb923c)',
  4: 'var(--color-p1, #f87171)',
};

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  inbox:       { bg: 'var(--color-bg-tertiary)',  text: 'var(--color-text-muted)',  label: 'Inbox' },
  backlog:     { bg: 'var(--color-bg-tertiary)',  text: 'var(--color-text-muted)',  label: 'Backlog' },
  todo:        { bg: 'rgba(100,116,139,0.15)',    text: '#94a3b8',                  label: 'To Do' },
  in_progress: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)',    label: 'In Progress' },
  in_review:   { bg: 'rgba(168,85,247,0.12)',     text: '#a855f7',                 label: 'In Review' },
  done:        { bg: 'var(--color-success-soft)', text: 'var(--color-success)',    label: 'Done' },
  cancelled:   { bg: 'var(--color-danger-soft)',  text: 'var(--color-danger)',     label: 'Cancelled' },
};

// ─── Animated SVG progress ring ───────────────────────────────────────────────

function ProgressRing({
  pct,
  accent,
}: {
  pct: number;
  accent: string;
}) {
  const r = 32;
  const circumference = 2 * Math.PI * r; // ≈201
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  // Derive a display color: use accent unless it's a gradient
  const strokeColor = accent.includes('gradient') ? 'var(--color-accent)' : accent;

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        strokeWidth="8"
        stroke="var(--color-bg-tertiary)"
      />
      {/* Fill arc */}
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        strokeWidth="8"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectOverview({
  projectId,
  stats,
  tasks,
  notes,
  timeEntries,
  accentColor,
}: ProjectOverviewProps) {
  const qc = useQueryClient();
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  const createTask = useMutation({
    mutationFn: () =>
      taskService.create({ title: quickTitle.trim(), projectId, status: 'todo' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setQuickTitle('');
      quickRef.current?.focus();
    },
  });

  const completionPct =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(
    (t) =>
      t.dueDate &&
      isPast(parseISO(t.dueDate)) &&
      t.status !== 'done' &&
      t.status !== 'cancelled',
  ).length;

  const recentTasks = [...tasks]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    createTask.mutate();
  }

  const accentDisplay = accentColor.includes('gradient')
    ? 'var(--color-accent)'
    : accentColor;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero stats dashboard ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Top: completion ring + big numbers */}
        <div className="flex items-center gap-6 p-5">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing pct={completionPct} accent={accentColor} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ transform: 'rotate(0deg)' }}
            >
              <span
                className="text-xl font-bold tabular-nums leading-none"
                style={{ color: accentDisplay }}
              >
                {completionPct}%
              </span>
              <span
                className="text-[10px] leading-tight mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                done
              </span>
            </div>
          </div>

          {/* Big stat callouts */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <BigStatCallout
              value={stats.totalTasks}
              label="Total Tasks"
              accent={accentDisplay}
            />
            <BigStatCallout
              value={stats.completedTasks}
              label="Completed"
              accent="var(--color-success)"
            />
            <BigStatCallout
              value={inProgressCount}
              label="In Progress"
              accent="var(--color-warning)"
            />
            <BigStatCallout
              value={stats.totalNotes}
              label="Notes"
              accent="#a855f7"
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />

        {/* Bottom: At-a-glance pills */}
        <div className="flex items-center gap-3 px-5 py-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            At a glance
          </span>
          <AtAGlancePill
            icon={<AlertTriangle size={11} />}
            label={`${overdueCount} overdue`}
            danger={overdueCount > 0}
          />
          <AtAGlancePill
            icon={<TrendingUp size={11} />}
            label={`${inProgressCount} in progress`}
          />
          {stats.totalTimeSeconds > 0 && (
            <AtAGlancePill
              icon={<Clock size={11} />}
              label={formatDuration(stats.totalTimeSeconds) + ' logged'}
              accent={accentDisplay}
            />
          )}
        </div>
      </div>

      {/* ── Quick-add task ── */}
      <section>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Quick Add Task
        </h3>
        <form onSubmit={handleQuickAdd} className="flex gap-2">
          <input
            ref={quickRef}
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a task to this project…"
            className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            onMouseEnter={(e) => {
              if (!(e.currentTarget as HTMLButtonElement).disabled)
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={15} />
            Add
          </button>
        </form>
      </section>

      {/* ── Recent Tasks ── */}
      <section>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Activity size={13} />
          Recent Tasks
        </h3>
        {recentTasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No tasks yet. Add one above!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTasks.map((task) => {
              const pill = STATUS_PILL[task.status] ?? STATUS_PILL.inbox;
              const isDone = task.status === 'done';
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {task.priority > 0 && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLOR[task.priority] }}
                      title={PRIORITY_LABEL[task.priority]}
                    />
                  )}
                  <CheckSquare
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: isDone ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                  />
                  <span
                    className="text-sm flex-1 min-w-0 truncate"
                    style={{
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ backgroundColor: pill.bg, color: pill.text }}
                  >
                    {pill.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Notes ── */}
      <section>
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <FileText size={13} />
          Recent Notes
        </h3>
        {recentNotes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No notes yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{note.icon ?? '📝'}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {note.title || 'Untitled'}
                  </p>
                  {note.contentText && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {note.contentText}
                    </p>
                  )}
                </div>
                <span
                  className="text-[11px] flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {format(parseISO(note.updatedAt), 'MMM d')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Milestones ── */}
      <MilestonesSection
        projectId={projectId}
        tasks={tasks}
        accentColor={accentColor}
      />

      {/* ── Time summary ── */}
      {stats.totalTimeSeconds > 0 && (
        <section>
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Clock size={13} />
            Time Logged
          </h3>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              backgroundColor: accentDisplay + '10',
              border: `1px solid ${accentDisplay}30`,
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Total across all entries
            </span>
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: accentDisplay }}
            >
              {formatDuration(stats.totalTimeSeconds)}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── BigStatCallout ───────────────────────────────────────────────────────────

function BigStatCallout({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="text-3xl font-bold tabular-nums leading-none"
        style={{ color: accent }}
      >
        {value}
      </span>
      <span
        className="text-[11px] font-medium leading-tight"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── AtAGlancePill ────────────────────────────────────────────────────────────

function AtAGlancePill({
  icon,
  label,
  danger = false,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  accent?: string;
}) {
  const color = danger
    ? 'var(--color-danger)'
    : accent ?? 'var(--color-text-muted)';
  const bg = danger ? 'var(--color-danger-soft)' : 'var(--color-bg-tertiary)';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {icon}
      {label}
    </span>
  );
}

// ─── MilestonesSection ────────────────────────────────────────────────────────

function MilestonesSection({
  projectId,
  tasks,
  accentColor,
}: {
  projectId: string;
  tasks: Task[];
  accentColor: string;
}) {
  const { data: milestones = [] } = useMilestones(projectId);
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName]   = useState('');
  const [formDesc, setFormDesc]   = useState('');
  const [formDue, setFormDue]     = useState('');

  const accentDisplay = accentColor.includes('gradient')
    ? 'var(--color-accent)'
    : accentColor;

  function resetForm() {
    setFormName(''); setFormDesc(''); setFormDue('');
    setShowForm(false); setEditingId(null);
  }

  function handleSave() {
    if (!formName.trim()) return;
    if (editingId) {
      updateMilestone.mutate({
        id: editingId,
        data: {
          name: formName.trim(),
          description: formDesc.trim() || null,
          dueDate: formDue || null,
        },
      });
    } else {
      createMilestone.mutate({
        projectId,
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        dueDate: formDue || undefined,
      });
    }
    resetForm();
  }

  function handleEdit(m: Milestone) {
    setEditingId(m.id);
    setFormName(m.name);
    setFormDesc(m.description ?? '');
    setFormDue(m.dueDate ? m.dueDate.split('T')[0] : '');
    setShowForm(true);
  }

  function handleToggle(m: Milestone) {
    const next: MilestoneStatus = m.status === 'open' ? 'completed' : 'open';
    updateMilestone.mutate({ id: m.id, data: { status: next } });
  }

  function daysUntilLabel(dueDate: string): string {
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
          className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Target size={13} />
          Milestones
        </h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--color-accent)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {showForm && (
        <div
          className="mb-3 p-3 rounded-xl flex flex-col gap-2"
          style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Milestone name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none"
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
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none"
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
              value={formDue}
              onChange={(e) => setFormDue(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
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
                className="p-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
              >
                <Check size={14} />
              </button>
              <button
                onClick={resetForm}
                className="p-1.5 rounded-lg transition-colors"
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
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No milestones yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((milestone) => {
            const linked = tasks.filter((t) => t.milestoneId === milestone.id);
            const done = linked.filter((t) => t.status === 'done').length;
            const total = linked.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isOverdue =
              milestone.dueDate &&
              isPast(parseISO(milestone.dueDate)) &&
              milestone.status === 'open';

            return (
              <div
                key={milestone.id}
                className="group px-3 py-3 rounded-xl transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  opacity: milestone.status === 'completed' ? 0.65 : 1,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <button
                    onClick={() => handleToggle(milestone)}
                    className="mt-0.5 flex-shrink-0 transition-colors"
                    style={{
                      color:
                        milestone.status === 'completed'
                          ? 'var(--color-success)'
                          : 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      if (milestone.status !== 'completed')
                        e.currentTarget.style.color = 'var(--color-success)';
                    }}
                    onMouseLeave={(e) => {
                      if (milestone.status !== 'completed')
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                    }}
                  >
                    <Target size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-medium"
                      style={{
                        textDecoration:
                          milestone.status === 'completed' ? 'line-through' : 'none',
                        color:
                          milestone.status === 'completed'
                            ? 'var(--color-text-muted)'
                            : 'var(--color-text-primary)',
                      }}
                    >
                      {milestone.name}
                    </span>
                    {milestone.description && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {milestone.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleEdit(milestone)}
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => deleteMilestone.mutate(milestone.id)}
                      style={{ color: 'var(--color-text-muted)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {total > 0 && (
                  <div className="flex items-center gap-2">
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor:
                            milestone.status === 'completed'
                              ? 'var(--color-success)'
                              : accentDisplay,
                        }}
                      />
                    </div>
                    <span
                      className="text-[11px] flex-shrink-0"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {done}/{total}
                    </span>
                  </div>
                )}

                {milestone.dueDate && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Calendar
                      size={11}
                      style={{
                        color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
                      }}
                    />
                    <span
                      className="text-[11px]"
                      style={{
                        color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-muted)',
                      }}
                    >
                      {format(parseISO(milestone.dueDate), 'MMM d, yyyy')} ·{' '}
                      {daysUntilLabel(milestone.dueDate)}
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
