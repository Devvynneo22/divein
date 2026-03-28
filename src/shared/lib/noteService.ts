/**
 * Note Data Service — in-memory implementation.
 * Same contract as future Electron IPC.
 */
import type { Note, NoteFolder, CreateNoteInput, UpdateNoteInput, NoteFilter } from '@/shared/types/note';

let notes: Note[] = [];
let folders: NoteFolder[] = [];

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export const noteService = {
  // ─── Notes ──────────────────────────────────────────────────────────

  async list(filter?: NoteFilter): Promise<Note[]> {
    let result = notes.filter((n) => !n.isArchived);

    if (filter?.folderId !== undefined) {
      result = result.filter((n) => n.folderId === filter.folderId);
    }
    if (filter?.isPinned !== undefined) {
      result = result.filter((n) => n.isPinned === filter.isPinned);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.contentText ?? '').toLowerCase().includes(q)
      );
    }
    if (filter?.tags && filter.tags.length > 0) {
      result = result.filter((n) => filter.tags!.some((t) => n.tags.includes(t)));
    }

    // Pinned first, then by updatedAt desc
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  },

  async get(id: string): Promise<Note | null> {
    return notes.find((n) => n.id === id) ?? null;
  },

  async create(input: CreateNoteInput): Promise<Note> {
    const note: Note = {
      id: generateId(),
      title: input.title,
      content: input.content ?? null,
      contentText: null,
      folderId: input.folderId ?? null,
      projectId: input.projectId ?? null,
      isPinned: false,
      isArchived: false,
      tags: input.tags ?? [],
      wordCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    notes.push(note);
    return note;
  },

  async update(id: string, input: UpdateNoteInput): Promise<Note> {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error(`Note ${id} not found`);

    const existing = notes[idx];
    notes[idx] = {
      ...existing,
      ...input,
      tags: input.tags ?? existing.tags,
      updatedAt: now(),
    };
    return notes[idx];
  },

  async delete(id: string): Promise<void> {
    notes = notes.filter((n) => n.id !== id);
  },

  async search(query: string): Promise<Note[]> {
    return this.list({ search: query });
  },

  // ─── Folders ────────────────────────────────────────────────────────

  async listFolders(): Promise<NoteFolder[]> {
    return [...folders].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async createFolder(name: string, parentId?: string): Promise<NoteFolder> {
    const maxOrder = folders.length > 0 ? Math.max(...folders.map((f) => f.sortOrder)) : 0;
    const folder: NoteFolder = {
      id: generateId(),
      name,
      parentId: parentId ?? null,
      sortOrder: maxOrder + 1,
      createdAt: now(),
    };
    folders.push(folder);
    return folder;
  },

  async deleteFolder(id: string): Promise<void> {
    // Move notes in this folder to no-folder
    notes = notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n));
    folders = folders.filter((f) => f.id !== id && f.parentId !== id);
  },
};
