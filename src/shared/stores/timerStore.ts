import { create } from 'zustand';
import type { PomodoroPhase, PomodoroSettings } from '@/shared/types/timer';
import { playWorkCompleteTone, playBreakCompleteTone } from '@/shared/lib/audioNotification';

const SETTINGS_KEY = 'nexus-timer-settings';

function loadSettings(): PomodoroSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function persistSettings(settings: PomodoroSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakAfter: 4,
  autoStartBreak: false,
  autoStartWork: false,
  audioEnabled: true,
};

interface TimerStore {
  // ─── State ─────────────────────────────────────────────────────────────────
  isRunning: boolean;
  isPomodoroMode: boolean;
  phase: PomodoroPhase;
  secondsElapsed: number; // stopwatch mode
  secondsRemaining: number; // pomodoro mode
  pomodoroCount: number;
  currentEntryId: string | null;
  settings: PomodoroSettings;
  /** Epoch ms when the current run started — used to avoid drift */
  _startEpoch: number | null;
  /** Seconds elapsed at the moment the timer last started (stopwatch resume) */
  _baseElapsed: number;
  /** Seconds remaining at the moment the timer last started (pomodoro resume) */
  _baseRemaining: number;

  // ─── Actions ────────────────────────────────────────────────────────────────
  startStopwatch: (entryId: string) => void;
  startPomodoro: (entryId: string) => void;
  resumeRun: () => void; // internal: mark as running with current epoch
  stop: () => void;
  tick: () => void;
  skipPhase: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPomodoroMode: false,
  phase: 'work',
  secondsElapsed: 0,
  secondsRemaining: loadSettings().workMin * 60,
  pomodoroCount: 0,
  currentEntryId: null,
  settings: loadSettings(),
  _startEpoch: null,
  _baseElapsed: 0,
  _baseRemaining: loadSettings().workMin * 60,

  startStopwatch: (entryId) => {
    set({
      isRunning: true,
      isPomodoroMode: false,
      secondsElapsed: 0,
      _baseElapsed: 0,
      _startEpoch: Date.now(),
      currentEntryId: entryId,
    });
  },

  startPomodoro: (entryId) => {
    const { settings } = get();
    const remaining = settings.workMin * 60;
    set({
      isRunning: true,
      isPomodoroMode: true,
      phase: 'work',
      secondsRemaining: remaining,
      _baseRemaining: remaining,
      _startEpoch: Date.now(),
      currentEntryId: entryId,
    });
  },

  resumeRun: () => {
    const { secondsElapsed, secondsRemaining, isPomodoroMode } = get();
    set({
      isRunning: true,
      _startEpoch: Date.now(),
      _baseElapsed: secondsElapsed,
      _baseRemaining: isPomodoroMode ? secondsRemaining : 0,
    });
  },

  stop: () => {
    set({
      isRunning: false,
      _startEpoch: null,
      secondsElapsed: 0,
      _baseElapsed: 0,
      secondsRemaining: get().settings.workMin * 60,
      _baseRemaining: get().settings.workMin * 60,
      phase: 'work',
      currentEntryId: null,
    });
  },

  tick: () => {
    const {
      isRunning,
      isPomodoroMode,
      _startEpoch,
      _baseElapsed,
      _baseRemaining,
      phase,
      pomodoroCount,
      settings,
    } = get();

    if (!isRunning || _startEpoch === null) return;

    const elapsed = Math.round((Date.now() - _startEpoch) / 1000);

    if (!isPomodoroMode) {
      // Stopwatch — count up
      set({ secondsElapsed: _baseElapsed + elapsed });
      return;
    }

    // Pomodoro — count down
    const remaining = _baseRemaining - elapsed;

    if (remaining > 0) {
      set({ secondsRemaining: remaining });
      return;
    }

    // Phase complete — transition
    let nextPhase: PomodoroPhase;
    let nextPomodoroCount = pomodoroCount;

    if (phase === 'work') {
      nextPomodoroCount = pomodoroCount + 1;
      if (nextPomodoroCount % settings.longBreakAfter === 0) {
        nextPhase = 'long_break';
      } else {
        nextPhase = 'short_break';
      }
    } else {
      nextPhase = 'work';
    }

    const nextRemaining =
      nextPhase === 'work'
        ? settings.workMin * 60
        : nextPhase === 'short_break'
          ? settings.shortBreakMin * 60
          : settings.longBreakMin * 60;

    const shouldAutoStart =
      (nextPhase !== 'work' && settings.autoStartBreak) ||
      (nextPhase === 'work' && settings.autoStartWork);

    // Play audio notification on phase transition
    if (settings.audioEnabled) {
      if (phase === 'work') {
        playWorkCompleteTone();
      } else {
        playBreakCompleteTone();
      }
    }

    set({
      phase: nextPhase,
      pomodoroCount: nextPomodoroCount,
      secondsRemaining: nextRemaining,
      _baseRemaining: nextRemaining,
      _startEpoch: shouldAutoStart ? Date.now() : null,
      isRunning: shouldAutoStart,
    });
  },

  skipPhase: () => {
    const { phase, pomodoroCount, settings, isRunning } = get();
    let nextPhase: PomodoroPhase;
    let nextPomodoroCount = pomodoroCount;

    if (phase === 'work') {
      nextPomodoroCount = pomodoroCount + 1;
      nextPhase =
        nextPomodoroCount % settings.longBreakAfter === 0 ? 'long_break' : 'short_break';
    } else {
      nextPhase = 'work';
    }

    const nextRemaining =
      nextPhase === 'work'
        ? settings.workMin * 60
        : nextPhase === 'short_break'
          ? settings.shortBreakMin * 60
          : settings.longBreakMin * 60;

    set({
      phase: nextPhase,
      pomodoroCount: nextPomodoroCount,
      secondsRemaining: nextRemaining,
      _baseRemaining: nextRemaining,
      _startEpoch: isRunning ? Date.now() : null,
    });
  },

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    persistSettings(next);
    set({ settings: next });
    // If not running, update the displayed remaining to reflect new work duration
    if (!get().isRunning && get().phase === 'work') {
      set({ secondsRemaining: next.workMin * 60, _baseRemaining: next.workMin * 60 });
    }
  },

  reset: () => {
    const { settings } = get();
    set({
      isRunning: false,
      phase: 'work',
      secondsElapsed: 0,
      secondsRemaining: settings.workMin * 60,
      pomodoroCount: 0,
      currentEntryId: null,
      _startEpoch: null,
      _baseElapsed: 0,
      _baseRemaining: settings.workMin * 60,
    });
  },
}));
