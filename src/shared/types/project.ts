export type ProjectStatus = 'active' | 'archived';

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
  // totalTables: number; // future: when Tables module is built
}
