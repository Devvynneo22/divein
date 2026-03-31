import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // ms, default 3000
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
  success: (message: string, action?: Toast['action']) => void;
  error: (message: string, action?: Toast['action']) => void;
  info: (message: string, action?: Toast['action']) => void;
  warning: (message: string, action?: Toast['action']) => void;
}

const MAX_TOASTS = 4;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  add: (toastInput) => {
    const id = crypto.randomUUID();
    const duration = toastInput.duration ?? 3000;

    set((state) => {
      const current = [...state.toasts];
      // Remove oldest if at max capacity
      if (current.length >= MAX_TOASTS) {
        current.shift();
      }
      return { toasts: [...current, { ...toastInput, id, duration }] };
    });
  },

  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  success: (message, action) => get().add({ type: 'success', message, action }),
  error:   (message, action) => get().add({ type: 'error',   message, action }),
  info:    (message, action) => get().add({ type: 'info',    message, action }),
  warning: (message, action) => get().add({ type: 'warning', message, action }),
}));

// ─── Non-hook convenience export (safe to call outside React) ────────────────

export const toast = {
  success: (message: string, action?: Toast['action']) =>
    useToastStore.getState().success(message, action),
  error: (message: string, action?: Toast['action']) =>
    useToastStore.getState().error(message, action),
  info: (message: string, action?: Toast['action']) =>
    useToastStore.getState().info(message, action),
  warning: (message: string, action?: Toast['action']) =>
    useToastStore.getState().warning(message, action),
};
