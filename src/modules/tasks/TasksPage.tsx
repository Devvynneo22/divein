import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Sun,
  Archive,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useReorderTask,
} from './hooks/useTasks';
import { taskService } from '@/shared/lib/taskService';
import type { Task, TaskStatus, TaskPriority, CreateTaskInput, UpdateTaskInput } from '@/shared/types/task';

// ─── Component imports ────────────────────────────────────────────────────────
import { TaskBoard } from './components/TaskBoard';
import { TaskList } from './components/TaskList';
import { TaskTodayView } from './components/TaskTodayView';
import { TaskDetail } from './components/TaskDetail';
import { TaskCreateModal } from './components/TaskCreateModal';
import { TaskToolbar } from './components/TaskToolbar';
import { TaskFilterChips } from './components/TaskFilterChips';
import { TaskToast } from './components/TaskToast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = 'board' | 'list' | 'today' | 'backlog';

/** Matches the TaskFilters shape used by TaskToolbar + TaskFilterChips */
interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueBefore?: string;
}

interface ToastData {
  message: string;
  task: Task;
  subtasks: Task[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultStatusForView(view: ActiveView): TaskStatus {
  switch (view) {
    case 'backlog':  return 'backlog';
    case 'today':    return 'todo';
    case 'board':    return 'inbox';
    case 'list':     return 'inbox';
  }
}

const VIEW_TABS: { key: ActiveView; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'board',   label: 'Board',   Icon: LayoutGrid },
  { key: 'list',    label: 'List',    Icon: List },
  { key: 'today',   label: 'Today',   Icon: Sun },
  { key: 'backlog', label: 'Backlog', Icon: Archive },
];

// ─── TasksPage ────────────────────────────────────────────────────────────────

export function TasksPage() {
  const [activeView, setActiveView] = useState<ActiveView>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<string>('status');
  const [sortBy, setSortBy] = useState<string>('manual');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const quickAddRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Build a useTasks filter from view + filter state
  const taskFilter = useMemo(() => {
    const f: Parameters<typeof useTasks>[0] = {};

    if (searchQuery) f.search = searchQuery;
    if (filters.tags && filters.tags.length > 0) f.tags = filters.tags;

    // Status: explicit filter takes priority, else view default
    if (filters.status && filters.status.length > 0) {
      f.status = filters.status;
    } else if (activeView === 'backlog') {
      f.status = 'backlog';
    } else if (activeView === 'today') {
      f.status = ['todo', 'in_progress', 'in_review'];
    }

    if (filters.dueBefore) f.dueBefore = filters.dueBefore;
    if (filters.priority && filters.priority.length > 0) f.priority = filters.priority;

    // Today view: also filter by due date up to today
    if (activeView === 'today' && !filters.dueBefore) {
      const today = new Date().toISOString().split('T')[0];
      f.dueBefore = today + 'T23:59:59';
    }

    return f;
  }, [filters, searchQuery, activeView]);

  const { data: allTasks = [], isLoading } = useTasks(taskFilter);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTask = useReorderTask();

  // Root tasks only
  const tasks = useMemo(() => allTasks.filter((t) => t.parentId === null), [allTasks]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    (input: CreateTaskInput) => {
      createTask.mutate(input);
    },
    [createTask],
  );

  const handleQuickAdd = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && quickAddTitle.trim()) {
        createTask.mutate({
          title: quickAddTitle.trim(),
          status: getDefaultStatusForView(activeView),
        });
        setQuickAddTitle('');
      }
    },
    [quickAddTitle, activeView, createTask],
  );

  const handleStatusChange = useCallback(
    (id: string, status: TaskStatus) => {
      updateTask.mutate({ id, data: { status } });
    },
    [updateTask],
  );

  const handlePriorityChange = useCallback(
    (id: string, priority: TaskPriority) => {
      updateTask.mutate({ id, data: { priority } });
    },
    [updateTask],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const taskToDelete = tasks.find((t) => t.id === id);
      if (!taskToDelete) return;
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
    for (const sub of subtasks) {
      await taskService.create({
        title: sub.title,
        description: sub.description ?? undefined,
        status: sub.status,
        priority: sub.priority,
        parentId: restored.id,
        dueDate: sub.dueDate ?? undefined,
        tags: sub.tags,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setToast(null);
  }, [toast, queryClient]);

  const handleCreateTaskForStatus = useCallback(
    (status: TaskStatus) => {
      setShowCreateModal(true);
      // The modal will pick up defaultStatus via the status passed in
      // We track the requested status in a ref so the modal can use it
    },
    [],
  );

  const hasActiveFilters = useMemo(
    () =>
      (filters.status && filters.status.length > 0) ||
      (filters.priority && filters.priority.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      !!filters.dueBefore ||
      !!searchQuery,
    [filters, searchQuery],
  );

  // ─── "Create for status" quick path ──────────────────────────────────────
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<TaskStatus>('inbox');

  const handleBoardCreateTask = useCallback((status: TaskStatus) => {
    setCreateModalDefaultStatus(status);
    setShowCreateModal(true);
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

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
        case 'N': {
          if (e.shiftKey) { e.preventDefault(); setShowCreateModal(true); }
          break;
        }
        case 'Escape': {
          if (selectedTaskId) setSelectedTaskId(null);
          else if (showCreateModal) setShowCreateModal(false);
          break;
        }
        case 'd': {
          e.preventDefault();
          if (selectedTaskId) {
            const task = tasks.find((t) => t.id === selectedTaskId);
            if (task) {
              updateTask.mutate({ id: selectedTaskId, data: { status: task.status === 'done' ? 'todo' : 'done' } });
            }
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (selectedTaskId) { e.preventDefault(); handleDelete(selectedTaskId); }
          break;
        }
        case '1':
        case '2':
        case '3':
        case '4': {
          if (selectedTaskId) {
            e.preventDefault();
            updateTask.mutate({ id: selectedTaskId, data: { priority: parseInt(e.key) as TaskPriority } });
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
            if (idx < tasks.length - 1) setSelectedTaskId(tasks[idx + 1].id);
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
            if (idx > 0) setSelectedTaskId(tasks[idx - 1].id);
          }
          break;
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, tasks, updateTask, handleDelete, showCreateModal]);

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderActiveView() {
    switch (activeView) {
      case 'board':
        return (
          <TaskBoard
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            groupBy="status"
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onDeleteTask={handleDelete}
            onCreateTask={handleBoardCreateTask}
          />
        );
      case 'list':
        return (
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        );
      case 'today':
        return (
          <TaskTodayView
            tasks={tasks}
            onSelectTask={setSelectedTaskId}
            onStatusChange={handleStatusChange}
          />
        );
      case 'backlog':
        return (
          <TaskList
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        );
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 28px 0',
          flexShrink: 0,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {/* Title + New Task button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Tasks
          </h1>
          <button
            onClick={() => { setCreateModalDefaultStatus(getDefaultStatusForView(activeView)); setShowCreateModal(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'var(--color-accent)',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={14} />
            New Task
          </button>
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {VIEW_TABS.map(({ key, label, Icon }) => {
            const isActive = activeView === key;
            const isHovered = hoveredTab === key;
            return (
              <button
                key={key}
                onClick={() => { setActiveView(key); setSelectedTaskId(null); }}
                onMouseEnter={() => setHoveredTab(key)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  backgroundColor: isActive ? 'var(--color-accent-soft)' : isHovered ? 'var(--color-bg-hover)' : 'transparent',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Toolbar + quick add ───────────────────────────────────────────── */}
      <div
        style={{
          padding: '8px 28px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'var(--color-bg-primary)',
          borderBottom: hasActiveFilters ? '1px solid var(--color-border)' : undefined,
        }}
      >
        {/* TaskToolbar handles search + filter + group + sort internally */}
        <TaskToolbar
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          filters={filters}
          onFilterChange={setFilters}
          onNewTask={() => { setCreateModalDefaultStatus(getDefaultStatusForView(activeView)); setShowCreateModal(true); }}
        />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Quick add */}
        <div style={{ position: 'relative' }}>
          <Plus
            size={13}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={quickAddRef}
            type="text"
            placeholder="Quick add (↵)"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={handleQuickAdd}
            style={{
              width: 200,
              padding: '6px 10px 6px 26px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-primary)',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          />
        </div>
      </div>

      {/* ── Filter chips ──────────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div
          style={{
            padding: '6px 28px',
            flexShrink: 0,
            backgroundColor: 'var(--color-bg-primary)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <TaskFilterChips
            filters={filters}
            onRemoveFilter={(key, value) => {
              setFilters((prev) => {
                const updated = { ...prev };
                if (value === undefined) {
                  delete (updated as Record<string, unknown>)[key];
                } else {
                  const arr = ((updated as Record<string, unknown>)[key] as unknown[]) ?? [];
                  (updated as Record<string, unknown>)[key] = arr.filter((v) => String(v) !== String(value));
                  if (((updated as Record<string, unknown>)[key] as unknown[]).length === 0) {
                    delete (updated as Record<string, unknown>)[key];
                  }
                }
                return updated;
              });
            }}
            onClearAll={() => { setFilters({}); setSearchQuery(''); }}
          />
        </div>
      )}

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Main view — shrinks when detail panel is open */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            transition: 'margin-right 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            marginRight: selectedTask ? 420 : 0,
          }}
        >
          {renderActiveView()}
        </div>

        {/* Detail panel — fixed right slide-in */}
        {selectedTask && (
          <TaskDetail
            task={selectedTask}
            onUpdate={(data: UpdateTaskInput) => updateTask.mutate({ id: selectedTask.id, data })}
            onDelete={() => handleDelete(selectedTask.id)}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <TaskToast
          data={toast}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* ── Create modal ───────────────────────────────────────────────────── */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        defaultStatus={createModalDefaultStatus}
      />
    </div>
  );
}
