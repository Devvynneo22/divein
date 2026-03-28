import { useRef, useEffect, useState } from 'react';

interface EmojiCategory {
  label: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭'],
  },
  {
    label: 'Gestures',
    emojis: ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','👏','🙌','🤲','🤝','🙏'],
  },
  {
    label: 'Objects',
    emojis: ['💻','📱','⌨️','🖥️','🖨️','🖱️','📷','📸','📹','🎥','📽️','📞','☎️','📟','📠','📺','📻','🎙️','📡','🔋','🔌','💡','🔦','🕯️','📝','✏️','🖊️','🖋️','📒','📓','📔','📕','📗','📘','📙','📚','📖','🔖','📌','📎','✂️','🗒️','🗓️','📅','📆','📇','📈','📉','📊'],
  },
  {
    label: 'Nature',
    emojis: ['🌱','🌿','🍀','🌾','🌵','🌲','🌳','🌴','🌸','🌺','🌻','🌹','🌷','🍁','🍂','🍃','🌊','🔥','⭐','🌙','☀️','⚡','❄️','🌈','🌧️','⛅','🌤️'],
  },
  {
    label: 'Symbols',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','✅','❌','⭕','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲'],
  },
  {
    label: 'Activities',
    emojis: ['🎯','🏆','🥇','🥈','🥉','🎖️','🏅','🎗️','🏋️','🤸','🧘','🚴','🏊','🤾','⚽','🏀','🏈','⚾','🥎','🏐','🏉','🎾','🥏','🎱','🏓','🏸','🥊','🎮','🕹️','🎲','🎯','🎳','🎰','🧩'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const displayEmojis = search
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => {
        // naive filter by emoji character string
        return e.includes(search);
      })
    : EMOJI_CATEGORIES[activeCategory]?.emojis ?? [];

  return (
    <div
      ref={ref}
      className="absolute z-50 bottom-full left-0 mb-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl"
      style={{ width: 280 }}
    >
      {/* Search */}
      <div className="p-2 border-b border-[var(--color-border)]">
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-sm rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-[var(--color-border)] overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(idx)}
              className={`px-2 py-1.5 text-xs whitespace-nowrap shrink-0 transition-colors ${
                idx === activeCategory
                  ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">
        {displayEmojis.map((emoji, idx) => (
          <button
            key={`${emoji}-${idx}`}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded text-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            {emoji}
          </button>
        ))}
        {displayEmojis.length === 0 && (
          <div className="col-span-8 text-center text-xs text-[var(--color-text-muted)] py-4">
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
}
