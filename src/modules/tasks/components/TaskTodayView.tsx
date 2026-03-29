import React from 'react';
import { isToday, isPast, format, parseISO } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskListRow } from './TaskListRow';

interface TaskTodayViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface Section {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  tasks: Task[];
}

function buildSections(tasks: Task[]): { sections: Section[]; overdueCount: number } {
  const now = new Date();

  const overdue: Task[] = [];
  const urgent: Task[] = [];
  const high: Task[] = [];
  const medium: Task[] = [];
  const low: Task[] = [];
  const noPriority: Task[] = [];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const due = parseISO(task.dueDate);
    const isOverdue = !isToday(due) && isPast(due);
    const isDueToday = isToday(due);

    if (!isOverdue && !isDueToday) continue;
    if (task.status === 'done' || task.status === 'cancelled') continue;

    if (isOverdue) {
      overdue.push(task);
      continue;
    }

    switch (task.priority as TaskPriority) {
      case 4:
        urgent.push(task);
        break;
      case 3:
        high.push(task);
        break;
      case 2:
        medium.push(task);
        break;
      case 1:
        low.push(task);
        break;
      default:
        noPriority.push(task);
    }
  }

  const sections: Section[] = [
    {
      key: 'overdue',
      label: 'Overdue',
      color: 'var(--color-danger, #ef4444)',
      bgColor: 'var(--color-danger-soft, rgba(239,68,68,0.08))',
      tasks: overdue,
    },
    {
      key: 'urgent',
      label: 'Urgent',
      color: 'var(--color-priority-urgent, #ef4444)',
      bgColor: 'rgba(239,68,68,0.06)',
      tasks: urgent,
    },
    {
      key: 'high',
      label: 'High',
      color: 'var(--color-priority-high, #f97316)',
      bgColor: 'rgba(249,115,22,0.06)',
      tasks: high,
    },
    {
      key: 'medium',
      label: 'Medium',
      color: 'var(--color-priority-medium, #eab308)',
      bgColor: 'rgba(234,179,8,0.06)',
      tasks: medium,
    },
    {
      key: 'low',
      label: 'Low',
      color: 'var(--color-priority-low, #3b82f6)',
      bgColor: 'rgba(59,130,246,0.06)',
      tasks: low,
    },
    {
      key: 'none',
      label: 'No Priority',
      color: 'var(--color-text-muted)',
      bgColor: 'var(--color-bg-wash)',
      tasks: noPriority,
    },
  ].filter((s) => s.tasks.length > 0);

  return { sections, overdueCount: overdue.length };
}

export function TaskTodayView({ tasks, onSelectTask, onStatusChange }: TaskTodayViewProps) {
  const today = new Date();
  const greeting = getGreeting();
  const dateLabel = format(today, 'EEEE, MMMM d');

  const { sections } = buildSections(tasks);
  const totalCount = sections.reduce((acc, s) => acc + s.tasks.length, 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 24px',
        gap: 0,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          {greeting} 👋
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 2 }}>
          {dateLabel}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {totalCount === 0
            ? 'Nothing due today'
            : `${totalCount} task${totalCount !== 1 ? 's' : ''} due today`}
        </div>
      </div>

      {/* Zero state */}
      {totalCount === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 48 }}>🎉</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            You're all caught up for today!
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            No tasks due today. Enjoy the free time!
          </div>
        </div>
      )}

      {/* Priority sections */}
      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: 24 }}>
          {/* Section header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              backgroundColor: section.bgColor,
              borderLeft: `3px solid ${section.color}`,
              borderRadius: '0 4px 4px 0',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: section.color,
              }}
            >
              {section.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: section.color,
                opacity: 0.7,
              }}
            >
              ({section.tasks.length})
            </span>
          </div>

          {/* Tasks */}
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {section.tasks.map((task) => (
              <TaskListRow
                key={task.id}
                task={task}
                isSelected={false}
                onSelect={() => onSelectTask(task.id)}
                onStatusChange={(status) => onStatusChange(task.id, status)}
                onDelete={() => {}}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
