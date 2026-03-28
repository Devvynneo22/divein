import { Timer, Keyboard } from 'lucide-react';

export function StatusBar() {
  return (
    <div className="flex items-center justify-between h-8 px-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-muted)]">
      {/* Left: Timer */}
      <div className="flex items-center gap-2">
        <Timer size={12} />
        <span>No timer running</span>
      </div>

      {/* Right: Shortcuts hint */}
      <div className="flex items-center gap-2">
        <Keyboard size={12} />
        <span>Ctrl+K: Commands</span>
      </div>
    </div>
  );
}
