import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import { Plus, Inbox, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useReorderTask } from './hooks/useTasks';
import { TaskItem } from './components/TaskItem';
import { TaskDetail } from './components/TaskDetail';
import { taskService } from '@/shared/lib/taskService';
import type { Task, TaskStatus, TaskPriority } from '@/shared/types/task';

// ─── Toast ──────────────────────────────────────────────────────────────────

interface ToastData {
  message: string;
  task: Task;
  subtasks: Task[];
}

function Toast({ data, onUndo, onDismiss }: { data: ToastData; onUndo: () => void; onDismiss: () => void }) {
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
      }}
    >
      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
        {data.message}
      </span>
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
    </div>
  );
}

// ─── Status tabs ────────────────────────────────────────────────────────────

const STATUS_TABS: { key: TaskStatus | 'all'; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'all', label: 'All', icon: Circle },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'todo', label: 'Todo', icon: Circle },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

// ─── TasksPage ──────────────────────────────────────────────────────────────

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const filter = activeTab === 'all' ? undefined : { status: activeTab as TaskStatus };
  const { data: allTasks = [], isLoading } = useTasks(filter);
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTask = useReorderTask();

  // Filter to root tasks only (no parentId)
  const tasks = useMemo(() => allTasks.filter((t) => t.parentId === null), [allTasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // ─── Quick add ──────────────────────────────────────────────────────────

  function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      createTask.mutate({ title: newTaskTitle.trim() });
      setNewTaskTitle('');
    }
  }

  // ─── Task actions ───────────────────────────────────────────────────────

  const handleStatusChange = useCallback(
    (id: string, status: TaskStatus) => {
      updateTask.mutate({ id, data: { status } });
    },
    [updateTask],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const taskToDelete = tasks.find((t) => t.id === id);
      if (!taskToDelete) return;

      // Capture subtasks before deletion so undo can restore them
      const subtasks = await taskService.getSubtasks(id);

      if (selectedTaskId === id) setSelectedTaskId(null);
      deleteTask.mutate(id);

      setToast({ message: 'Task deleted', task: taskToDelete, subtasks });
    },
    [tasks, selectedTaskId, deleteTask],
  );

  const handleUndo = useCallback(async () => {
    if (!toast) return;
    const { task, subtasks } = toast;
    // Recreate the parent task
    const restored = await taskService.create({
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId ?? undefined,
      dueDate: task.dueDate ?? undefined,
      startDate: task.startDate ?? undefined,
      tags: task.tags,
      estimatedMin: task.estimatedMin ?? undefined,
    });
    // Recreate subtasks under the new parent
    for (const sub of subtasks) {
      await taskService.create({
        title: sub.title,
        description: sub.description ?? undefined,
        status: sub.status,
        priority: sub.priority,
        projectId: sub.projectId ?? undefined,
        parentId: restored.id,
        dueDate: sub.dueDate ?? undefined,
        startDate: sub.startDate ?? undefined,
        tags: sub.tags,
        estimatedMin: sub.estimatedMin ?? undefined,
      });
    }
    // Invalidate queries to refresh the task list
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setToast(null);
  }, [toast, queryClient]);

  const handleDismissToast = useCallback(() => setToast(null), []);

  // ─── Drag & Drop ───────────────────────────────────────────────────────

  function handleDragStart(taskId: string) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      draggedIdRef.current = taskId;
      e.dataTransfer.effectAllowed = 'move';
    };
  }

  function handleDragOver(taskId: string) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIdRef.current && draggedIdRef.current !== taskId) {
        setDragOverId(taskId);
      }
    };
  }

  function handleDragLeave() {
    return () => setDragOverId(null);
  }

  function handleDrop(targetTaskId: string) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverId(null);
      const draggedId = draggedIdRef.current;
      if (!draggedId || draggedId === targetTaskId) return;

      const draggedIdx = tasks.findIndex((t) => t.id === draggedId);
      const targetIdx = tasks.findIndex((t) => t.id === targetTaskId);
      if (draggedIdx === -1 || targetIdx === -1) return;

      // Compute new sort orders: place dragged before target
      const targetOrder = tasks[targetIdx].sortOrder;
      const prevOrder = targetIdx > 0 ? tasks[targetIdx - 1].sortOrder : targetOrder - 1;
      const newOrder = (prevOrder + targetOrder) / 2;

      reorderTask.mutate({ id: draggedId, newOrder });
      draggedIdRef.current = null;
    };
  }

  function handleDragEnd() {
    return () => {
      draggedIdRef.current = null;
      setDragOverId(null);
    };
  }

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      switch (e.key) {
        case 'n': {
          e.preventDefault();
          quickAddRef.current?.focus();
          break;
        }
        case 'Enter': {
          if (selectedTaskId && !selectedTask) break;
          if (selectedTaskId) {
            // Already open - do nothing extra
          } else if (tasks.length > 0) {
            setSelectedTaskId(tasks[0].id);
          }
          break;
        }
        case 'Escape': {
          if (selectedTaskId) {
            setSelectedTaskId(null);
          }
          break;
        }
        case 'd': {
          e.preventDefault();
          if (selectedTaskId) {
            const task = tasks.find((t) => t.id === selectedTaskId);
            if (task) {
              const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
              updateTask.mutate({ id: selectedTaskId, data: { status: newStatus } });
            }
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (selectedTaskId) {
            e.preventDefault();
            handleDelete(selectedTaskId);
          }
          break;
        }
        case '1':
        case '2':
        case '3':
        case '4': {
          if (selectedTaskId) {
            e.preventDefault();
            const priority = parseInt(e.key, 10) as TaskPriority;
            updateTask.mutate({ id: selectedTaskId, data: { priority } });
          }
          break;
        }
        case 'j':
        case 'ArrowDown': {
          e.preventDefault();
          if (tasks.length === 0) break;
          if (!selectedTaskId) {
            setSelectedTaskId(tasks[0].id);
          } else {
            const idx = tasks.findIndex((t) => t.id === selectedTaskId);
            if (idx < tasks.length - 1) {
              setSelectedTaskId(tasks[idx + 1].id);
            }
          }
          break;
        }
        case 'k':
        case 'ArrowUp': {
          e.preventDefault();
          if (tasks.length === 0) break;
          if (!selectedTaskId) {
            setSelectedTaskId(tasks[tasks.length - 1].id);
          } else {
            const idx = tasks.findIndex((t) => t.id === selectedTaskId);
            if (idx > 0) {
              setSelectedTaskId(tasks[idx - 1].id);
            }
          }
          break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, selectedTask, tasks, updateTask, handleDelete]);

  return (
    <div className="flex h-full">
      {/* Task list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <h1
            className="text-3xl font-bold mb-6"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Tasks
          </h1>

          {/* Quick add */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 relative">
              <Plus
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                ref={quickAddRef}
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Add a task… (press Enter)"
                className="input-base w-full pl-9 pr-4"
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1.5 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isHovered = hoveredTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  onMouseEnter={() => setHoveredTab(tab.key)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className="flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  style={
                    isActive
                      ? { backgroundColor: 'var(--color-accent)', color: 'white' }
                      : isHovered
                      ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }
                      : { backgroundColor: 'transparent', color: 'var(--color-text-secondary)' }
                  }
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {isLoading ? (
            <LoadingSpinner text="Loading tasks…" />
          ) : tasks.length === 0 ? (
            <div
              className="text-center py-16 text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {activeTab === 'all' ? 'No tasks yet. Add one above!' : `No ${activeTab.replace('_', ' ')} tasks.`}
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={
                    dragOverId === task.id
                      ? { borderTop: '2px solid var(--color-accent)' }
                      : undefined
                  }
                >
                  <TaskItem
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onSelect={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                    onStatusChange={(status) => handleStatusChange(task.id, status)}
                    onDelete={() => handleDelete(task.id)}
                    draggable
                    onDragStart={handleDragStart(task.id)}
                    onDragOver={handleDragOver(task.id)}
                    onDragLeave={handleDragLeave()}
                    onDrop={handleDrop(task.id)}
                    onDragEnd={handleDragEnd()}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onUpdate={(data) => updateTask.mutate({ id: selectedTask.id, data })}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          data={toast}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
}
