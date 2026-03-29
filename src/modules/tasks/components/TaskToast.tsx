import { useEffect } from 'react';
import type { Task } from '@/shared/types/task';

interface TaskToastData {
  message: string;
  task: Task;
  subtasks: Task[];
}

interface TaskToastProps {
  data: TaskToastData;
  onUndo: () => void;
  onDismiss: () => void;
}

export function TaskToast({ data, onUndo, onDismiss }: TaskToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <span
        className="text-sm"
        style={{ color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}
      >
        {data.message}
      </span>

      {data.subtasks.length > 0 && (
        <span
          className="text-sm"
          style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
        >
          (+{data.subtasks.length} subtask{data.subtasks.length !== 1 ? 's' : ''})
        </span>
      )}

      <button
        onClick={onUndo}
        className="px-3 py-1 rounded text-xs font-medium transition-colors"
        style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent)';
        }}
      >
        Undo
      </button>

      <button
        onClick={onDismiss}
        className="flex items-center justify-center rounded"
        style={{
          width: 20,
          height: 20,
          color: 'var(--color-text-muted)',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Dismiss"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
