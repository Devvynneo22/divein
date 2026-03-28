/**
 * Note Data Service — localStorage-persisted implementation.
 * Supports hierarchical page structure (Notion-like tree).
 */
import type { Note, CreateNoteInput, UpdateNoteInput, NoteFilter, NoteTreeNode } from '@/shared/types/note';

const STORAGE_KEY = 'nexus-notes';

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Note[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

let notes: Note[] = loadNotes();

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function buildTree(nodes: Note[], parentId: string | null): NoteTreeNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((n) => ({
      ...n,
      children: buildTree(nodes, n.id),
    }));
}

function collectDescendantIds(id: string, allNotes: Note[]): string[] {
  const children = allNotes.filter((n) => n.parentId === id);
  const ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child.id, allNotes));
  }
  return ids;
}

export const noteService = {
  async list(filter?: NoteFilter): Promise<Note[]> {
    let result = [...notes];

    if (filter?.isTrashed !== undefined) {
      result = result.filter((n) => n.isTrashed === filter.isTrashed);
    } else {
      result = result.filter((n) => !n.isTrashed);
    }

    if (filter?.isArchived !== undefined) {
      result = result.filter((n) => n.isArchived === filter.isArchived);
    } else {
      result = result.filter((n) => !n.isArchived);
    }

    if (filter?.parentId !== undefined) {
      result = result.filter((n) => n.parentId === filter.parentId);
    }
    if (filter?.projectId !== undefined) {
      result = result.filter((n) => n.projectId === filter.projectId);
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

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async get(id: string): Promise<Note | null> {
    return notes.find((n) => n.id === id) ?? null;
  },

  async create(input: CreateNoteInput): Promise<Note> {
    const parentId = input.parentId ?? null;

    let depth = 0;
    if (parentId) {
      const parent = notes.find((n) => n.id === parentId);
      if (parent) depth = parent.depth + 1;
    }

    const siblings = notes.filter((n) => n.parentId === parentId && !n.isTrashed);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((n) => n.sortOrder)) : 0;

    const note: Note = {
      id: generateId(),
      title: input.title ?? 'Untitled',
      content: input.content ?? null,
      contentText: null,
      parentId,
      projectId: input.projectId ?? null,
      icon: input.icon ?? null,
      coverColor: null,
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      tags: input.tags ?? [],
      wordCount: 0,
      sortOrder: maxOrder + 1,
      depth,
      hasChildren: false,
      createdAt: now(),
      updatedAt: now(),
    };

    notes.push(note);

    if (parentId) {
      const parentIdx = notes.findIndex((n) => n.id === parentId);
      if (parentIdx !== -1) {
        notes[parentIdx] = { ...notes[parentIdx], hasChildren: true };
      }
    }

    persist();
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
    persist();
    return notes[idx];
  },

  async delete(id: string): Promise<void> {
    const descendantIds = collectDescendantIds(id, notes);
    const toDelete = new Set([id, ...descendantIds]);
    const parentId = notes.find((n) => n.id === id)?.parentId ?? null;

    notes = notes.filter((n) => !toDelete.has(n.id));

    if (parentId) {
      const stillHasChildren = notes.some((n) => n.parentId === parentId && !n.isTrashed);
      const parentIdx = notes.findIndex((n) => n.id === parentId);
      if (parentIdx !== -1) {
        notes[parentIdx] = { ...notes[parentIdx], hasChildren: stillHasChildren };
      }
    }

    persist();
  },

  async trash(id: string): Promise<void> {
    const descendantIds = collectDescendantIds(id, notes);
    const toTrash = new Set([id, ...descendantIds]);
    const parentId = notes.find((n) => n.id === id)?.parentId ?? null;

    notes = notes.map((n) =>
      toTrash.has(n.id) ? { ...n, isTrashed: true, updatedAt: now() } : n
    );

    if (parentId) {
      const stillHasChildren = notes.some((n) => n.parentId === parentId && !n.isTrashed);
      const parentIdx = notes.findIndex((n) => n.id === parentId);
      if (parentIdx !== -1) {
        notes[parentIdx] = { ...notes[parentIdx], hasChildren: stillHasChildren };
      }
    }

    persist();
  },

  async restore(id: string): Promise<void> {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const parentTrashed = note.parentId
      ? notes.find((n) => n.id === note.parentId)?.isTrashed
      : false;

    const newParentId = parentTrashed ? null : note.parentId;
    const newDepth = newParentId
      ? (notes.find((n) => n.id === newParentId)?.depth ?? 0) + 1
      : 0;

    notes = notes.map((n) =>
      n.id === id
        ? { ...n, isTrashed: false, parentId: newParentId, depth: newDepth, updatedAt: now() }
        : n
    );

    if (newParentId) {
      const parentIdx = notes.findIndex((n) => n.id === newParentId);
      if (parentIdx !== -1) {
        notes[parentIdx] = { ...notes[parentIdx], hasChildren: true };
      }
    }

    persist();
  },

  async getChildren(parentId: string): Promise<Note[]> {
    return notes
      .filter((n) => n.parentId === parentId && !n.isTrashed && !n.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getRootPages(): Promise<Note[]> {
    return notes
      .filter((n) => n.parentId === null && !n.isTrashed && !n.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getTree(): Promise<NoteTreeNode[]> {
    const active = notes.filter((n) => !n.isTrashed && !n.isArchived);
    return buildTree(active, null);
  },

  async getAncestors(id: string): Promise<Note[]> {
    const ancestors: Note[] = [];
    let current = notes.find((n) => n.id === id);
    while (current?.parentId) {
      const parent = notes.find((n) => n.id === current!.parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }
    return ancestors;
  },

  async moveTo(id: string, newParentId: string | null, sortOrder?: number): Promise<void> {
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return;

    const note = notes[idx];
    const oldParentId = note.parentId;

    let newDepth = 0;
    if (newParentId) {
      const newParent = notes.find((n) => n.id === newParentId);
      if (newParent) newDepth = newParent.depth + 1;
    }

    let newSortOrder = sortOrder;
    if (newSortOrder === undefined) {
      const siblings = notes.filter(
        (n) => n.parentId === newParentId && n.id !== id && !n.isTrashed
      );
      newSortOrder =
        siblings.length > 0 ? Math.max(...siblings.map((n) => n.sortOrder)) + 1 : 1;
    }

    notes[idx] = { ...note, parentId: newParentId, depth: newDepth, sortOrder: newSortOrder, updatedAt: now() };

    const updateDescendantDepths = (nodeId: string, baseDepth: number) => {
      const children = notes.filter((n) => n.parentId === nodeId);
      for (const child of children) {
        const childIdx = notes.findIndex((n) => n.id === child.id);
        if (childIdx !== -1) {
          notes[childIdx] = { ...notes[childIdx], depth: baseDepth + 1 };
          updateDescendantDepths(child.id, baseDepth + 1);
        }
      }
    };
    updateDescendantDepths(id, newDepth);

    if (oldParentId) {
      const stillHasChildren = notes.some(
        (n) => n.parentId === oldParentId && !n.isTrashed
      );
      const oldParentIdx = notes.findIndex((n) => n.id === oldParentId);
      if (oldParentIdx !== -1) {
        notes[oldParentIdx] = { ...notes[oldParentIdx], hasChildren: stillHasChildren };
      }
    }

    if (newParentId) {
      const newParentIdx = notes.findIndex((n) => n.id === newParentId);
      if (newParentIdx !== -1) {
        notes[newParentIdx] = { ...notes[newParentIdx], hasChildren: true };
      }
    }

    persist();
  },

  async getDescendantIds(id: string): Promise<string[]> {
    return collectDescendantIds(id, notes);
  },

  async getFavorites(): Promise<Note[]> {
    return notes.filter((n) => n.isPinned && !n.isTrashed && !n.isArchived);
  },

  async search(query: string): Promise<Note[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return notes.filter(
      (n) =>
        !n.isTrashed &&
        !n.isArchived &&
        (n.title.toLowerCase().includes(q) ||
          (n.contentText ?? '').toLowerCase().includes(q))
    );
  },

  async getTrashed(): Promise<Note[]> {
    return notes.filter((n) => n.isTrashed).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async emptyTrash(): Promise<void> {
    notes = notes.filter((n) => !n.isTrashed);
    persist();
  },

  async getBacklinks(noteId: string): Promise<Note[]> {
    return notes.filter((n) => {
      if (n.id === noteId || n.isTrashed) return false;
      if (!n.content) return false;
      return n.content.includes(noteId);
    });
  },

  async getStats(): Promise<{ total: number; favorites: number; trashed: number }> {
    return {
      total: notes.filter((n) => !n.isTrashed && !n.isArchived).length,
      favorites: notes.filter((n) => n.isPinned && !n.isTrashed).length,
      trashed: notes.filter((n) => n.isTrashed).length,
    };
  },
};
