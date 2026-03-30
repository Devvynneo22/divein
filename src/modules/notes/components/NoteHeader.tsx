import { useState, useRef, useEffect } from 'react';
import { FileText, MoreHorizontal, FileDown, FileType } from 'lucide-react';

// ─── IconAvatar ───────────────────────────────────────────────────────────────

function IconAvatar({ icon, onClick }: { icon: string | null; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isImage = icon ? (icon.startsWith('data:') || icon.startsWith('http')) : false;

  return (
    <button
      onClick={onClick}
      title="Change icon"
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: '3px solid var(--color-bg-primary, #fff)',
        backgroundColor: 'var(--color-bg-tertiary)',
        cursor: 'pointer',
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        flexShrink: 0,
        outline: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isImage ? (
        <img
          src={icon!}
          alt="page icon"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : icon ? (
        <span style={{ fontSize: 36, lineHeight: 1, userSelect: 'none' }}>{icon}</span>
      ) : (
        <FileText size={34} style={{ color: 'var(--color-text-muted)' }} />
      )}

      {/* Hover overlay */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span style={{ fontSize: 14 }}>✏️</span>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, letterSpacing: '0.02em' }}>Edit</span>
        </div>
      )}
    </button>
  );
}
import { format } from 'date-fns';
import { PageIconPicker } from './PageIconPicker';
import { exportNoteToMarkdown, exportNoteToPDF } from '@/shared/lib/exportService';
import type { Note } from '@/shared/types/note';

// ─── Cover presets ────────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
  { name: 'Aurora',   value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Sunset',   value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean',    value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Forest',   value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Dusk',     value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)' },
  { name: 'Peach',    value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { name: 'Cool',     value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { name: 'Warm',     value: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { name: 'Steel',    value: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)' },
  { name: 'Emerald',  value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
];

const COVER_COLORS = [
  '#f1f5f9', '#e2e8f0', '#fef3c7', '#dcfce7',
  '#dbeafe', '#f3e8ff', '#fce7f3', '#fff7ed',
];

// ─── CoverBanner ─────────────────────────────────────────────────────────────

function CoverBanner({
  cover,
  isImage,
  height,
  onChangeCover,
  onRemoveCover,
}: {
  cover: string;
  isImage: boolean;
  height: number;
  onChangeCover: () => void;
  onRemoveCover: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        width: '100%',
        height,
        position: 'relative',
        ...(isImage
          ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { background: cover }
        ),
        flexShrink: 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div style={{ position: 'absolute', bottom: 10, right: 16, display: 'flex', gap: 6 }}>
          {[
            { label: 'Change cover', onClick: onChangeCover },
            { label: 'Remove', onClick: onRemoveCover },
          ].map(({ label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: '#fff',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.75)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.55)'; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CoverPickerModal ─────────────────────────────────────────────────────────

function CoverPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (cover: string) => void;
  onClose: () => void;
}) {
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          padding: 24,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Add cover</span>
          <button
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Gradients */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Gradients
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {COVER_GRADIENTS.map((g) => (
              <button
                key={g.name}
                onClick={() => onSelect(g.value)}
                title={g.name}
                style={{
                  height: 36,
                  borderRadius: 6,
                  border: '2px solid transparent',
                  background: g.value,
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
            ))}
          </div>
        </div>

        {/* Solid colors */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Solid colors
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {COVER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onSelect(c)}
                style={{
                  height: 28,
                  borderRadius: 5,
                  border: '2px solid var(--color-border)',
                  backgroundColor: c,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
            ))}
          </div>
        </div>

        {/* Upload image */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Upload image
          </div>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 7,
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-tertiary)',
              cursor: 'pointer',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            📁 Choose image
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl) onSelect(dataUrl);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        {/* URL input */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Image URL
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="url"
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && urlInput.trim()) onSelect(urlInput.trim());
              }}
              style={{
                flex: 1,
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 7,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <button
              onClick={() => { if (urlInput.trim()) onSelect(urlInput.trim()); }}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: 'none',
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NoteHeader ───────────────────────────────────────────────────────────────

interface NoteHeaderProps {
  note: Note;
  childCount: number;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string | null) => void;
  onCoverChange: (cover: string | null) => void;
}

export function NoteHeader({ note, childCount, onTitleChange, onIconChange, onCoverChange }: NoteHeaderProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [localTitle, setLocalTitle] = useState(note.title);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync title when note changes
  useEffect(() => {
    setLocalTitle(note.title);
  }, [note.id, note.title]);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function handler(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  function handleTitleChange(value: string) {
    setLocalTitle(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim()) onTitleChange(value.trim());
    }, 400);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }

  const isImageCover = note.coverColor
    ? note.coverColor.startsWith('http') ||
      note.coverColor.startsWith('data:') ||
      note.coverColor.startsWith('/')
    : false;
  const coverHeight = isImageCover ? 220 : 120;

  return (
    <div style={{ width: '100%' }}>
      {/* Cover banner */}
      {note.coverColor ? (
        <CoverBanner
          cover={note.coverColor}
          isImage={isImageCover}
          height={coverHeight}
          onChangeCover={() => setShowCoverPicker(true)}
          onRemoveCover={() => onCoverChange(null)}
        />
      ) : null}

      {/* Page content */}
      <div
        className="pb-6 w-full"
        style={{
          paddingTop: note.coverColor ? 0 : 48,
          paddingLeft: 32,
          paddingRight: 32,
        }}
      >
        {/* Add cover button — only when no cover */}
        {!note.coverColor && (
          <button
            onClick={() => setShowCoverPicker(true)}
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🖼️ Add cover
          </button>
        )}

        {/* Icon button — LinkedIn-style circular avatar */}
        <div
          className="mb-4"
          ref={iconPickerRef}
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'inline-block',
            ...(note.coverColor ? { marginTop: -40 } : { marginTop: 0 }),
          }}
        >
          <IconAvatar
            icon={note.icon ?? null}
            onClick={() => setShowIconPicker((v) => !v)}
          />
          {showIconPicker && (
            <PageIconPicker
              onSelect={onIconChange}
              onClose={() => setShowIconPicker(false)}
            />
          )}
        </div>

        {/* Title row */}
        <div className="flex items-start gap-3">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="flex-1 text-4xl font-bold bg-transparent border-none outline-none min-w-0 leading-tight"
            style={{ color: 'var(--color-text-primary)' }}
          />

          {/* Export menu */}
          <div className="relative mt-2 shrink-0" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              title="Export note"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <MoreHorizontal size={20} />
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-52 py-1 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
                <button
                  onClick={() => {
                    exportNoteToMarkdown(note);
                    setShowExportMenu(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <FileDown size={15} />
                  Export as Markdown
                </button>
                <button
                  onClick={() => {
                    exportNoteToPDF(note);
                    setShowExportMenu(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <FileType size={15} />
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div
          className="flex items-center gap-2 mt-3 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span>Created {format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
          {note.wordCount > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{note.wordCount.toLocaleString()} words</span>
            </>
          )}
          {childCount > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{childCount} sub-{childCount === 1 ? 'page' : 'pages'}</span>
            </>
          )}
        </div>
      </div>

      {/* Cover picker modal */}
      {showCoverPicker && (
        <CoverPickerModal
          onSelect={(cover) => {
            onCoverChange(cover);
            setShowCoverPicker(false);
          }}
          onClose={() => setShowCoverPicker(false)}
        />
      )}
    </div>
  );
}
