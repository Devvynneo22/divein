import { useState, useEffect, useRef, useCallback, useMemo, type ReactElement } from 'react';
import {
  Plus,
  LayoutGrid,
  List,
  Sun,
  Archive,
  Layers,
  Settings2,
  BookmarkPlus,
  X,
  Maximize2,
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
import { useTaskSettingsStore } from '@/shared/stores/taskSettingsStore';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import type { TaskDensity } from '@/shared/stores/appSettingsStore';
import { useZenModeStore, useZenShortcut } from '@/shared/stores/zenModeStore';

// ─── Component imports ────────────────────────────────────────────────────────
import { TaskBoard } from './components/TaskBoard';
import { TaskList } from './components/TaskList';
import { TaskTodayView } from './components/TaskTodayView';
import { ZenTaskView } from './components/ZenTaskView';
import { TaskDetail } from './components/TaskDetail';
import { TaskCreateModal } from './components/TaskCreateModal';
import { TaskToolbar } from './components/TaskToolbar';
import { TaskFilterChips } from './components/TaskFilterChips';
import { TaskToast } from './components/TaskToast';
import { TaskBatchFAB } from './components/TaskBatchFAB';
import { TaskCommandPalette } from './components/TaskCommandPalette';
import { CustomStatusManager } from './components/CustomStatusManager';
import { EmptyState } from '@/shared/components/EmptyState';
import { groupTasks, sortTasks, type TaskGroupBy, type TaskSortBy } from './components/taskViewUtils';
import { parseQuickAdd } from './lib/nlpQuickAdd';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveView = 'board' | 'list' | 'today' | 'backlog';

/** Matches the TaskFilters shape used by TaskToolbar + TaskFilterChips */
interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueBefore?: string;
  /** Client-side only: filter tasks with no due date set */
  noDueDate?: boolean;
}

interface ToastData {
  message: string;
  task: Task;
  subtasks: Task[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_VIEW_KEY = 'divein-tasks-active-view';

interface SmartViewDef {
  id: string;
  label: string;
  icon: string;
}

const SMART_VIEWS: SmartViewDef[] = [
  { id: 'smart-overdue',       label: 'Overdue',       icon: '🔥' },
  { id: 'smart-due-today',     label: 'Due Today',     icon: '📅' },
  { id: 'smart-high-priority', label: 'High Priority', icon: '⚡' },
  { id: 'smart-no-due-date',   label: 'No Due Date',   icon: '📭' },
];

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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [commandPaletteTaskId, setCommandPaletteTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [filters, setFiltersRaw] = useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<TaskGroupBy>('status');
  const [sortBy, setSortBy] = useState<TaskSortBy>('manual');
  const [swimlaneBy, setSwimlaneBy] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveViewInput, setShowSaveViewInput] = useState(false);
  const [hoveredViewPill, setHoveredViewPill] = useState<string | null>(null);

  // ─── Active view — persisted to localStorage ───────────────────────────────

  const [activeViewId, setActiveViewIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_VIEW_KEY); } catch { return null; }
  });

  const setActiveViewId = useCallback((id: string | null) => {
    setActiveViewIdState(id);
    try {
      if (id) localStorage.setItem(ACTIVE_VIEW_KEY, id);
      else localStorage.removeItem(ACTIVE_VIEW_KEY);
    } catch { /* ignore */ }
  }, []);

  /**
   * Manual filter change — clears active view (marks it dirty).
   * Use this for all user-driven filter changes (toolbar, chips, etc.).
   */
  const handleFilterChange = useCallback((newFilters: TaskFilters) => {
    setFiltersRaw(newFilters);
    setActiveViewId(null);
  }, [setActiveViewId]);

  const { savedViews, addSavedView, removeSavedView } = useTaskSettingsStore();
  const taskDensity = useAppSettingsStore((s) => s.app.taskDensity);
  const updateAppSettings = useAppSettingsStore((s) => s.updateApp);
  const [hoveredDensity, setHoveredDensity] = useState<TaskDensity | null>(null);

  // ─── Zen mode ─────────────────────────────────────────────────────────────
  const isZen = useZenModeStore((s) => s.isZen);
  const setZen = useZenModeStore((s) => s.setZen);
  const toggleZen = useZenModeStore((s) => s.toggleZen);
  useZenShortcut();

  // When entering zen mode, auto-switch to Today view
  useEffect(() => {
    if (isZen && activeView !== 'today') {
      setActiveView('today');
      setSelectedTaskId(null);
    }
  }, [isZen, activeView]);

  const quickAddRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  /** Apply a saved view — restores its filter/group/sort configuration. */
  const applyView = useCallback((viewId: string) => {
    const view = savedViews.find((v) => v.id === viewId);
    if (!view) return;
    setFiltersRaw({
      status: view.filters.status as TaskStatus[] | undefined,
      priority: view.filters.priority as TaskPriority[] | undefined,
      tags: view.filters.tags,
      dueBefore: view.filters.dueBefore,
    });
    if (view.groupBy) setGroupBy(view.groupBy as TaskGroupBy);
    if (view.sortBy) setSortBy(view.sortBy as TaskSortBy);
    setActiveViewId(viewId);
  }, [savedViews, setActiveViewId]);

  /** Apply a built-in smart view — sets appropriate filters. */
  const applySmartView = useCallback((viewId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const todayEnd = todayStr + 'T23:59:59';

    switch (viewId) {
      case 'smart-overdue':
        setFiltersRaw({
          dueBefore: todayStr + 'T00:00:00',
          status: ['inbox', 'todo', 'in_progress', 'in_review'] as TaskStatus[],
        });
        break;
      case 'smart-due-today':
        setFiltersRaw({ dueBefore: todayEnd });
        break;
      case 'smart-high-priority':
        setFiltersRaw({ priority: [3, 4] as TaskPriority[] });
        break;
      case 'smart-no-due-date':
        setFiltersRaw({ noDueDate: true });
        break;
      default:
        return;
    }
    setActiveViewId(viewId);
  }, [setActiveViewId]);

  /** Save current filter/group/sort as a named view. */
  const handleSaveView = useCallback(() => {
    const name = saveViewName.trim();
    if (!name) return;
    addSavedView({
      name,
      filters: {
        status: filters.status,
        priority: filters.priority,
        tags: filters.tags,
        dueBefore: filters.dueBefore,
      },
      groupBy,
      sortBy,
    });
    setSaveViewName('');
    setShowSaveViewInput(false);
  }, [saveViewName, filters, groupBy, sortBy, addSavedView]);

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

    // noDueDate is handled client-side in the tasks memo below — not passed to the API

    return f;
  }, [filters, searchQuery, activeView]);

  const { data: allTasks = [], isLoading } = useTasks(taskFilter);
  // All tasks unfiltered for dependency resolution
  const { data: allTasksUnfiltered = [] } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const reorderTask = useReorderTask();

  // Root tasks only — also apply noDueDate client-side filter
  const tasks = useMemo(() => {
    let result = allTasks.filter((t) => t.parentId === null);
    if (filters.noDueDate) {
      result = result.filter((t) => t.dueDate === null);
    }
    return result;
  }, [allTasks, filters.noDueDate]);

  // Compute a set of task IDs that are actively blocked (have non-done/cancelled blockers)
  const blockedTaskIds = useMemo((): Set<string> => {
    const doneStatuses = new Set(['done', 'cancelled']);
    const taskStatusMap = new Map(allTasksUnfiltered.map((t) => [t.id, t.status]));
    const blocked = new Set<string>();
    for (const t of allTasksUnfiltered) {
      if ((t.blockedBy ?? []).length > 0) {
        const hasActiveBlocker = (t.blockedBy ?? []).some((bId) => {
          const s = taskStatusMap.get(bId);
          return s !== undefined && !doneStatuses.has(s);
        });
        if (hasActiveBlocker) blocked.add(t.id);
      }
    }
    return blocked;
  }, [allTasksUnfiltered]);
  const sortedTasks = useMemo(() => sortTasks(tasks, sortBy), [tasks, sortBy]);
  const groupedTasks = useMemo(() => groupTasks(tasks, groupBy, sortBy), [tasks, groupBy, sortBy]);

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
        const parsed = parseQuickAdd(quickAddTitle.trim());
        createTask.mutate({
          title: parsed.title,
          status: getDefaultStatusForView(activeView),
          ...(parsed.dueDate ? { dueDate: parsed.dueDate } : {}),
          ...(parsed.tags.length > 0 ? { tags: parsed.tags } : {}),
          ...(parsed.priority !== null ? { priority: parsed.priority } : {}),
        });
        setQuickAddTitle('');
      }
    },
    [quickAddTitle, activeView, createTask],
  );

  // Live NLP parse preview — only computed when there's input
  const nlpPreview = useMemo(() => {
    if (!quickAddTitle.trim()) return null;
    const p = parseQuickAdd(quickAddTitle.trim());
    const chips: ReactElement[] = [];
    if (p.dueDate) {
      const label = new Date(p.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      chips.push(
        <span key="date" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', whiteSpace: 'nowrap' }}>
          📅 {label}
        </span>
      );
    }
    p.tags.forEach((tag) => {
      chips.push(
        <span key={`tag-${tag}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--color-success-soft, rgba(74,222,128,0.12))', color: 'var(--color-success, #22c55e)', border: '1px solid rgba(74,222,128,0.4)', whiteSpace: 'nowrap' }}>
          #{tag}
        </span>
      );
    });
    if (p.priority !== null) {
      const pLabels: Record<number, string> = { 4: 'P1 Urgent', 3: 'P2 High', 2: 'P3 Med', 1: 'P4 Low' };
      const pColors: Record<number, string> = { 4: 'var(--color-danger, #ef4444)', 3: 'var(--color-p3, #f97316)', 2: 'var(--color-p2, #eab308)', 1: 'var(--color-p1, #3b82f6)' };
      const pBg: Record<number, string> = { 4: 'rgba(239,68,68,0.1)', 3: 'rgba(249,115,22,0.1)', 2: 'rgba(234,179,8,0.1)', 1: 'rgba(59,130,246,0.1)' };
      chips.push(
        <span key="priority" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600, backgroundColor: pBg[p.priority], color: pColors[p.priority], border: `1px solid ${pColors[p.priority]}55`, whiteSpace: 'nowrap' }}>
          ◆ {pLabels[p.priority]}
        </span>
      );
    }
    if (chips.length === 0) return null;
    return chips;
  }, [quickAddTitle]);

  const handleStatusChange = useCallback(
    (id: string, status: TaskStatus) => {
      if (status === 'done' && blockedTaskIds.has(id)) {
        setToast({
          message: '⚠️ This task has unfinished blockers — complete them first.',
          task: allTasksUnfiltered.find((t) => t.id === id) ?? { id, title: '', status: 'todo', priority: 0, description: null, projectId: null, parentId: null, milestoneId: null, dueDate: null, startDate: null, completedAt: null, recurrence: null, sortOrder: 0, tags: [], estimatedMin: null, createdAt: '', updatedAt: '' },
          subtasks: [],
        });
        // Still allow the move (just warn) — remove the early return if you want to block it
        updateTask.mutate({ id, data: { status } });
        return;
      }
      updateTask.mutate({ id, data: { status } });
    },
    [updateTask, blockedTaskIds, allTasksUnfiltered],
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
      setCreateModalDefaultStatus(status);
      setShowCreateModal(true);
    },
    [],
  );

  const hasActiveFilters = useMemo(
    () =>
      (filters.status && filters.status.length > 0) ||
      (filters.priority && filters.priority.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      !!filters.dueBefore ||
      !!filters.noDueDate ||
      !!searchQuery,
    [filters, searchQuery],
  );

  // ─── "Create for status" quick path ──────────────────────────────────────
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<TaskStatus>('inbox');

  const handleBoardCreateTask = useCallback((status: TaskStatus) => {
    setCreateModalDefaultStatus(status);
    setShowCreateModal(true);
  }, []);

  const handleReorder = useCallback(
    (id: string, newOrder: number) => {
      reorderTask.mutate({ id, newOrder });
    },
    [reorderTask],
  );

  // ─── Multi-select helpers ─────────────────────────────────────────────────

  /**
   * Toggle a task in/out of the multi-selection set.
   * Called by TaskList/TaskBoard row onClick when Shift or Meta/Ctrl is held.
   */
  const handleToggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedTaskIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      // When multi-selecting, don't open the detail panel
      return;
    }
    // Normal single-select — open detail panel
    setSelectedTaskId(id);
  }, []);

  /** Direct toggle by id — used by checkboxes (no mouse event) */
  const handleToggleSelectById = useCallback((id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedTaskIds([]), []);

  // ─── Batch action handlers ────────────────────────────────────────────────

  const handleBatchSetStatus = useCallback(
    async (status: TaskStatus) => {
      for (const id of selectedTaskIds) {
        await taskService.update(id, { status });
      }
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds([]);
    },
    [selectedTaskIds, queryClient]
  );

  const handleBatchSetPriority = useCallback(
    async (priority: TaskPriority) => {
      for (const id of selectedTaskIds) {
        await taskService.update(id, { priority });
      }
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds([]);
    },
    [selectedTaskIds, queryClient]
  );

  const handleBatchSetDueDate = useCallback(
    async (date: string | null) => {
      for (const id of selectedTaskIds) {
        await taskService.update(id, { dueDate: date });
      }
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds([]);
    },
    [selectedTaskIds, queryClient]
  );

  const handleBatchDelete = useCallback(async () => {
    for (const id of selectedTaskIds) {
      await taskService.delete(id);
    }
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setSelectedTaskIds([]);
  }, [selectedTaskIds, queryClient]);

  // ─── Command palette for focused task ────────────────────────────────────

  const commandPaletteTask = useMemo(
    () => tasks.find((t) => t.id === commandPaletteTaskId) ?? null,
    [tasks, commandPaletteTaskId]
  );

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
          if (selectedTaskIds.length > 0) { setSelectedTaskIds([]); }
          else if (selectedTaskId) setSelectedTaskId(null);
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

      // Cmd+K / Ctrl+K — open contextual command palette for focused/hovered task
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const targetId = selectedTaskId ?? hoveredTaskId;
        if (targetId) {
          setCommandPaletteTaskId(targetId);
        }
      }

      // Ctrl+A / Cmd+A — select all visible tasks
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedTaskIds(tasks.map((t) => t.id));
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, hoveredTaskId, tasks, updateTask, handleDelete, showCreateModal, selectedTaskIds]);

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderActiveView() {
    // Show empty state only when there are truly no tasks at all (not just filtered)
    if (allTasks.length === 0 && !isLoading) {
      return (
        <EmptyState
          icon="✅"
          title="No tasks yet"
          description="Create your first task to start organizing your work"
          actionLabel="Create Task"
          onAction={() => { setCreateModalDefaultStatus(getDefaultStatusForView(activeView)); setShowCreateModal(true); }}
        />
      );
    }
    switch (activeView) {
      case 'board':
        return (
          <TaskBoard
            tasks={sortedTasks}
            selectedTaskId={selectedTaskId}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={setSelectedTaskId}
            onToggleSelect={handleToggleSelect}
            onHoverTask={setHoveredTaskId}
            groupBy="status"
            swimlaneBy={swimlaneBy}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onDeleteTask={handleDelete}
            onCreateTask={handleBoardCreateTask}
            onReorderTask={handleReorder}
            blockedTaskIds={blockedTaskIds}
          />
        );
      case 'list':
        return (
          <TaskList
            tasks={sortedTasks}
            groupedTasks={groupedTasks}
            selectedTaskId={selectedTaskId}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={setSelectedTaskId}
            onToggleSelect={handleToggleSelect}
            onToggleSelectById={handleToggleSelectById}
            onHoverTask={setHoveredTaskId}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            blockedTaskIds={blockedTaskIds}
          />
        );
      case 'today':
        return (
          <TaskTodayView
            tasks={sortedTasks}
            onSelectTask={setSelectedTaskId}
            onStatusChange={handleStatusChange}
          />
        );
      case 'backlog':
        return (
          <TaskList
            tasks={sortedTasks}
            groupedTasks={groupedTasks}
            selectedTaskId={selectedTaskId}
            selectedTaskIds={selectedTaskIds}
            onSelectTask={setSelectedTaskId}
            onToggleSelect={handleToggleSelect}
            onToggleSelectById={handleToggleSelectById}
            onHoverTask={setHoveredTaskId}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            blockedTaskIds={blockedTaskIds}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Zen mode toggle */}
            <button
              onClick={() => toggleZen()}
              title="Enter Focus Mode (Alt+Z)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: isZen ? 'var(--color-accent-soft)' : 'transparent',
                color: isZen ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isZen) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isZen) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }
              }}
            >
              <Maximize2 size={13} />
              Zen
            </button>

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
        </div>

        {/* View tabs + board controls */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Built-in view tabs */}
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

          {/* ── Density toggle ──────────────────────────────────────── */}
          <div style={{ width: 1, height: 24, backgroundColor: 'var(--color-border)', margin: '0 6px', alignSelf: 'center' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              alignSelf: 'center',
            }}
            title="Density"
          >
            {(['compact', 'default', 'spacious'] as TaskDensity[]).map((d) => {
              const isActive = taskDensity === d;
              const isHov = hoveredDensity === d;
              // Icon: compact = tight lines, default = medium lines, spacious = wide lines
              const icon = d === 'compact' ? '≡' : d === 'default' ? '☰' : '⊞';
              const label = d === 'compact' ? 'Compact' : d === 'default' ? 'Default' : 'Spacious';
              return (
                <button
                  key={d}
                  title={label}
                  onClick={() => updateAppSettings({ taskDensity: d })}
                  onMouseEnter={() => setHoveredDensity(d)}
                  onMouseLeave={() => setHoveredDensity(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: isActive
                      ? '1px solid var(--color-accent)'
                      : `1px solid ${isHov ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                    backgroundColor: isActive
                      ? 'var(--color-accent-soft)'
                      : isHov
                      ? 'var(--color-bg-hover)'
                      : 'var(--color-bg-elevated)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'all 0.12s ease',
                    fontFamily: 'inherit',
                    lineHeight: 1,
                  }}
                >
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Board-only controls: Swimlane + Status Manager */}
          {activeView === 'board' && (
            <>
              <div style={{ width: 1, height: 24, backgroundColor: 'var(--color-border)', margin: '0 4px', alignSelf: 'center' }} />

              {/* Swimlane selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
                <Layers size={13} style={{ color: swimlaneBy ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                <select
                  value={swimlaneBy ?? ''}
                  onChange={(e) => setSwimlaneBy(e.target.value || undefined)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: swimlaneBy ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    backgroundColor: swimlaneBy ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
                    border: `1px solid ${swimlaneBy ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 6,
                    padding: '4px 24px 4px 6px',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 6px center',
                  }}
                >
                  <option value="">Swimlane: None</option>
                  <option value="priority">By Priority</option>
                  <option value="project">By Project</option>
                </select>
              </div>

              {/* Custom status manager button */}
              <button
                onClick={() => setShowStatusManager(true)}
                title="Manage workflow statuses"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 8px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  backgroundColor: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  alignSelf: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
              >
                <Settings2 size={13} />
                Statuses
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Toolbar + quick add (hidden in zen mode) ─────────────────────── */}
      {!isZen && <div
        style={{
          padding: '8px 28px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'var(--color-bg-primary)',
        }}
      >
        {/* TaskToolbar handles search + filter + group + sort internally */}
        <TaskToolbar
          searchQuery={searchQuery}
          onSearch={(q) => { setSearchQuery(q); setActiveViewId(null); }}
          groupBy={groupBy}
          onGroupByChange={(value) => { setGroupBy(value as TaskGroupBy); setActiveViewId(null); }}
          sortBy={sortBy}
          onSortByChange={(value) => { setSortBy(value as TaskSortBy); setActiveViewId(null); }}
          filters={filters}
          onFilterChange={handleFilterChange}
          onNewTask={() => { setCreateModalDefaultStatus(getDefaultStatusForView(activeView)); setShowCreateModal(true); }}
        />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Quick add with NLP */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* NLP chip preview */}
          {nlpPreview && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {nlpPreview}
            </div>
          )}
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
              placeholder='Quick add: "Task tomorrow #tag P1" (↵)'
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={handleQuickAdd}
              style={{
                width: 260,
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
      </div>}

      {/* ── Saved Views Bar (hidden in zen mode) ─────────────────────────── */}
      {!isZen && <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 28px',
          flexShrink: 0,
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-primary)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {/* ── Smart views (built-in, always shown) ── */}
        {SMART_VIEWS.map((sv) => {
          const isActive = activeViewId === sv.id;
          const isHovered = hoveredViewPill === sv.id;
          return (
            <button
              key={sv.id}
              onClick={() => applySmartView(sv.id)}
              onMouseEnter={() => setHoveredViewPill(sv.id)}
              onMouseLeave={() => setHoveredViewPill(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 999,
                border: isActive
                  ? '1px solid var(--color-accent)'
                  : `1px solid ${isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                backgroundColor: isActive
                  ? 'var(--color-accent)'
                  : isHovered
                  ? 'var(--color-bg-tertiary)'
                  : 'var(--color-bg-elevated)',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 13 }}>{sv.icon}</span>
              {sv.label}
            </button>
          );
        })}

        {/* Divider between smart views and user views */}
        {savedViews.length > 0 && (
          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: 'var(--color-border)',
              margin: '0 4px',
              flexShrink: 0,
            }}
          />
        )}

        {/* ── User saved views ── */}
        {savedViews.map((view) => {
          const isActive = activeViewId === view.id;
          const isHovered = hoveredViewPill === `view-${view.id}`;
          return (
            <div
              key={view.id}
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={() => setHoveredViewPill(`view-${view.id}`)}
              onMouseLeave={() => setHoveredViewPill(null)}
            >
              <button
                onClick={() => applyView(view.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: isHovered ? '4px 24px 4px 10px' : '4px 10px',
                  borderRadius: 999,
                  border: isActive
                    ? '1px solid var(--color-accent)'
                    : `1px solid ${isHovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : isHovered
                    ? 'var(--color-bg-tertiary)'
                    : 'var(--color-bg-elevated)',
                  color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 13 }}>📋</span>
                {view.name}
              </button>

              {/* Delete button — shown on hover */}
              {isHovered && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSavedView(view.id);
                    if (activeViewId === view.id) setActiveViewId(null);
                  }}
                  title="Remove view"
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-secondary)',
                    color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    zIndex: 2,
                  }}
                >
                  <X size={8} />
                </button>
              )}
            </div>
          );
        })}

        {/* Divider before save button */}
        <div
          style={{
            width: 1,
            height: 18,
            backgroundColor: 'var(--color-border)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* ── Save current view button / inline input ── */}
        {showSaveViewInput ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <input
              autoFocus
              type="text"
              placeholder="View name…"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveView();
                if (e.key === 'Escape') { setShowSaveViewInput(false); setSaveViewName(''); }
              }}
              style={{
                width: 140,
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--color-accent)',
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleSaveView}
              disabled={!saveViewName.trim()}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: saveViewName.trim() ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: saveViewName.trim() ? 'pointer' : 'default',
                padding: '4px 6px',
                fontFamily: 'inherit',
              }}
            >
              Save
            </button>
            <button
              onClick={() => { setShowSaveViewInput(false); setSaveViewName(''); }}
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveViewInput(true)}
            title="Save current filter/group/sort as a view"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              border: '1px dashed var(--color-border)',
              borderRadius: 999,
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-accent)';
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <BookmarkPlus size={12} />
            Save view
          </button>
        )}

        {/* Clear active view — only shown when a view is active */}
        {activeViewId && (
          <button
            onClick={() => {
              setActiveViewId(null);
              setFiltersRaw({});
            }}
            title="Clear active view"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              border: 'none',
              borderRadius: 999,
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginLeft: 2,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger, #ef4444)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <X size={10} />
            Clear view
          </button>
        )}
      </div>}

      {/* ── Filter chips ──────────────────────────────────────────────────── */}
      {!isZen && hasActiveFilters && (
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
              handleFilterChange((() => {
                const updated = { ...filters };
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
              })());
            }}
            onClearAll={() => { handleFilterChange({}); setSearchQuery(''); }}
          />
        </div>
      )}

      {/* ── Content area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {isZen ? (
          /* ── Zen / Focus mode ── */
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ZenTaskView
              tasks={sortedTasks}
              onStatusChange={handleStatusChange}
            />
          </div>
        ) : (
          <>
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
          </>
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

      {/* ── Batch FAB ─────────────────────────────────────────────────────── */}
      {selectedTaskIds.length > 0 && (
        <TaskBatchFAB
          selectedCount={selectedTaskIds.length}
          onSetStatus={handleBatchSetStatus}
          onSetPriority={handleBatchSetPriority}
          onSetDueDate={handleBatchSetDueDate}
          onDelete={handleBatchDelete}
          onClearSelection={clearSelection}
        />
      )}

      {/* ── Task Command Palette (Cmd+K) ───────────────────────────────────── */}
      {commandPaletteTask && (
        <TaskCommandPalette
          task={commandPaletteTask}
          onSetStatus={(status) => {
            updateTask.mutate({ id: commandPaletteTask.id, data: { status } });
          }}
          onSetPriority={(priority) => {
            updateTask.mutate({ id: commandPaletteTask.id, data: { priority } });
          }}
          onSetDueDate={(date) => {
            updateTask.mutate({ id: commandPaletteTask.id, data: { dueDate: date } });
          }}
          onDelete={() => handleDelete(commandPaletteTask.id)}
          onClose={() => setCommandPaletteTaskId(null)}
        />
      )}

      {/* ── Create modal ───────────────────────────────────────────────────── */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        defaultStatus={createModalDefaultStatus}
      />

      {/* ── Custom Status Manager ─────────────────────────────────────────── */}
      {showStatusManager && (
        <CustomStatusManager onClose={() => setShowStatusManager(false)} />
      )}
    </div>
  );
}
