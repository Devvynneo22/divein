import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FocusPhase = 'setup' | 'working' | 'break' | 'completed';

export interface FocusSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  startedAt: string;
  completedAt?: string;
  targetMinutes: number;
  actualMinutes: number;
  pomodorosCompleted: number;
  pomodorosTarget: number;
  distractionCount: number;
  notes: string;
}

interface FocusSessionState {
  // Modal visibility (separate from active session)
  isModalOpen: boolean;

  // Active session
  isActive: boolean;
  phase: FocusPhase;
  currentTaskId: string | null;
  currentTaskTitle: string;
  targetMinutes: number;
  pomodorosTarget: number;
  pomodorosCompleted: number;
  elapsedSeconds: number;
  distractionCount: number;
  sessionNotes: string;
  startedAt: string | null;

  // Break state
  breakSeconds: number;
  isBreak: boolean;
  breakElapsed: number;
  isPaused: boolean;

  // Pre-fill from task
  prefilledTaskId: string | null;
  prefilledTaskTitle: string | null;

  // History
  sessions: FocusSession[];

  // Actions
  openModal: (prefill?: { taskId?: string; taskTitle?: string }) => void;
  closeModal: () => void;
  startSession: (config: {
    taskId?: string;
    taskTitle: string;
    targetMinutes: number;
    pomodorosTarget: number;
  }) => void;
  tick: () => void;
  tickBreak: () => void;
  pauseResume: () => void;
  completePomo: () => void;
  startBreak: () => void;
  endBreak: () => void;
  logDistraction: () => void;
  addNote: (note: string) => void;
  completeSession: () => void;
  cancelSession: () => void;

  // Stats
  getTodaySessions: () => FocusSession[];
  getWeeklyMinutes: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useFocusSessionStore = create<FocusSessionState>()(
  persist(
    (set, get) => ({
      isModalOpen: false,
      isActive: false,
      phase: 'setup',
      currentTaskId: null,
      currentTaskTitle: '',
      targetMinutes: 25,
      pomodorosTarget: 4,
      pomodorosCompleted: 0,
      elapsedSeconds: 0,
      distractionCount: 0,
      sessionNotes: '',
      startedAt: null,
      breakSeconds: 0,
      isBreak: false,
      breakElapsed: 0,
      isPaused: false,
      prefilledTaskId: null,
      prefilledTaskTitle: null,
      sessions: [],

      openModal: (prefill) => {
        set({
          isModalOpen: true,
          prefilledTaskId: prefill?.taskId ?? null,
          prefilledTaskTitle: prefill?.taskTitle ?? null,
        });
      },

      closeModal: () => {
        set({ isModalOpen: false, prefilledTaskId: null, prefilledTaskTitle: null });
      },

      startSession: (config) => {
        set({
          isActive: true,
          phase: 'working',
          currentTaskId: config.taskId ?? null,
          currentTaskTitle: config.taskTitle,
          targetMinutes: config.targetMinutes,
          pomodorosTarget: config.pomodorosTarget,
          pomodorosCompleted: 0,
          elapsedSeconds: 0,
          distractionCount: 0,
          sessionNotes: '',
          startedAt: new Date().toISOString(),
          isBreak: false,
          breakElapsed: 0,
          isPaused: false,
        });
      },

      tick: () => {
        const state = get();
        if (!state.isActive || state.phase !== 'working' || state.isPaused) return;
        const newElapsed = state.elapsedSeconds + 1;
        const targetSeconds = state.targetMinutes * 60;

        if (newElapsed >= targetSeconds) {
          // Work phase done — complete a pomo
          const newPomos = state.pomodorosCompleted + 1;
          if (newPomos >= state.pomodorosTarget) {
            set({ elapsedSeconds: targetSeconds, pomodorosCompleted: newPomos, phase: 'completed' });
          } else {
            set({ elapsedSeconds: targetSeconds, pomodorosCompleted: newPomos });
            // Auto-start break
            const breakMin = newPomos % 4 === 0 ? 15 : 5;
            set({
              phase: 'break',
              isBreak: true,
              breakSeconds: breakMin * 60,
              breakElapsed: 0,
            });
          }
        } else {
          set({ elapsedSeconds: newElapsed });
        }
      },

      tickBreak: () => {
        const state = get();
        if (!state.isActive || state.phase !== 'break' || state.isPaused) return;
        const newBreakElapsed = state.breakElapsed + 1;
        if (newBreakElapsed >= state.breakSeconds) {
          // Break over, start next work phase
          get().endBreak();
        } else {
          set({ breakElapsed: newBreakElapsed });
        }
      },

      pauseResume: () => {
        set((s) => ({ isPaused: !s.isPaused }));
      },

      completePomo: () => {
        const state = get();
        const newPomos = state.pomodorosCompleted + 1;
        if (newPomos >= state.pomodorosTarget) {
          set({ pomodorosCompleted: newPomos, phase: 'completed' });
        } else {
          const breakMin = newPomos % 4 === 0 ? 15 : 5;
          set({
            pomodorosCompleted: newPomos,
            phase: 'break',
            isBreak: true,
            breakSeconds: breakMin * 60,
            breakElapsed: 0,
            elapsedSeconds: 0,
          });
        }
      },

      startBreak: () => {
        const state = get();
        const breakMin = (state.pomodorosCompleted % 4 === 0 && state.pomodorosCompleted > 0) ? 15 : 5;
        set({
          phase: 'break',
          isBreak: true,
          breakSeconds: breakMin * 60,
          breakElapsed: 0,
        });
      },

      endBreak: () => {
        set({
          phase: 'working',
          isBreak: false,
          breakElapsed: 0,
          breakSeconds: 0,
          elapsedSeconds: 0,
          isPaused: false,
        });
      },

      logDistraction: () => {
        set((s) => ({ distractionCount: s.distractionCount + 1 }));
      },

      addNote: (note) => {
        set({ sessionNotes: note });
      },

      completeSession: () => {
        const state = get();
        const actualMinutes = Math.round(state.elapsedSeconds / 60);
        const session: FocusSession = {
          id: `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          taskId: state.currentTaskId,
          taskTitle: state.currentTaskTitle,
          startedAt: state.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
          targetMinutes: state.targetMinutes,
          actualMinutes,
          pomodorosCompleted: state.pomodorosCompleted,
          pomodorosTarget: state.pomodorosTarget,
          distractionCount: state.distractionCount,
          notes: state.sessionNotes,
        };
        set((s) => ({
          sessions: [session, ...s.sessions].slice(0, 200),
          isActive: false,
          isModalOpen: false,
          phase: 'setup',
          currentTaskId: null,
          currentTaskTitle: '',
          elapsedSeconds: 0,
          pomodorosCompleted: 0,
          distractionCount: 0,
          sessionNotes: '',
          startedAt: null,
          isPaused: false,
        }));
      },

      cancelSession: () => {
        set({
          isActive: false,
          isModalOpen: false,
          phase: 'setup',
          currentTaskId: null,
          currentTaskTitle: '',
          elapsedSeconds: 0,
          pomodorosCompleted: 0,
          distractionCount: 0,
          sessionNotes: '',
          startedAt: null,
          isPaused: false,
          isBreak: false,
          breakElapsed: 0,
        });
      },

      getTodaySessions: () => {
        const state = get();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return state.sessions.filter((s) => new Date(s.startedAt) >= todayStart);
      },

      getWeeklyMinutes: () => {
        const state = get();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        return state.sessions
          .filter((s) => new Date(s.startedAt) >= weekStart)
          .reduce((sum, s) => sum + s.actualMinutes, 0);
      },
    }),
    {
      name: 'divein-focus-sessions',
      partialize: (state) => ({
        sessions: state.sessions,
      }),
    },
  ),
);
