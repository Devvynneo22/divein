import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';
import { useZenModeStore } from '@/shared/stores/zenModeStore';

// ─── Priority dot ────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<number, string> = {
  4: 'var(--color-p1, #ef4444)',
  3: 'var(--color-p2, #f97316)',
  2: 'var(--color-p3, #eab308)',
  1: 'var(--color-p4, #3b82f6)',
};

function PriorityDot({ priority }: { priority: TaskPriority }) {
  if (!priority) return null;
  return (
    <span
      title={`P${5 - priority}`}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: PRIORITY_COLORS[priority] ?? 'var(--color-text-muted)',
        flexShrink: 0,
      }}
    />
  );
}

// ─── ZenTaskRow ──────────────────────────────────────────────────────────────

interface ZenTaskRowProps {
  task: Task;
  onToggleDone: (id: string) => void;
}

function ZenTaskRow({ task, onToggleDone }: ZenTaskRowProps) {
  const isDone = task.status === 'done';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 8,
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.15s ease',
        cursor: 'pointer',
      }}
      onClick={() => onToggleDone(task.id)}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: isDone
            ? '2px solid var(--color-accent)'
            : '2px solid var(--color-border-strong, var(--color-border))',
          backgroundColor: isDone ? 'var(--color-accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
      >
        {isDone && (
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 15,
          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          transition: 'color 0.2s ease, text-decoration 0.2s ease',
          lineHeight: 1.4,
        }}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      <PriorityDot priority={task.priority as TaskPriority} />
    </div>
  );
}

// ─── ZenTaskView ─────────────────────────────────────────────────────────────

interface ZenTaskViewProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatus) => void;
}

export function ZenTaskView({ tasks, onStatusChange }: ZenTaskViewProps) {
  const setZen = useZenModeStore((s) => s.setZen);

  // Filter to today's tasks (due today or overdue, not cancelled)
  const todayTasks = tasks.filter((t) => {
    if (t.status === 'cancelled') return false;
    return true; // parent component already filters to today's tasks
  });

  const totalCount = todayTasks.length;
  const doneCount = todayTasks.filter((t) => t.status === 'done').length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const [exitHovered, setExitHovered] = useState(false);

  // Escape key exits zen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setZen]);

  const handleToggleDone = (id: string) => {
    const task = todayTasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    onStatusChange(id, newStatus);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--color-bg-primary)',
        overflowY: 'auto',
        padding: '60px 24px 80px',
        position: 'relative',
      }}
    >
      {/* Exit Focus button — top right */}
      <button
        onClick={() => setZen(false)}
        onMouseEnter={() => setExitHovered(true)}
        onMouseLeave={() => setExitHovered(false)}
        title="Exit Focus Mode (Esc)"
        style={{
          position: 'fixed',
          top: 20,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 999,
          border: '1px solid var(--color-border)',
          backgroundColor: exitHovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-primary)',
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          zIndex: 100,
          opacity: 0.7,
        }}
      >
        <X size={12} />
        Exit Focus
      </button>

      {/* Content container */}
      <div
        style={{
          width: '100%',
          maxWidth: 600,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: 8,
              lineHeight: 1.2,
            }}
          >
            Focus Mode
          </h1>

          <div
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              marginBottom: 16,
            }}
          >
            {totalCount === 0
              ? 'No tasks today'
              : `${doneCount} of ${totalCount} task${totalCount !== 1 ? 's' : ''} completed`}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div
              style={{
                height: 6,
                borderRadius: 999,
                backgroundColor: 'var(--color-bg-tertiary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  borderRadius: 999,
                  backgroundColor: allDone ? 'var(--color-success, #22c55e)' : 'var(--color-accent)',
                  transition: 'width 0.4s ease, background-color 0.4s ease',
                }}
              />
            </div>
          )}
        </div>

        {/* All done celebration */}
        {allDone ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 24px',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 56 }}>🎉</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
              }}
            >
              All done!
            </div>
            <div
              style={{
                fontSize: 15,
                color: 'var(--color-text-secondary)',
              }}
            >
              You've completed {totalCount} task{totalCount !== 1 ? 's' : ''} today
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 24px',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48 }}>✨</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Nothing due today
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
              Enjoy the free time!
            </div>
          </div>
        ) : (
          /* Task list */
          <div
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              backgroundColor: 'var(--color-bg-elevated)',
              overflow: 'hidden',
            }}
          >
            {todayTasks.map((task, idx) => (
              <div
                key={task.id}
                style={{
                  borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <ZenTaskRow task={task} onToggleDone={handleToggleDone} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
