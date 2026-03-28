export interface Note {
  id: string;
  title: string;
  content: string | null;
  contentText: string | null;
  parentId: string | null;
  projectId: string | null;
  icon: string | null;
  coverColor: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  tags: string[];
  wordCount: number;
  sortOrder: number;
  depth: number;
  hasChildren: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title?: string;
  content?: string;
  parentId?: string;
  projectId?: string;
  icon?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string | null;
  contentText?: string | null;
  parentId?: string | null;
  projectId?: string | null;
  icon?: string | null;
  coverColor?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  tags?: string[];
  wordCount?: number;
  sortOrder?: number;
}

export interface NoteFilter {
  parentId?: string | null;
  projectId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  search?: string;
  tags?: string[];
}

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[];
}
