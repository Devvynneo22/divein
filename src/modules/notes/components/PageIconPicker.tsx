import { useRef, useEffect, useState } from 'react';

// ─── Emoji data ───────────────────────────────────────────────────────────────

interface EmojiEntry {
  emoji: string;
  name: string;
}

interface EmojiCategory {
  label: string;
  emojis: EmojiEntry[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Documents',
    emojis: [
      { emoji: '📄', name: 'document page' },
      { emoji: '📝', name: 'memo write note' },
      { emoji: '📋', name: 'clipboard' },
      { emoji: '📌', name: 'pushpin pin' },
      { emoji: '🔖', name: 'bookmark' },
      { emoji: '📚', name: 'books library' },
      { emoji: '📖', name: 'open book read' },
      { emoji: '📜', name: 'scroll parchment' },
      { emoji: '📃', name: 'page curl' },
      { emoji: '📑', name: 'pages bookmark' },
      { emoji: '🗒️', name: 'spiral notepad' },
      { emoji: '🗓️', name: 'spiral calendar' },
      { emoji: '📅', name: 'calendar date' },
      { emoji: '📆', name: 'calendar tear-off' },
      { emoji: '📇', name: 'card index' },
      { emoji: '📈', name: 'chart increasing growth' },
      { emoji: '📉', name: 'chart decreasing' },
      { emoji: '📊', name: 'bar chart statistics' },
    ],
  },
  {
    label: 'Productivity',
    emojis: [
      { emoji: '💡', name: 'lightbulb idea' },
      { emoji: '🎯', name: 'target goal focus' },
      { emoji: '🔥', name: 'fire hot trending' },
      { emoji: '⭐', name: 'star favorite' },
      { emoji: '✅', name: 'check done complete' },
      { emoji: '💼', name: 'briefcase work' },
      { emoji: '🔑', name: 'key access' },
      { emoji: '🧠', name: 'brain think' },
      { emoji: '⚡', name: 'lightning bolt fast' },
      { emoji: '🔨', name: 'hammer build' },
      { emoji: '🔧', name: 'wrench fix' },
      { emoji: '⚙️', name: 'gear settings' },
      { emoji: '🗂️', name: 'file folder tabs' },
      { emoji: '📎', name: 'paperclip attach' },
      { emoji: '✂️', name: 'scissors cut' },
      { emoji: '🖊️', name: 'pen write' },
      { emoji: '🖋️', name: 'fountain pen' },
      { emoji: '📐', name: 'ruler triangle' },
    ],
  },
  {
    label: 'Nature',
    emojis: [
      { emoji: '🌱', name: 'seedling plant grow' },
      { emoji: '🌿', name: 'herb leaf green' },
      { emoji: '🌸', name: 'cherry blossom flower' },
      { emoji: '🌺', name: 'hibiscus flower red' },
      { emoji: '🌻', name: 'sunflower yellow' },
      { emoji: '🍀', name: 'clover luck' },
      { emoji: '🦋', name: 'butterfly nature' },
      { emoji: '🌊', name: 'wave ocean water' },
      { emoji: '🌙', name: 'crescent moon night' },
      { emoji: '🌈', name: 'rainbow colorful' },
      { emoji: '🌟', name: 'glowing star shine' },
      { emoji: '✨', name: 'sparkles magic' },
      { emoji: '🌍', name: 'earth globe world' },
      { emoji: '🌲', name: 'evergreen tree' },
      { emoji: '🌴', name: 'palm tree tropical' },
      { emoji: '🍃', name: 'leaves wind nature' },
    ],
  },
  {
    label: 'Food',
    emojis: [
      { emoji: '🍕', name: 'pizza slice' },
      { emoji: '🍔', name: 'burger hamburger' },
      { emoji: '🍦', name: 'soft ice cream' },
      { emoji: '🍩', name: 'donut doughnut' },
      { emoji: '🍎', name: 'red apple fruit' },
      { emoji: '🥑', name: 'avocado green' },
      { emoji: '🧁', name: 'cupcake cake' },
      { emoji: '☕', name: 'coffee hot drink' },
      { emoji: '🍵', name: 'tea cup' },
      { emoji: '🥝', name: 'kiwi fruit' },
      { emoji: '🍇', name: 'grapes fruit' },
      { emoji: '🍓', name: 'strawberry red' },
      { emoji: '🥐', name: 'croissant pastry' },
      { emoji: '🍰', name: 'cake slice dessert' },
      { emoji: '🍜', name: 'noodles ramen soup' },
      { emoji: '🍣', name: 'sushi japanese' },
    ],
  },
  {
    label: 'People',
    emojis: [
      { emoji: '👋', name: 'wave hello' },
      { emoji: '🤝', name: 'handshake deal partner' },
      { emoji: '👏', name: 'clap applause' },
      { emoji: '🙌', name: 'hands up celebrate' },
      { emoji: '💪', name: 'muscle strong flexing' },
      { emoji: '🧑‍💻', name: 'developer coder programmer' },
      { emoji: '🧑‍🎨', name: 'artist creative' },
      { emoji: '🧑‍🔬', name: 'scientist researcher' },
      { emoji: '🧑‍💼', name: 'worker professional business' },
      { emoji: '👁️', name: 'eye vision look' },
      { emoji: '🧘', name: 'meditate yoga calm' },
      { emoji: '🏋️', name: 'workout gym fitness' },
      { emoji: '🤸', name: 'gymnastics exercise sport' },
      { emoji: '💃', name: 'dance music fun' },
    ],
  },
  {
    label: 'Symbols',
    emojis: [
      { emoji: '💎', name: 'diamond gem precious' },
      { emoji: '🏆', name: 'trophy winner award' },
      { emoji: '🎭', name: 'theater drama mask' },
      { emoji: '🎨', name: 'art palette paint' },
      { emoji: '🎵', name: 'music note song' },
      { emoji: '🎬', name: 'movie clapper film' },
      { emoji: '🎮', name: 'game controller gaming' },
      { emoji: '🎲', name: 'dice game random' },
      { emoji: '🧩', name: 'puzzle piece' },
      { emoji: '🚀', name: 'rocket launch space' },
      { emoji: '✈️', name: 'airplane travel fly' },
      { emoji: '🏠', name: 'house home' },
      { emoji: '🔮', name: 'crystal ball magic' },
      { emoji: '💫', name: 'dizzy star sparkle' },
      { emoji: '🌀', name: 'cyclone spiral swirl' },
      { emoji: '🧲', name: 'magnet attract' },
      { emoji: '🔬', name: 'microscope science research' },
      { emoji: '🎪', name: 'circus tent fun' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface PageIconPickerProps {
  onSelect: (icon: string | null) => void;
  onClose: () => void;
}

export function PageIconPicker({ onSelect, onClose }: PageIconPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'emoji' | 'upload'>('emoji');
  const [search, setSearch] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Filter emojis by search
  const searchLower = search.toLowerCase().trim();
  const filteredCategories = EMOJI_CATEGORIES.map((cat) => ({
    ...cat,
    emojis: searchLower
      ? cat.emojis.filter((e) => e.name.toLowerCase().includes(searchLower) || e.emoji === searchLower)
      : cat.emojis,
  })).filter((cat) => cat.emojis.length > 0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setPreviewUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function applyPreview() {
    if (previewUrl) {
      onSelect(previewUrl);
      onClose();
    }
  }

  function applyUrl() {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onSelect(trimmed);
      onClose();
    }
  }

  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: '6px 0',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderRadius: 5,
    transition: 'all 0.1s',
    color: 'var(--color-text-secondary)',
  };
  const tabActive: React.CSSProperties = {
    ...tabBase,
    backgroundColor: 'var(--color-accent-soft)',
    color: 'var(--color-accent)',
    fontWeight: 600,
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        zIndex: 50,
        width: 300,
        maxHeight: 420,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-elevated)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar + Remove */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 8px 4px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', flex: 1, gap: 2, backgroundColor: 'var(--color-bg-tertiary)', borderRadius: 7, padding: 2 }}>
          <button
            style={activeTab === 'emoji' ? tabActive : tabBase}
            onClick={() => setActiveTab('emoji')}
          >
            😀 Emoji
          </button>
          <button
            style={activeTab === 'upload' ? tabActive : tabBase}
            onClick={() => setActiveTab('upload')}
          >
            🖼️ Upload
          </button>
        </div>
        <button
          onClick={() => { onSelect(null); onClose(); }}
          style={{
            fontSize: 11,
            padding: '5px 8px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-danger, #ef4444)';
            e.currentTarget.style.color = 'var(--color-danger, #ef4444)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          Remove
        </button>
      </div>

      {/* Emoji tab */}
      {activeTab === 'emoji' && (
        <>
          {/* Search input */}
          <div style={{ padding: '4px 8px 6px', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search emoji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: 12,
                padding: '5px 9px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>

          {/* Emoji grid (scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 8px' }}>
            {filteredCategories.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                No emojis found
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.label} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '4px 2px 3px',
                    }}
                  >
                    {cat.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1 }}>
                    {cat.emojis.map((entry) => (
                      <button
                        key={entry.emoji}
                        title={entry.name}
                        onClick={() => { onSelect(entry.emoji); onClose(); }}
                        style={{
                          width: 30,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'none',
                          borderRadius: 5,
                          cursor: 'pointer',
                          fontSize: 17,
                          lineHeight: 1,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {entry.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Upload tab */}
      {activeTab === 'upload' && (
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* File upload */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Upload image
            </div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                width: '100%',
                boxSizing: 'border-box',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              📁 Choose image file
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--color-border)',
                }}
              />
              <button
                onClick={applyPreview}
                style={{
                  padding: '6px 18px',
                  borderRadius: 7,
                  border: 'none',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Use this image
              </button>
            </div>
          )}

          {/* URL input */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Image URL
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="url"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }}
                style={{
                  flex: 1,
                  fontSize: 12,
                  padding: '6px 9px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  minWidth: 0,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <button
                onClick={applyUrl}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: 'var(--color-accent)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
