/**
 * Task Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.tasks.*) without
 *          changing any component or hook code.
 */
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter, TaskStatus } from '@/shared/types/task';

// ─── In-memory store (temporary until Electron IPC is wired) ────────────────

const STORAGE_KEY = 'nexus-tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore storage errors
  }
}

let tasks: Task[] = loadTasks();

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function matchesFilter(task: Task, filter?: TaskFilter): boolean {
  if (!filter) return true;

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!statuses.includes(task.status)) return false;
  }

  if (filter.priority !== undefined) {
    const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
    if (!priorities.includes(task.priority)) return false;
  }

  if (filter.projectId !== undefined) {
    if (task.projectId !== filter.projectId) return false;
  }

  if (filter.parentId !== undefined) {
    if (task.parentId !== filter.parentId) return false;
  }

  if (filter.milestoneId !== undefined) {
    if (task.milestoneId !== filter.milestoneId) return false;
  }

  if (filter.dueBefore && task.dueDate) {
    if (task.dueDate > filter.dueBefore) return false;
  }

  if (filter.dueAfter && task.dueDate) {
    if (task.dueDate < filter.dueAfter) return false;
  }

  if (filter.tags && filter.tags.length > 0) {
    if (!filter.tags.some((t) => task.tags.includes(t))) return false;
  }

  if (filter.search) {
    const q = filter.search.toLowerCase();
    if (
      !task.title.toLowerCase().includes(q) &&
      !(task.description ?? '').toLowerCase().includes(q)
    ) {
      return false;
    }
  }

  return true;
}

// ─── Public API (matches the Electron IPC contract) ─────────────────────────

export const taskService = {
  async list(filter?: TaskFilter): Promise<Task[]> {
    return tasks
      .filter((t) => matchesFilter(t, filter))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async get(id: string): Promise<Task | null> {
    return tasks.find((t) => t.id === id) ?? null;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sortOrder)) : 0;
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'inbox',
      priority: input.priority ?? 0,
      projectId: input.projectId ?? null,
      parentId: input.parentId ?? null,
      milestoneId: input.milestoneId ?? null,
      dueDate: input.dueDate ?? null,
      startDate: input.startDate ?? null,
      completedAt: null,
      recurrence: null,
      sortOrder: maxOrder + 1,
      tags: input.tags ?? [],
      estimatedMin: input.estimatedMin ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    tasks.push(task);
    persist();
    return task;
  },

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);

    const existing = tasks[idx];
    const updated: Task = {
      ...existing,
      ...input,
      tags: input.tags ?? existing.tags,
      updatedAt: now(),
    };

    // Auto-set completedAt when status transitions to done
    if (input.status === 'done' && existing.status !== 'done') {
      updated.completedAt = now();
    }
    if (input.status && input.status !== 'done') {
      updated.completedAt = null;
    }

    tasks[idx] = updated;
    persist();
    return updated;
  },

  async delete(id: string): Promise<void> {
    tasks = tasks.filter((t) => t.id !== id && t.parentId !== id);
    persist();
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.sortOrder = newOrder;
      task.updatedAt = now();
      persist();
    }
  },

  async getSubtasks(parentId: string): Promise<Task[]> {
    return tasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
};
