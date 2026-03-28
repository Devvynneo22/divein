import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timerService } from '@/shared/lib/timerService';
import { taskService } from '@/shared/lib/taskService';
import type { CreateTimeEntryInput } from '@/shared/types/timer';

const ENTRIES_KEY = ['timeEntries'] as const;
const RUNNING_KEY = ['timeEntries', 'running'] as const;
const TODAY_KEY = ['timeEntries', 'todayTotal'] as const;

export function useTimeEntries(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: [...ENTRIES_KEY, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => timerService.listEntries(startDate, endDate),
  });
}

export function useRunningEntry() {
  return useQuery({
    queryKey: RUNNING_KEY,
    queryFn: () => timerService.getRunning(),
    refetchInterval: 5000,
  });
}

export function useTodayTotal() {
  return useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => timerService.getTodayTotal(),
    refetchInterval: 10000,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeEntryInput) => timerService.startTimer(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRIES_KEY });
      qc.invalidateQueries({ queryKey: RUNNING_KEY });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerService.stopTimer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRIES_KEY });
      qc.invalidateQueries({ queryKey: RUNNING_KEY });
      qc.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

export function useCreateManualEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeEntryInput) => timerService.createManualEntry(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRIES_KEY });
      qc.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.list({ status: ['inbox', 'todo', 'in_progress'] }),
  });
}

export function useTaskById(id: string | null) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => (id ? taskService.get(id) : null),
    enabled: !!id,
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerService.deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTRIES_KEY });
      qc.invalidateQueries({ queryKey: TODAY_KEY });
    },
  });
}
