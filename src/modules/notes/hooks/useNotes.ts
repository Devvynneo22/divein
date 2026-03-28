import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/shared/lib/noteService';
import type { CreateNoteInput, UpdateNoteInput, NoteFilter } from '@/shared/types/note';

const NOTES_KEY = ['notes'] as const;

export function useNotes(filter?: NoteFilter) {
  return useQuery({
    queryKey: [...NOTES_KEY, filter],
    queryFn: () => noteService.list(filter),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: [...NOTES_KEY, id],
    queryFn: () => (id ? noteService.get(id) : null),
    enabled: !!id,
  });
}

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
