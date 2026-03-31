import { create } from 'zustand';
import { useEffect } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ZenModeState {
  isZen: boolean;
  toggleZen: () => void;
  setZen: (value: boolean) => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useZenModeStore = create<ZenModeState>((set) => ({
  isZen: false,
  toggleZen: () => set((state) => ({ isZen: !state.isZen })),
  setZen: (value: boolean) => set({ isZen: value }),
}));

// ─── Keyboard shortcut hook ──────────────────────────────────────────────────
// Call this hook in any page that should support zen mode toggling via keyboard.
// Alt+Z or Ctrl+Shift+F → toggle zen; Esc → exit zen.

export function useZenShortcut() {
  const toggleZen = useZenModeStore((s) => s.toggleZen);
  const setZen = useZenModeStore((s) => s.setZen);
  const isZen = useZenModeStore((s) => s.isZen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Alt+Z
      if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        toggleZen();
        return;
      }
      // Ctrl+Shift+F
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleZen();
        return;
      }
      // Esc → exit zen (only when zen is active)
      if (e.key === 'Escape' && isZen) {
        setZen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleZen, setZen, isZen]);
}
