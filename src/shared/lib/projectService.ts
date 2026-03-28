/**
 * Project Data Service — in-memory implementation.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.projects.*) without
 *          changing any component or hook code.
 *
 * Projects are an organizational layer — they don't own data, they group it.
 * Stats are computed by querying other services filtered by projectId.
 */
import type { Project, CreateProjectInput, UpdateProjectInput, ProjectStats } from '@/shared/types/project';
import { taskService } from './taskService';
import { noteService } from './noteService';
import { timerService } from './timerService';

// ─── In-memory store ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'nexus-projects';

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Project[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore storage errors
  }
}

let projects: Project[] = loadProjects();

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const projectService = {
  async list(includeArchived = false): Promise<Project[]> {
    const result = includeArchived
      ? projects
      : projects.filter((p) => p.status === 'active');
    return [...result].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async get(id: string): Promise<Project | null> {
    return projects.find((p) => p.id === id) ?? null;
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const maxOrder =
      projects.length > 0 ? Math.max(...projects.map((p) => p.sortOrder)) : 0;
    const project: Project = {
      id: generateId(),
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      icon: input.icon ?? null,
      status: 'active',
      sortOrder: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    projects.push(project);
    persist();
    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project ${id} not found`);

    const existing = projects[idx];
    projects[idx] = {
      ...existing,
      ...input,
      updatedAt: now(),
    };
    persist();
    return projects[idx];
  },

  async delete(id: string): Promise<void> {
    // Deleting a project does NOT cascade-delete linked items.
    // Linked tasks/notes/entries retain their projectId (they become "orphaned").
    // When moving to Electron + SQLite, implement proper FK behavior there.
    projects = projects.filter((p) => p.id !== id);
    persist();
  },

  async archive(id: string): Promise<Project> {
    return projectService.update(id, { status: 'archived' });
  },

  async unarchive(id: string): Promise<Project> {
    return projectService.update(id, { status: 'active' });
  },

  async getStats(id: string): Promise<ProjectStats> {
    const [tasks, notes, entries] = await Promise.all([
      taskService.list({ projectId: id }),
      noteService.list({ projectId: id }),
      timerService.listEntries(),
    ]);

    const projectEntries = entries.filter((e) => e.projectId === id);
    const totalTimeSeconds = projectEntries.reduce(
      (sum, e) => sum + (e.durationSec ?? 0),
      0,
    );

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === 'done').length,
      totalNotes: notes.length,
      totalTimeSeconds,
    };
  },
};
