import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/shared/lib/projectService';
import { taskService } from '@/shared/lib/taskService';
import { noteService } from '@/shared/lib/noteService';
import type { CreateProjectInput, UpdateProjectInput } from '@/shared/types/project';

const PROJECTS_KEY = ['projects'] as const;

export function useProjects(includeArchived = false) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, { includeArchived }],
    queryFn: () => projectService.list(includeArchived),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    queryFn: () => projectService.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      projectService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useUnarchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.unarchive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export function useProjectStats(id: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id, 'stats'],
    queryFn: () => projectService.getStats(id),
    enabled: !!id,
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', { projectId }],
    queryFn: () => taskService.list({ projectId }),
    enabled: !!projectId,
  });
}

export function useProjectNotes(projectId: string) {
  return useQuery({
    queryKey: ['notes', { projectId }],
    queryFn: async () => {
      const all = await noteService.list({ projectId });
      // noteService may not apply projectId filter in-memory; filter client-side as fallback
      return all.filter((n) => n.projectId === projectId);
    },
    enabled: !!projectId,
  });
}
