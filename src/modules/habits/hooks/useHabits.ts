import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { habitService } from '@/shared/lib/habitService';
import type { CreateHabitInput, UpdateHabitInput } from '@/shared/types/habit';

const HABITS_KEY = ['habits'] as const;
const TODAY_KEY = ['habits', 'today'] as const;

export function useHabits() {
  return useQuery({
    queryKey: HABITS_KEY,
    queryFn: () => habitService.list(),
  });
}

export function useHabit(id: string) {
  return useQuery({
    queryKey: [...HABITS_KEY, id],
    queryFn: () => habitService.get(id),
    enabled: !!id,
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => habitService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
    },
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitInput }) =>
      habitService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
    },
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      date,
      value,
      note,
    }: {
      habitId: string;
      date: string;
      value?: number;
      note?: string;
    }) => habitService.checkIn(habitId, date, value, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
    },
  });
}

export function useUncheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      habitService.uncheckIn(habitId, date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: HABITS_KEY });
    },
  });
}

export function useHabitEntries(
  habitId: string,
  startDate?: string,
  endDate?: string,
) {
  return useQuery({
    queryKey: [...HABITS_KEY, 'entries', habitId, startDate, endDate],
    queryFn: () => habitService.getEntries(habitId, startDate, endDate),
    enabled: !!habitId,
  });
}

export function useTodayStatus() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => habitService.getTodayStatus(),
  });
}
