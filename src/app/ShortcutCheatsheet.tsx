import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { shortcutService, type ShortcutGroup } from '@/shared/lib/shortcutService';

const GROUP_ORDER: ShortcutGroup[] = ['Global', 'Navigation', 'Tasks', 'Notes', 'Timer'];

export function ShortcutCheatsheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
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
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl max-h-[80vh] overflow-hidden px-4">
        <div
          className="rounded-xl overflow-hidden flex flex-col max-h-[80vh]"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-elevated)',
            boxShadow: 'var(--shadow-popup)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                  <h3
                    className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {group}
                  </h3>
                  <div className="space-y-1">
                    {shortcuts.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg transition-colors"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                          {s.label}
                        </span>
                        <kbd
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono"
                          style={{
                            backgroundColor: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
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
          <div
            className="px-6 py-3 text-[11px] text-center"
            style={{
              borderTop: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            Press{' '}
            <kbd
              className="px-1 py-0.5 rounded font-mono text-[11px]"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
            >?</kbd>{' '}
            or{' '}
            <kbd
              className="px-1 py-0.5 rounded font-mono text-[11px]"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
            >Esc</kbd>{' '}
            to close
          </div>
        </div>
      </div>
    </div>
  );
}
