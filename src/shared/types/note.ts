export interface Note {
  id: string;
  title: string;
  content: string | null; // TipTap JSON document
  contentText: string | null; // Plain text extraction
  folderId: string | null;
  projectId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  folderId?: string;
  projectId?: string;
  tags?: string[];
}

export interface UpdateNoteInput {
  title?: string;
  content?: string | null;
  contentText?: string | null;
  folderId?: string | null;
  projectId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  wordCount?: number;
}

export interface NoteFilter {
  folderId?: string | null;
  projectId?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  search?: string;
  tags?: string[];
}
