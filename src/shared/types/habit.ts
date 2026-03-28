export type HabitFrequency =
  | { type: 'daily' }
  | { type: 'weekly'; days: number[] } // 0=Sun, 1=Mon, ... 6=Sat
  | { type: 'xPerWeek'; times: number };

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  frequency: HabitFrequency;
  groupName: string | null;
  target: number; // 1 for boolean, N for measurable
  unit: string | null; // null = boolean habit
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  value: number; // 1 for boolean, actual value for measurable
  note: string | null;
  createdAt: string;
}

export interface CreateHabitInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  frequency?: HabitFrequency;
  groupName?: string;
  target?: number;
  unit?: string;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  frequency?: HabitFrequency;
  groupName?: string | null;
  target?: number;
  unit?: string | null;
  isArchived?: boolean;
  sortOrder?: number;
}

export interface HabitWithStatus extends Habit {
  todayEntry: HabitEntry | null;
  streak: number;
  isCompletedToday: boolean;
}
