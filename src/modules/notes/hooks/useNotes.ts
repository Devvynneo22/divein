import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/shared/lib/noteService';
import type { CreateNoteInput, UpdateNoteInput, NoteFilter } from '@/shared/types/note';
import { useState, useEffect } from 'react';

const NOTES_KEY = ['notes'] as const;

export function useNotes(filter?: NoteFilter) {
  return useQuery({
    queryKey: [...NOTES_KEY, 'list', filter],
    queryFn: () => noteService.list(filter),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: [...NOTES_KEY, 'single', id],
    queryFn: () => (id ? noteService.get(id) : null),
    enabled: !!id,
  });
}

export function useNoteTree() {
  return useQuery({
    queryKey: [...NOTES_KEY, 'tree'],
    queryFn: () => noteService.getTree(),
  });
}

export function useNoteChildren(parentId: string | null) {
  return useQuery({
    queryKey: [...NOTES_KEY, 'children', parentId],
    queryFn: () => (parentId ? noteService.getChildren(parentId) : noteService.getRootPages()),
    enabled: parentId !== undefined,
  });
}

export function useNoteAncestors(id: string | null) {
  return useQuery({
    queryKey: [...NOTES_KEY, 'ancestors', id],
    queryFn: () => (id ? noteService.getAncestors(id) : Promise.resolve([])),
    enabled: !!id,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: [...NOTES_KEY, 'favorites'],
    queryFn: () => noteService.getFavorites(),
  });
}

export function useTrashedNotes() {
  return useQuery({
    queryKey: [...NOTES_KEY, 'trashed'],
    queryFn: () => noteService.getTrashed(),
  });
}

export function useNoteSearch(query: string) {
  return useQuery({
    queryKey: [...NOTES_KEY, 'search', query],
    queryFn: () => noteService.search(query),
    enabled: query.trim().length > 0,
  });
}

export function useNoteStats() {
  return useQuery({
    queryKey: [...NOTES_KEY, 'stats'],
    queryFn: () => noteService.getStats(),
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => noteService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) =>
      noteService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noteService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useTrashNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noteService.trash(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useRestoreNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noteService.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useMoveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      newParentId,
      sortOrder,
    }: {
      id: string;
      newParentId: string | null;
      sortOrder?: number;
    }) => noteService.moveTo(id, newParentId, sortOrder),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => noteService.emptyTrash(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTES_KEY });
    },
  });
}

// Debounce helper for search
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
