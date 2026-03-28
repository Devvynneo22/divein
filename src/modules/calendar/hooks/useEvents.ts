import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/shared/lib/eventService';
import type { CreateEventInput, UpdateEventInput } from '@/shared/types/event';

const EVENTS_KEY = ['events'] as const;

export function useEvents(start?: string, end?: string) {
  return useQuery({
    queryKey: [...EVENTS_KEY, start, end],
    queryFn: () => eventService.list(start, end),
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventService.create(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: EVENTS_KEY }); },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventInput }) =>
      eventService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: EVENTS_KEY }); },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: EVENTS_KEY }); },
  });
}
