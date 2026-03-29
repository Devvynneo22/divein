export type TaskStatus = 'backlog' | 'inbox' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 0 | 1 | 2 | 3 | 4; // 0=none, 1=low, 2=med, 3=high, 4=urgent

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string | null;
  parentId: string | null;
  milestoneId: string | null;
  dueDate: string | null; // ISO 8601
  startDate: string | null;
  completedAt: string | null;
  recurrence: string | null; // JSON
  sortOrder: number;
  tags: string[]; // parsed from JSON
  estimatedMin: number | null;
  createdAt: string;
  updatedAt: string;
  // Task dependency graph
  blockedBy?: string[]; // task IDs that must be done before this task
  blocks?: string[];    // task IDs that this task blocks
  // Visual enhancement fields
  coverImage?: string;    // Unsplash image URL
  issueKey?: string;      // e.g. "DIV-1040"
  assignees?: string[];   // Array of avatar URLs (Pravatar)
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  parentId?: string;
  milestoneId?: string;
  dueDate?: string;
  startDate?: string;
  tags?: string[];
  estimatedMin?: number;
  recurrence?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string | null;
  parentId?: string | null;
  milestoneId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  completedAt?: string | null;
  tags?: string[];
  estimatedMin?: number | null;
  sortOrder?: number;
  recurrence?: string | null;
  blockedBy?: string[];
  blocks?: string[];
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  projectId?: string | null;
  parentId?: string | null;
  milestoneId?: string | null;
  dueBefore?: string;
  dueAfter?: string;
  tags?: string[];
  search?: string;
}
