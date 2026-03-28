import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { shortcutService, type ShortcutGroup } from '@/shared/lib/shortcutService';

const GROUP_ORDER: ShortcutGroup[] = ['Global', 'Navigation', 'Tasks', 'Notes', 'Timer'];

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Open on '?' when not typing in an input
      if (
        e.key === '?' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // Close on Escape
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const grouped = shortcutService.getGrouped();

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 space-y-6">
            {GROUP_ORDER.map((group) => {
              const shortcuts = grouped[group];
              if (!shortcuts || shortcuts.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {shortcuts.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
                      >
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {s.label}
                        </span>
                        <kbd className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-text-primary)]">
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] font-mono text-[10px]">?</kbd> or <kbd className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] font-mono text-[10px]">Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
