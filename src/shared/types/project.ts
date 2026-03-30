export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  status: ProjectStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status?: ProjectStatus;
  sortOrder?: number;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  totalNotes: number;
  totalTimeSeconds: number;
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export type MilestoneStatus = 'open' | 'completed';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: string | null; // ISO 8601
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneInput {
  projectId: string;
  name: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: MilestoneStatus;
}
