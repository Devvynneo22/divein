import { isToday, isPast, parseISO, startOfDay } from 'date-fns';
import type { Task } from '@/shared/types/task';

export type TaskGroupBy = 'none' | 'status' | 'priority' | 'project' | 'dueDate';
export type TaskSortBy = 'manual' | 'priority' | 'dueDate' | 'createdAt' | 'title';

export interface TaskGroup {
  key: string;
  label: string;
  tasks: Task[];
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  inbox: 'Inbox',
  todo: 'Todo',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<number, string> = {
  4: 'Urgent',
  3: 'High',
  2: 'Medium',
  1: 'Low',
  0: 'No Priority',
};

const STATUS_ORDER = ['backlog', 'inbox', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const PRIORITY_ORDER = [4, 3, 2, 1, 0];

function compareTasks(a: Task, b: Task, sortBy: TaskSortBy): number {
  switch (sortBy) {
    case 'priority':
      return b.priority - a.priority || a.sortOrder - b.sortOrder;
    case 'dueDate': {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return da - db || b.priority - a.priority || a.sortOrder - b.sortOrder;
    }
    case 'createdAt':
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case 'title':
      return a.title.localeCompare(b.title) || a.sortOrder - b.sortOrder;
    case 'manual':
    default:
      return a.sortOrder - b.sortOrder;
  }
}

export function sortTasks(tasks: Task[], sortBy: TaskSortBy): Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, sortBy));
}

export function getTodayState(task: Task): { isToday: boolean; isOverdue: boolean; label: string | null } {
  if (!task.dueDate) return { isToday: false, isOverdue: false, label: null };
  const due = parseISO(task.dueDate);
  const overdue = !isToday(due) && isPast(startOfDay(due));
  const today = isToday(due);
  return {
    isToday: today,
    isOverdue: overdue,
    label: overdue ? 'Overdue' : today ? 'Today' : null,
  };
}

export function groupTasks(tasks: Task[], groupBy: TaskGroupBy, sortBy: TaskSortBy): TaskGroup[] {
  const sorted = sortTasks(tasks, sortBy);

  if (groupBy === 'none') {
    return [{ key: 'all', label: 'All Tasks', tasks: sorted }];
  }

  if (groupBy === 'status') {
    return STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status] ?? status,
      tasks: sorted.filter((t) => t.status === status),
    })).filter((group) => group.tasks.length > 0);
  }

  if (groupBy === 'priority') {
    return PRIORITY_ORDER.map((priority) => ({
      key: String(priority),
      label: PRIORITY_LABELS[priority] ?? 'Unknown',
      tasks: sorted.filter((t) => t.priority === priority),
    })).filter((group) => group.tasks.length > 0);
  }

  if (groupBy === 'project') {
    const buckets = new Map<string, { label: string; tasks: Task[] }>();
    for (const task of sorted) {
      const key = task.projectId ?? 'none';
      const label = task.projectId ? `Project ${task.projectId}` : 'No Project';
      const existing = buckets.get(key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        buckets.set(key, { label, tasks: [task] });
      }
    }
    return Array.from(buckets.entries()).map(([key, { label, tasks: groupTasks }]) => ({
      key,
      label,
      tasks: groupTasks,
    }));
  }

  if (groupBy === 'dueDate') {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const unscheduled: Task[] = [];

    for (const task of sorted) {
      if (!task.dueDate) {
        unscheduled.push(task);
        continue;
      }
      const state = getTodayState(task);
      if (state.isOverdue) overdue.push(task);
      else if (state.isToday) today.push(task);
      else upcoming.push(task);
    }

    return [
      { key: 'overdue', label: 'Overdue', tasks: overdue },
      { key: 'today', label: 'Today', tasks: today },
      { key: 'upcoming', label: 'Upcoming', tasks: upcoming },
      { key: 'unscheduled', label: 'No Due Date', tasks: unscheduled },
    ].filter((group) => group.tasks.length > 0);
  }

  return [{ key: 'all', label: 'All Tasks', tasks: sorted }];
}
