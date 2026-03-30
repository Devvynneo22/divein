import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CanvasBlockKind = 'text' | 'image' | 'sticky';
type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'lavender';

interface CanvasBlock {
  id: string;
  kind: CanvasBlockKind;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;      // text content / image src
  color?: StickyColor;  // for sticky notes
  fontSize?: number;
  bold?: boolean;
}

const STICKY_COLORS: Record<StickyColor, { bg: string; border: string; text: string }> = {
  yellow:   { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
  pink:     { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  blue:     { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  green:    { bg: '#d1fae5', border: '#059669', text: '#064e3b' },
  lavender: { bg: '#ede9fe', border: '#7c3aed', text: '#3b0764' },
};

function genId() { return Math.random().toString(36).slice(2); }

// ─── Resizable, draggable block ───────────────────────────────────────────────

function CanvasItem({
  block,
  isSelected,
  onSelect,
  onChange,
  onDelete,
}: {
  block: CanvasBlock;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasBlock>) => void;
  onDelete: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; bx: number; by: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; bw: number; bh: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // ─── Drag ─────────────────────────────────────────────────────────────────

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (editing) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, bx: block.x, by: block.y };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      onChange({
        x: dragRef.current.bx + ev.clientX - dragRef.current.startX,
        y: dragRef.current.by + ev.clientY - dragRef.current.startY,
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [block.x, block.y, editing, onChange, onSelect]);

  // ─── Resize ───────────────────────────────────────────────────────────────

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, bw: block.width, bh: block.height };

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      onChange({
        width: Math.max(160, resizeRef.current.bw + ev.clientX - resizeRef.current.startX),
        height: Math.max(80, resizeRef.current.bh + ev.clientY - resizeRef.current.startY),
      });
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [block.width, block.height, onChange]);

  // ─── Double-click to edit ─────────────────────────────────────────────────

  const handleDoubleClick = useCallback(() => {
    if (block.kind === 'image') {
      imgInputRef.current?.click();
      return;
    }
    setEditing(true);
    setTimeout(() => textRef.current?.focus(), 20);
  }, [block.kind]);

  const stickyStyle = block.kind === 'sticky' && block.color
    ? STICKY_COLORS[block.color]
    : null;

  const bgColor = stickyStyle
    ? (isDark ? `${stickyStyle.bg}22` : stickyStyle.bg)
    : (block.kind === 'text' ? 'var(--color-bg-elevated)' : 'transparent');

  const borderColor = isSelected
    ? 'var(--color-accent)'
    : stickyStyle
    ? stickyStyle.border
    : 'var(--color-border)';

  const textColor = stickyStyle
    ? (isDark ? stickyStyle.bg : stickyStyle.text)
    : 'var(--color-text-primary)';

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        top: block.y,
        width: block.width,
        height: block.height,
        border: `2px solid ${borderColor}`,
        borderRadius: block.kind === 'sticky' ? 8 : 10,
        borderTop: stickyStyle ? `4px solid ${stickyStyle.border}` : `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxShadow: isSelected
          ? `0 0 0 3px var(--color-accent-soft), 0 4px 20px rgba(0,0,0,0.15)`
          : stickyStyle
          ? '2px 3px 12px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        cursor: editing ? 'text' : 'move',
        userSelect: editing ? 'auto' : 'none',
        zIndex: isSelected ? 10 : 1,
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseDown={handleDragMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Delete button (shown when selected) ── */}
      {isSelected && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete block"
          style={{
            position: 'absolute',
            top: -12,
            right: -12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: 14,
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          ×
        </button>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: block.kind === 'image' ? 0 : 10 }}>
        {block.kind === 'image' ? (
          <>
            {block.content ? (
              <img
                src={block.content}
                alt="Canvas image"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  gap: 6,
                }}
              >
                🖼️ Double-click to add image
              </div>
            )}
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (ev.target?.result) onChange({ content: ev.target.result as string });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />
          </>
        ) : editing ? (
          <textarea
            ref={textRef}
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            onBlur={() => setEditing(false)}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              fontSize: block.fontSize ?? (block.kind === 'sticky' ? 14 : 14),
              fontWeight: block.bold ? 700 : 400,
              color: textColor,
              fontFamily: 'inherit',
              lineHeight: 1.6,
              cursor: 'text',
            }}
            autoFocus
          />
        ) : (
          <div
            style={{
              fontSize: block.fontSize ?? (block.kind === 'sticky' ? 14 : 14),
              fontWeight: block.bold ? 700 : 400,
              color: textColor,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              overflow: 'hidden',
              height: '100%',
              cursor: 'move',
            }}
          >
            {block.content || (
              <span style={{ opacity: 0.4, fontStyle: 'italic' }}>
                {block.kind === 'sticky' ? 'Double-click to write...' : 'Double-click to edit...'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Resize handle ── */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '3px',
          zIndex: 5,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 8L8 2M5 8L8 5M8 8L8 8" stroke="var(--color-border-strong)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Canvas toolbar ───────────────────────────────────────────────────────────

function CanvasToolbar({
  onAdd,
  onClear,
}: {
  onAdd: (kind: CanvasBlockKind, color?: StickyColor) => void;
  onClear: () => void;
}) {
  const [showStickyMenu, setShowStickyMenu] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 10,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        userSelect: 'none',
      }}
    >
      {/* Text block */}
      <ToolBtn title="Add text box" onClick={() => onAdd('text')}>
        Aa
      </ToolBtn>

      {/* Image block */}
      <ToolBtn title="Add image block" onClick={() => onAdd('image')}>
        🖼️
      </ToolBtn>

      {/* Sticky note */}
      <div style={{ position: 'relative' }}>
        <ToolBtn
          title="Add sticky note"
          onClick={() => setShowStickyMenu((v) => !v)}
        >
          📌
        </ToolBtn>
        {showStickyMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              display: 'flex',
              gap: 6,
              padding: 8,
              borderRadius: 8,
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {(Object.entries(STICKY_COLORS) as [StickyColor, typeof STICKY_COLORS[StickyColor]][]).map(([color, style]) => (
              <button
                key={color}
                title={color}
                onClick={() => { onAdd('sticky', color); setShowStickyMenu(false); }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 5,
                  border: `2px solid ${style.border}`,
                  backgroundColor: style.bg,
                  cursor: 'pointer',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, backgroundColor: 'var(--color-border)', margin: '0 2px' }} />

      {/* Clear all */}
      <ToolBtn title="Clear canvas" onClick={onClear} danger>
        🗑️
      </ToolBtn>

      {/* Hint */}
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>
        Drag · Double-click to edit · Resize ↘
      </span>
    </div>
  );
}

function ToolBtn({
  onClick,
  title,
  children,
  danger,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid var(--color-border)',
        backgroundColor: 'transparent',
        color: danger ? '#ef4444' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background-color 0.1s ease, color 0.1s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(239,68,68,0.08)' : 'var(--color-bg-tertiary)';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--color-text-secondary)';
      }}
    >
      {children}
    </button>
  );
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'divein-canvas-';

interface NoteCanvasProps {
  noteId: string;
}

export function NoteCanvas({ noteId }: NoteCanvasProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${noteId}`;

  const [blocks, setBlocks] = useState<CanvasBlock[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as CanvasBlock[];
    } catch { /* ignore */ }
    return [];
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(blocks));
    } catch { /* ignore */ }
  }, [blocks, storageKey]);

  const addBlock = useCallback((kind: CanvasBlockKind, color?: StickyColor) => {
    // Place new block roughly centered with some offset
    const canvas = canvasRef.current;
    const cx = canvas ? (canvas.scrollLeft + canvas.clientWidth / 2) : 400;
    const cy = canvas ? (canvas.scrollTop + canvas.clientHeight / 2) : 300;
    const newBlock: CanvasBlock = {
      id: genId(),
      kind,
      x: cx - 110 + Math.random() * 60 - 30,
      y: cy - 80 + Math.random() * 40 - 20,
      width: kind === 'image' ? 300 : kind === 'text' ? 260 : 220,
      height: kind === 'image' ? 200 : kind === 'text' ? 160 : 140,
      content: '',
      color: kind === 'sticky' ? (color ?? 'yellow') : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<CanvasBlock>) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }, []);

  const clearCanvas = useCallback(() => {
    if (confirm('Clear all blocks from this canvas?')) {
      setBlocks([]);
      setSelectedId(null);
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'var(--color-bg-secondary)',
        backgroundImage: `radial-gradient(circle, var(--color-border) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        cursor: 'default',
      }}
      onClick={() => setSelectedId(null)}
    >
      {/* Infinite canvas area */}
      <div
        ref={canvasRef}
        style={{ position: 'relative', width: '3000px', height: '3000px' }}
      >
        {blocks.map((block) => (
          <CanvasItem
            key={block.id}
            block={block}
            isSelected={selectedId === block.id}
            onSelect={() => setSelectedId(block.id)}
            onChange={(patch) => updateBlock(block.id, patch)}
            onDelete={() => deleteBlock(block.id)}
          />
        ))}

        {/* Empty state hint */}
        {blocks.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🎨</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, opacity: 0.6 }}>
              Free canvas
            </div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>
              Add text boxes, sticky notes, and images freely.<br />
              Use the toolbar above to get started.
            </div>
          </div>
        )}
      </div>

      {/* Floating toolbar */}
      <CanvasToolbar onAdd={addBlock} onClear={clearCanvas} />
    </div>
  );
}
