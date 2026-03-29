/**
 * Task Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.tasks.*) without
 *          changing any component or hook code.
 */
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter, TaskStatus } from '@/shared/types/task';
import type { RecurrenceRule } from '@/shared/types/recurrence';
import { getNextOccurrence } from '@/shared/lib/recurrenceUtils';
import { timerService } from './timerService';

// ─── In-memory store (temporary until Electron IPC is wired) ────────────────

const STORAGE_KEY = 'nexus-tasks';

// ─── Cover images (Unsplash) — variety of work/dev/design themes ─────────────
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=400&q=80',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80',
];

// ─── Mock seed data ───────────────────────────────────────────────────────────
function generateMockTasks(): Task[] {
  const n = now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const mockData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'completedAt' | 'recurrence' | 'milestoneId' | 'parentId' | 'startDate' | 'blockedBy' | 'blocks'>[] = [
    {
      title: 'Redesign onboarding flow',
      description: 'Revamp the entire new-user onboarding to reduce drop-off.',
      status: 'in_progress',
      priority: 3,
      projectId: null,
      dueDate: tomorrowStr,
      tags: ['Design', 'Mobile'],
      estimatedMin: 240,
      coverImage: COVER_IMAGES[0],
      issueKey: 'DIV-1040',
      assignees: ['https://i.pravatar.cc/150?u=alice', 'https://i.pravatar.cc/150?u=bob'],
    },
    {
      title: 'Implement dark mode for dashboard',
      description: 'Apply theme tokens across all dashboard widgets.',
      status: 'todo',
      priority: 2,
      projectId: null,
      dueDate: nextWeekStr,
      tags: ['Development', 'Frontend'],
      estimatedMin: 180,
      coverImage: COVER_IMAGES[1],
      issueKey: 'DIV-1041',
      assignees: ['https://i.pravatar.cc/150?u=carol'],
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'GitHub Actions workflow for automated testing and deployment.',
      status: 'todo',
      priority: 4,
      projectId: null,
      dueDate: yesterdayStr,
      tags: ['DevOps', 'Backend'],
      estimatedMin: 120,
      coverImage: COVER_IMAGES[2],
      issueKey: 'DIV-1042',
      assignees: ['https://i.pravatar.cc/150?u=dan', 'https://i.pravatar.cc/150?u=eve', 'https://i.pravatar.cc/150?u=frank'],
    },
    {
      title: 'Write API documentation',
      description: 'OpenAPI spec for all public endpoints.',
      status: 'in_review',
      priority: 2,
      projectId: null,
      dueDate: nextWeekStr,
      tags: ['Documentation', 'Backend'],
      estimatedMin: 90,
      coverImage: COVER_IMAGES[3],
      issueKey: 'DIV-1043',
      assignees: ['https://i.pravatar.cc/150?u=grace'],
    },
    {
      title: 'Performance audit — bundle size',
      description: 'Analyse and cut JS bundle by 30%.',
      status: 'backlog',
      priority: 1,
      projectId: null,
      dueDate: null,
      tags: ['Performance', 'Frontend'],
      estimatedMin: 300,
      coverImage: COVER_IMAGES[4],
      issueKey: 'DIV-1044',
      assignees: ['https://i.pravatar.cc/150?u=hank'],
    },
    {
      title: 'User research interviews',
      description: 'Conduct 5 interviews with power users for Q2 roadmap.',
      status: 'todo',
      priority: 3,
      projectId: null,
      dueDate: tomorrowStr,
      tags: ['Research', 'Design'],
      estimatedMin: 150,
      coverImage: COVER_IMAGES[5],
      issueKey: 'DIV-1045',
      assignees: ['https://i.pravatar.cc/150?u=iris', 'https://i.pravatar.cc/150?u=jack'],
    },
    {
      title: 'Database migration to PostgreSQL',
      description: 'Move from SQLite to Postgres for production scale.',
      status: 'backlog',
      priority: 3,
      projectId: null,
      dueDate: null,
      tags: ['Backend', 'DevOps'],
      estimatedMin: 480,
      issueKey: 'DIV-1046',
      assignees: ['https://i.pravatar.cc/150?u=karen'],
    },
    {
      title: 'Mobile push notifications',
      description: 'Implement FCM push for iOS and Android clients.',
      status: 'inbox',
      priority: 2,
      projectId: null,
      dueDate: null,
      tags: ['Mobile', 'iOS'],
      estimatedMin: 200,
      coverImage: COVER_IMAGES[6],
      issueKey: 'DIV-1047',
      assignees: ['https://i.pravatar.cc/150?u=leo', 'https://i.pravatar.cc/150?u=mia'],
    },
    {
      title: 'A/B test new pricing page',
      description: 'Run split test comparing two pricing layouts.',
      status: 'done',
      priority: 1,
      projectId: null,
      dueDate: yesterdayStr,
      tags: ['Marketing', 'Analytics'],
      estimatedMin: 60,
      issueKey: 'DIV-1048',
      assignees: ['https://i.pravatar.cc/150?u=nina'],
    },
    {
      title: 'Fix Safari rendering bugs',
      description: 'CSS grid issues on Safari 16 — flexbox fallback needed.',
      status: 'in_progress',
      priority: 4,
      projectId: null,
      dueDate: tomorrowStr,
      tags: ['Bug', 'Frontend'],
      estimatedMin: 90,
      coverImage: COVER_IMAGES[7],
      issueKey: 'DIV-1049',
      assignees: ['https://i.pravatar.cc/150?u=oscar', 'https://i.pravatar.cc/150?u=paul'],
    },
  ];

  return mockData.map((d, i) => ({
    ...d,
    id: `mock-${i + 1}`,
    sortOrder: i + 1,
    parentId: null,
    milestoneId: null,
    startDate: null,
    completedAt: d.status === 'done' ? n : null,
    recurrence: null,
    blockedBy: [],
    blocks: [],
    createdAt: n,
    updatedAt: n,
  }));
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return generateMockTasks();
    const parsed = JSON.parse(raw) as Task[];
    // If stored tasks have none with issueKey, it means this is the old format
    // Seed fresh mock data so the visual overhaul is visible
    if (parsed.length > 0 && !parsed.some((t) => t.issueKey)) {
      const mock = generateMockTasks();
      // Preserve user-created tasks (those without the mock- prefix), append mock tasks
      const userTasks = parsed.filter((t) => !t.id.startsWith('mock-'));
      return [...mock, ...userTasks];
    }
    return parsed;
  } catch {
    return generateMockTasks();
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

  if (filter.dueBefore) {
    if (!task.dueDate) return false;
    if (task.dueDate > filter.dueBefore) return false;
  }

  if (filter.dueAfter) {
    if (!task.dueDate) return false;
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
      recurrence: input.recurrence ?? null,
      sortOrder: maxOrder + 1,
      tags: input.tags ?? [],
      estimatedMin: input.estimatedMin ?? null,
      createdAt: now(),
      updatedAt: now(),
      blockedBy: [],
      blocks: [],
      coverImage: undefined,
      issueKey: undefined,
      assignees: [],
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
      blockedBy: input.blockedBy ?? existing.blockedBy ?? [],
      blocks: input.blocks ?? existing.blocks ?? [],
      updatedAt: now(),
    };

    // Auto-set completedAt when status transitions to done
    if (input.status === 'done' && existing.status !== 'done') {
      updated.completedAt = now();

      // Auto-create next occurrence for recurring tasks
      if (existing.recurrence && !existing.dueDate) {
        console.warn(`Recurring task "${existing.title}" (${existing.id}) has no dueDate — skipping next occurrence creation.`);
      }
      if (existing.recurrence && existing.dueDate) {
        try {
          const rule: RecurrenceRule = JSON.parse(existing.recurrence);
          const nextDate = getNextOccurrence(existing.dueDate, rule);
          if (nextDate) {
            const maxOrder = tasks.length > 0 ? Math.max(...tasks.map((t) => t.sortOrder)) : 0;
            const nextTask: Task = {
              id: generateId(),
              title: existing.title,
              description: existing.description,
              status: 'todo',
              priority: existing.priority,
              projectId: existing.projectId,
              parentId: existing.parentId,
              milestoneId: existing.milestoneId,
              dueDate: nextDate.split('T')[0],
              startDate: null,
              completedAt: null,
              recurrence: existing.recurrence,
              sortOrder: maxOrder + 1,
              tags: [...existing.tags],
              estimatedMin: existing.estimatedMin,
              createdAt: now(),
              updatedAt: now(),
              blockedBy: [],
              blocks: [],
            };
            tasks.push(nextTask);
          }
        } catch {
          // Invalid recurrence JSON — skip
        }
      }
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

    // Clean up dangling taskId references on timer entries
    const allEntries = await timerService.listEntries();
    const orphanedEntries = allEntries.filter((e) => e.taskId === id);
    for (const entry of orphanedEntries) {
      await timerService.updateEntry(entry.id, { taskId: null });
    }
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
