import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/shared/types/task';
import type { HabitWithStatus } from '@/shared/types/habit';
import type { CalendarEvent } from '@/shared/types/event';
import type { Project } from '@/shared/types/project';

export type SuggestionType =
  | 'overdue_tasks'
  | 'habit_at_risk'
  | 'focus_reminder'
  | 'review_prompt'
  | 'streak_celebration'
  | 'due_today'
  | 'flashcards_due'
  | 'idle_project'
  | 'weekly_summary';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionRoute?: string;
  dismissedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SuggestionContext {
  tasks: Task[];
  habits: HabitWithStatus[];
  events: CalendarEvent[];
  flashcardsDueToday: number;
  focusMinutesToday: number;
  projects: Project[];
}

// ─── Pure generation function ─────────────────────────────────────────────────

function generateSuggestionsFromContext(ctx: SuggestionContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // 1. Overdue tasks
  const overdue = ctx.tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < todayStr &&
      t.status !== 'done' &&
      t.status !== 'cancelled',
  );
  if (overdue.length > 0) {
    suggestions.push({
      id: 'overdue_tasks',
      type: 'overdue_tasks',
      title: `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`,
      description:
        overdue.length === 1
          ? `"${overdue[0].title}" is past due`
          : `Including "${overdue[0].title}" and ${overdue.length - 1} more`,
      icon: '⚠️',
      priority: 'high',
      actionLabel: 'View Tasks',
      actionRoute: '/tasks',
      createdAt: now.toISOString(),
    });
  }

  // 2. Due today reminder (morning hours only)
  const dueToday = ctx.tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate.startsWith(todayStr) &&
      t.status !== 'done' &&
      t.status !== 'cancelled',
  );
  if (dueToday.length > 0 && now.getHours() < 12) {
    suggestions.push({
      id: 'due_today',
      type: 'due_today',
      title: `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`,
      description: `Start with "${dueToday[0].title}"`,
      icon: '📋',
      priority: 'medium',
      actionLabel: 'Focus on Today',
      actionRoute: '/tasks',
      createdAt: now.toISOString(),
    });
  }

  // 3. Habit streak at risk (evening check)
  if (now.getHours() >= 18) {
    const atRisk = ctx.habits.find((h) => !h.isCompletedToday);
    if (atRisk) {
      suggestions.push({
        id: `habit_at_risk_${atRisk.id}`,
        type: 'habit_at_risk',
        title: `Don't break your streak!`,
        description: `"${atRisk.name}" hasn't been checked in today`,
        icon: '🔥',
        priority: 'medium',
        actionLabel: 'Check In',
        actionRoute: '/habits',
        createdAt: now.toISOString(),
      });
    }
  }

  // 4. Flashcards due
  if (ctx.flashcardsDueToday > 0) {
    suggestions.push({
      id: 'flashcards_due',
      type: 'flashcards_due',
      title: `${ctx.flashcardsDueToday} flashcard${ctx.flashcardsDueToday > 1 ? 's' : ''} due for review`,
      description: 'Keep your spaced repetition streak going',
      icon: '🃏',
      priority: 'low',
      actionLabel: 'Study Now',
      actionRoute: '/flashcards',
      createdAt: now.toISOString(),
    });
  }

  // 5. Focus reminder (afternoon with no focus time)
  if (ctx.focusMinutesToday === 0 && now.getHours() >= 14) {
    suggestions.push({
      id: 'focus_reminder',
      type: 'focus_reminder',
      title: 'No focus time today',
      description: 'Try a 25-minute Pomodoro session',
      icon: '⏱️',
      priority: 'low',
      actionLabel: 'Start Timer',
      actionRoute: '/timer',
      createdAt: now.toISOString(),
    });
  }

  // 6. Streak celebration — check for milestones
  const milestones = [7, 14, 30, 60, 100];
  for (const h of ctx.habits) {
    if (milestones.includes(h.streak) && h.isCompletedToday) {
      suggestions.push({
        id: `streak_celebration_${h.id}_${h.streak}`,
        type: 'streak_celebration',
        title: `🎉 ${h.streak}-day streak!`,
        description: `Amazing! You've kept up "${h.name}" for ${h.streak} days straight`,
        icon: '🏆',
        priority: 'medium',
        actionLabel: 'View Habits',
        actionRoute: '/habits',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      break; // one celebration at a time
    }
  }

  // 7. Idle projects (active with no task completions in 7+ days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activeProjects = ctx.projects.filter((p) => p.status === 'active');
  for (const project of activeProjects) {
    const projectTasks = ctx.tasks.filter((t) => t.projectId === project.id);
    if (projectTasks.length === 0) continue;
    const hasRecentCompletion = projectTasks.some(
      (t) => t.status === 'done' && t.completedAt && t.completedAt >= sevenDaysAgo,
    );
    if (!hasRecentCompletion) {
      suggestions.push({
        id: `idle_project_${project.id}`,
        type: 'idle_project',
        title: `"${project.name}" needs attention`,
        description: 'No tasks completed in 7+ days. Keep the momentum going!',
        icon: '📦',
        priority: 'low',
        actionLabel: 'View Project',
        actionRoute: `/projects/${project.id}`,
        createdAt: now.toISOString(),
      });
      break; // only one idle project suggestion at a time
    }
  }

  return suggestions;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SuggestionState {
  suggestions: Suggestion[];
  dismissedIds: string[];
  generateSuggestions: (context: SuggestionContext) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  getActive: () => Suggestion[];
}

export const useSuggestionStore = create<SuggestionState>()(
  persist(
    (set, get) => ({
      suggestions: [],
      dismissedIds: [],

      generateSuggestions: (context: SuggestionContext) => {
        const now = new Date();
        const generated = generateSuggestionsFromContext(context);
        const { dismissedIds } = get();

        // Filter out dismissed and expired
        const active = generated.filter((s) => {
          if (dismissedIds.includes(s.id)) return false;
          if (s.expiresAt && new Date(s.expiresAt) < now) return false;
          return true;
        });

        set({ suggestions: active });
      },

      dismiss: (id: string) => {
        set((state) => ({
          dismissedIds: [...new Set([...state.dismissedIds, id])],
          suggestions: state.suggestions.filter((s) => s.id !== id),
        }));
      },

      dismissAll: () => {
        set((state) => ({
          dismissedIds: [
            ...new Set([...state.dismissedIds, ...state.suggestions.map((s) => s.id)]),
          ],
          suggestions: [],
        }));
      },

      getActive: () => {
        const { suggestions, dismissedIds } = get();
        const now = new Date();
        return suggestions
          .filter((s) => {
            if (dismissedIds.includes(s.id)) return false;
            if (s.expiresAt && new Date(s.expiresAt) < now) return false;
            return true;
          })
          .sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
          });
      },
    }),
    {
      name: 'divein-suggestions',
      partialize: (state) => ({ dismissedIds: state.dismissedIds }),
    },
  ),
);
