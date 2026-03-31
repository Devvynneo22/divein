import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DailyReviewEntry {
  date: string; // YYYY-MM-DD
  completedAt: string; // ISO timestamp
  mood: 1 | 2 | 3 | 4 | 5; // 😫😕😐🙂😄
  wentWell: string;
  toImprove: string;
  tomorrowFocus: string;
  productivityScore: number; // auto-calculated 0-100
  stats: {
    tasksCompleted: number;
    tasksTotal: number;
    habitsCompleted: number;
    habitsTotal: number;
    focusMinutes: number;
    cardsStudied: number;
    notesCreated: number;
  };
}

interface DailyReviewState {
  reviews: DailyReviewEntry[];
  isOpen: boolean;
  addReview: (entry: DailyReviewEntry) => void;
  getReview: (date: string) => DailyReviewEntry | undefined;
  getStreak: () => number;
  hasReviewedToday: () => boolean;
  openModal: () => void;
  closeModal: () => void;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

const MAX_REVIEWS = 90;

export const useDailyReviewStore = create<DailyReviewState>()(
  persist(
    (set, get) => ({
      reviews: [],
      isOpen: false,

      addReview: (entry) => {
        set((state) => {
          const filtered = state.reviews.filter((r) => r.date !== entry.date);
          const updated = [entry, ...filtered].slice(0, MAX_REVIEWS);
          return { reviews: updated };
        });
      },

      getReview: (date) => {
        return get().reviews.find((r) => r.date === date);
      },

      getStreak: () => {
        const { reviews } = get();
        if (reviews.length === 0) return 0;

        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 90; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const hasReview = reviews.some((r) => r.date === dateStr);
          if (hasReview) {
            streak++;
          } else {
            // allow today to be incomplete without breaking streak
            if (i === 0) continue;
            break;
          }
        }

        return streak;
      },

      hasReviewedToday: () => {
        return get().reviews.some((r) => r.date === todayStr());
      },

      openModal: () => set({ isOpen: true }),
      closeModal: () => set({ isOpen: false }),
    }),
    {
      name: 'divein-daily-reviews',
      partialize: (state) => ({ reviews: state.reviews }),
    },
  ),
);
