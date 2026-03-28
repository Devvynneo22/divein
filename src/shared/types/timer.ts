/**
 * Timer / Pomodoro type definitions.
 * Mirrors the `time_entries` Drizzle schema.
 */

export interface TimeEntry {
  id: string;
  taskId: string | null;
  projectId: string | null;
  description: string | null;
  startTime: string; // ISO 8601
  endTime: string | null; // ISO 8601
  durationSec: number | null;
  isPomodoro: boolean;
  isRunning: boolean;
  createdAt: string;
}

export interface CreateTimeEntryInput {
  taskId?: string;
  projectId?: string;
  description?: string;
  startTime?: string; // ISO 8601 — defaults to now
  endTime?: string;
  durationSec?: number;
  isPomodoro?: boolean;
}

export interface UpdateTimeEntryInput {
  taskId?: string | null;
  projectId?: string | null;
  description?: string | null;
  startTime?: string;
  endTime?: string | null;
  durationSec?: number | null;
  isPomodoro?: boolean;
  isRunning?: boolean;
}

export interface PomodoroSettings {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakAfter: number;
  autoStartBreak: boolean;
  autoStartWork: boolean;
  audioEnabled: boolean;
}

export type PomodoroPhase = 'work' | 'short_break' | 'long_break';

export interface TimerState {
  isRunning: boolean;
  phase: PomodoroPhase;
  secondsRemaining: number;
  pomodoroCount: number;
  currentEntryId: string | null;
}
