import { useRef, useEffect } from 'react';

const COMMON_EMOJI = [
  '📄', '📝', '📋', '📌', '🔖', '📚', '💡', '🎯', '🔥', '⭐',
  '💻', '🧪', '📊', '🎨', '🏠', '✈️', '🚀', '🌟', '💼', '🔑',
  '📈', '🗂️', '📎', '✅', '❤️', '🧠', '🌱', '🎵', '🏋️', '🍀',
  '🦋', '🌊', '⚡', '🔮', '🎭', '🏆', '💎', '🧩', '🎲', '🔬',
];

interface PageIconPickerProps {
  onSelect: (icon: string | null) => void;
  onClose: () => void;
}

export function PageIconPicker({ onSelect, onClose }: PageIconPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-xl"
      style={{ width: 232 }}
    >
      <div className="grid grid-cols-8 gap-0.5 mb-2">
        {COMMON_EMOJI.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-tertiary)] text-base transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        onClick={() => { onSelect(null); onClose(); }}
        className="w-full px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors text-left"
      >
        Remove icon
      </button>
    </div>
  );
}
