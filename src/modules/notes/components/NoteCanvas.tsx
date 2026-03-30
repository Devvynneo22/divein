import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'text-box' | 'sticky-note' | 'image';
type Tool = 'select' | 'text' | 'sticky' | 'image';
type StickyColor = 'yellow' | 'pink' | 'blue' | 'green' | 'lavender' | 'orange';

interface Block {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: string;
  color?: StickyColor;
  rotation?: number;
}

interface Pan {
  x: number;
  y: number;
}

interface CanvasData {
  blocks: Block[];
  pan: Pan;
  zoom: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4.0;
const MAX_HISTORY = 50;
const STORAGE_PREFIX = 'divein:canvas:v1:';

const STICKY_PALETTE: Record<StickyColor, { bg: string; border: string; text: string }> = {
  yellow:   { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
  pink:     { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  blue:     { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  green:    { bg: '#d1fae5', border: '#059669', text: '#064e3b' },
  lavender: { bg: '#ede9fe', border: '#7c3aed', text: '#3b0764' },
  orange:   { bg: '#ffedd5', border: '#ea580c', text: '#7c2d12' },
};

const COLOR_KEYS: StickyColor[] = ['yellow', 'pink', 'blue', 'green', 'lavender', 'orange'];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadCanvas(noteId: string): Partial<CanvasData> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + noteId);
    return raw ? (JSON.parse(raw) as Partial<CanvasData>) : {};
  } catch {
    return {};
  }
}

function persistCanvas(noteId: string, data: CanvasData): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + noteId, JSON.stringify(data));
  } catch (e) {
    console.warn('Canvas: persist failed', e);
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── NoteCanvas (main component) ─────────────────────────────────────────────

export interface NoteCanvasProps {
  noteId: string;
}

export function NoteCanvas({ noteId }: NoteCanvasProps) {
  // ── Load initial data once ────────────────────────────────────────────────
  const [initialData] = useState<Partial<CanvasData>>(() => loadCanvas(noteId));

  // ── Render state ──────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<Block[]>(initialData.blocks ?? []);
  const [pan, setPan] = useState<Pan>(initialData.pan ?? { x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(initialData.zoom ?? 1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [stickyColor, setStickyColor] = useState<StickyColor>('yellow');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [historyLen, setHistoryLen] = useState({ past: 0, future: 0 });
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );

  // ── Synced refs to avoid stale closures in event handlers ─────────────────
  const panRef = useRef<Pan>(pan);
  const zoomRef = useRef<number>(zoom);
  const blocksRef = useRef<Block[]>(blocks);
  const selectedIdRef = useRef<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const toolRef = useRef<Tool>('select');
  const stickyColorRef = useRef<StickyColor>('yellow');
  const noteIdRef = useRef<string>(noteId);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { editingIdRef.current = editingId; }, [editingId]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { stickyColorRef.current = stickyColor; }, [stickyColor]);
  useEffect(() => { noteIdRef.current = noteId; }, [noteId]);

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageId = useRef<string | null>(null);
  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Interaction state refs (never cause re-renders) ───────────────────────
  const dragState = useRef<{
    blockId: string;
    startMouseX: number;
    startMouseY: number;
    startBlockX: number;
    startBlockY: number;
  } | null>(null);

  const resizeState = useRef<{
    blockId: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const panDragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const isSpaceDown = useRef<boolean>(false);

  // ── History ───────────────────────────────────────────────────────────────
  const historyPast = useRef<Block[][]>([]);
  const historyFuture = useRef<Block[][]>([]);

  const recordSnapshot = useCallback(() => {
    historyPast.current = [...historyPast.current, [...blocksRef.current]].slice(-MAX_HISTORY);
    historyFuture.current = [];
    setHistoryLen({ past: historyPast.current.length, future: 0 });
  }, []);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const saveNow = useCallback((
    b: Block[] = blocksRef.current,
    p: Pan = panRef.current,
    z: number = zoomRef.current,
  ) => {
    persistCanvas(noteIdRef.current, { blocks: b, pan: p, zoom: z });
  }, []);

  const scheduleSave = useCallback((
    b: Block[] = blocksRef.current,
    p: Pan = panRef.current,
    z: number = zoomRef.current,
  ) => {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => persistCanvas(noteIdRef.current, { blocks: b, pan: p, zoom: z }), 300);
  }, []);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (historyPast.current.length === 0) return;
    const snapshot = historyPast.current[historyPast.current.length - 1];
    historyPast.current = historyPast.current.slice(0, -1);
    historyFuture.current = [...historyFuture.current, [...blocksRef.current]];
    blocksRef.current = [...snapshot];
    setBlocks(snapshot);
    setHistoryLen({ past: historyPast.current.length, future: historyFuture.current.length });
    saveNow(snapshot);
  }, [saveNow]);

  const redo = useCallback(() => {
    if (historyFuture.current.length === 0) return;
    const snapshot = historyFuture.current[historyFuture.current.length - 1];
    historyFuture.current = historyFuture.current.slice(0, -1);
    historyPast.current = [...historyPast.current, [...blocksRef.current]];
    blocksRef.current = [...snapshot];
    setBlocks(snapshot);
    setHistoryLen({ past: historyPast.current.length, future: historyFuture.current.length });
    saveNow(snapshot);
  }, [saveNow]);

  // ── Block mutations ───────────────────────────────────────────────────────
  const getMaxZ = useCallback((): number => {
    const bs = blocksRef.current;
    return bs.length === 0 ? 0 : Math.max(...bs.map((b) => b.zIndex));
  }, []);

  const addBlock = useCallback((partial: Omit<Block, 'id' | 'zIndex'>): string => {
    recordSnapshot();
    const id = uid();
    const newBlock: Block = { ...partial, id, zIndex: getMaxZ() + 1 };
    const next = [...blocksRef.current, newBlock];
    blocksRef.current = next;
    setBlocks(next);
    setSelectedId(id);
    selectedIdRef.current = id;
    saveNow(next);
    return id;
  }, [recordSnapshot, getMaxZ, saveNow]);

  const removeBlock = useCallback((id: string) => {
    recordSnapshot();
    const next = blocksRef.current.filter((b) => b.id !== id);
    blocksRef.current = next;
    setBlocks(next);
    if (selectedIdRef.current === id) { setSelectedId(null); selectedIdRef.current = null; }
    if (editingIdRef.current === id) { setEditingId(null); editingIdRef.current = null; }
    saveNow(next);
  }, [recordSnapshot, saveNow]);

  const updateContent = useCallback((id: string, content: string) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, content } : b));
      blocksRef.current = next;
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const bringToFront = useCallback((id: string) => {
    const maxZ = getMaxZ();
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, zIndex: maxZ + 1 } : b));
      blocksRef.current = next;
      return next;
    });
  }, [getMaxZ]);

  // ── Coordinate conversion ─────────────────────────────────────────────────
  const clientToCanvas = useCallback((cx: number, cy: number): Pan => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (cx - rect.left - panRef.current.x) / zoomRef.current,
      y: (cy - rect.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  const viewCenter = useCallback((): Pan => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    return {
      x: (el.clientWidth / 2 - panRef.current.x) / zoomRef.current,
      y: (el.clientHeight / 2 - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // ── Add-block helpers ─────────────────────────────────────────────────────
  const addTextBlock = useCallback((cx?: number, cy?: number) => {
    const pos = cx !== undefined ? clientToCanvas(cx, cy!) : viewCenter();
    addBlock({ type: 'text-box', x: pos.x - 150, y: pos.y - 60, width: 300, height: 120, content: '' });
    setTool('select'); toolRef.current = 'select';
  }, [clientToCanvas, viewCenter, addBlock]);

  const addStickyBlock = useCallback((cx?: number, cy?: number) => {
    const pos = cx !== undefined ? clientToCanvas(cx, cy!) : viewCenter();
    const rotation = Math.random() * 4 - 2;
    addBlock({
      type: 'sticky-note',
      x: pos.x - 100, y: pos.y - 100,
      width: 200, height: 200,
      content: '',
      color: stickyColorRef.current,
      rotation,
    });
    setTool('select'); toolRef.current = 'select';
  }, [clientToCanvas, viewCenter, addBlock]);

  const addImageBlock = useCallback((cx?: number, cy?: number) => {
    const pos = cx !== undefined ? clientToCanvas(cx, cy!) : viewCenter();
    const id = addBlock({ type: 'image', x: pos.x - 150, y: pos.y - 100, width: 300, height: 200, content: '' });
    pendingImageId.current = id;
    imageInputRef.current?.click();
    setTool('select'); toolRef.current = 'select';
  }, [clientToCanvas, viewCenter, addBlock]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const applyZoom = useCallback((raw: number, originX: number, originY: number) => {
    const old = zoomRef.current;
    let z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, raw));
    if (Math.abs(z - 1) < 0.05) z = 1;
    const ratio = z / old;
    const newPan: Pan = {
      x: originX - (originX - panRef.current.x) * ratio,
      y: originY - (originY - panRef.current.y) * ratio,
    };
    zoomRef.current = z;
    panRef.current = newPan;
    setZoom(z);
    setPan(newPan);
    scheduleSave(blocksRef.current, newPan, z);
  }, [scheduleSave]);

  const zoomIn = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    applyZoom(zoomRef.current * 1.2, el.clientWidth / 2, el.clientHeight / 2);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    applyZoom(zoomRef.current / 1.2, el.clientWidth / 2, el.clientHeight / 2);
  }, [applyZoom]);

  const resetZoom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    applyZoom(1, el.clientWidth / 2, el.clientHeight / 2);
  }, [applyZoom]);

  const fitView = useCallback(() => {
    const bs = blocksRef.current;
    const el = containerRef.current;
    if (!el || bs.length === 0) return;
    const minX = Math.min(...bs.map((b) => b.x));
    const minY = Math.min(...bs.map((b) => b.y));
    const maxX = Math.max(...bs.map((b) => b.x + b.width));
    const maxY = Math.max(...bs.map((b) => b.y + b.height));
    const pad = 80;
    const vw = el.clientWidth - pad * 2;
    const vh = el.clientHeight - pad * 2;
    const cw = maxX - minX || 1;
    const ch = maxY - minY || 1;
    let z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(vw / cw, vh / ch)));
    if (Math.abs(z - 1) < 0.05) z = 1;
    const newPan: Pan = {
      x: (el.clientWidth - cw * z) / 2 - minX * z,
      y: (el.clientHeight - ch * z) / 2 - minY * z,
    };
    zoomRef.current = z;
    panRef.current = newPan;
    setZoom(z);
    setPan(newPan);
    scheduleSave(blocksRef.current, newPan, z);
  }, [scheduleSave]);

  // ── Global mouse/keyboard handlers (registered once, reads from refs) ─────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragState.current;
      if (drag) {
        const dx = (e.clientX - drag.startMouseX) / zoomRef.current;
        const dy = (e.clientY - drag.startMouseY) / zoomRef.current;
        setBlocks((prev) => {
          const next = prev.map((b) =>
            b.id === drag.blockId ? { ...b, x: drag.startBlockX + dx, y: drag.startBlockY + dy } : b,
          );
          blocksRef.current = next;
          return next;
        });
        return;
      }
      const resize = resizeState.current;
      if (resize) {
        const dx = (e.clientX - resize.startMouseX) / zoomRef.current;
        const dy = (e.clientY - resize.startMouseY) / zoomRef.current;
        const nw = Math.max(80, resize.startW + dx);
        const nh = Math.max(60, resize.startH + dy);
        setBlocks((prev) => {
          const next = prev.map((b) =>
            b.id === resize.blockId ? { ...b, width: nw, height: nh } : b,
          );
          blocksRef.current = next;
          return next;
        });
        return;
      }
      const ps = panDragState.current;
      if (ps) {
        const newPan: Pan = {
          x: ps.startPanX + (e.clientX - ps.startMouseX),
          y: ps.startPanY + (e.clientY - ps.startMouseY),
        };
        panRef.current = newPan;
        setPan(newPan);
      }
    };

    const onMouseUp = () => {
      const wasDrag = !!dragState.current;
      const wasResize = !!resizeState.current;
      const wasPan = !!panDragState.current;
      if (wasDrag) dragState.current = null;
      if (wasResize) resizeState.current = null;
      if (wasPan) panDragState.current = null;
      if (wasDrag || wasResize || wasPan) {
        document.body.style.userSelect = '';
        persistCanvas(noteIdRef.current, {
          blocks: blocksRef.current,
          pan: panRef.current,
          zoom: zoomRef.current,
        });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Wheel event (non-passive, registered imperatively) ────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;
      const oy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+scroll
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const old = zoomRef.current;
        let z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, old * factor));
        if (Math.abs(z - 1) < 0.05) z = 1;
        const ratio = z / old;
        const newPan: Pan = {
          x: ox - (ox - panRef.current.x) * ratio,
          y: oy - (oy - panRef.current.y) * ratio,
        };
        zoomRef.current = z;
        panRef.current = newPan;
        setZoom(z);
        setPan(newPan);
        if (saveDebounce.current) clearTimeout(saveDebounce.current);
        saveDebounce.current = setTimeout(() =>
          persistCanvas(noteIdRef.current, { blocks: blocksRef.current, pan: newPan, zoom: z }), 300);
      } else {
        // Two-finger pan
        const newPan: Pan = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
        panRef.current = newPan;
        setPan(newPan);
        if (saveDebounce.current) clearTimeout(saveDebounce.current);
        saveDebounce.current = setTimeout(() =>
          persistCanvas(noteIdRef.current, { blocks: blocksRef.current, pan: newPan, zoom: zoomRef.current }), 300);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isSpaceDown.current) {
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return;
        isSpaceDown.current = true;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
        e.preventDefault();
        return;
      }

      // Don't intercept when editing a block's text
      if (editingIdRef.current !== null) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Escape') {
        setSelectedId(null);
        selectedIdRef.current = null;
        setEditingId(null);
        editingIdRef.current = null;
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdRef.current) {
        e.preventDefault();
        removeBlock(selectedIdRef.current);
        return;
      }

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && e.key === 'z' && e.shiftKey) || (mod && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }

      // Arrow nudge
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedIdRef.current) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setBlocks((prev) => {
          const next = prev.map((b) =>
            b.id === selectedIdRef.current ? { ...b, x: b.x + dx, y: b.y + dy } : b,
          );
          blocksRef.current = next;
          return next;
        });
        scheduleSave();
        return;
      }

      // Tool shortcuts
      if (!mod) {
        if (e.key === 'v' || e.key === 'V') { setTool('select'); toolRef.current = 'select'; }
        if (e.key === 't' || e.key === 'T') { setTool('text'); toolRef.current = 'text'; }
        if (e.key === 's' || e.key === 'S') { setTool('sticky'); toolRef.current = 'sticky'; }
        if (e.key === 'i' || e.key === 'I') { setTool('image'); toolRef.current = 'image'; }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isSpaceDown.current = false;
        if (containerRef.current && !panDragState.current) {
          containerRef.current.style.cursor = '';
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [undo, redo, removeBlock, resetZoom, scheduleSave]);

  // ── Dark mode observer ────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // ── Canvas click (add block or deselect) ──────────────────────────────────
  const onCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && isSpaceDown.current)) {
      e.preventDefault();
      panDragState.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
      document.body.style.userSelect = 'none';
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const currentTool = toolRef.current;
    if (currentTool === 'text') {
      addTextBlock(e.clientX, e.clientY);
      return;
    }
    if (currentTool === 'sticky') {
      addStickyBlock(e.clientX, e.clientY);
      return;
    }
    if (currentTool === 'image') {
      addImageBlock(e.clientX, e.clientY);
      return;
    }
    // Select tool: deselect
    setSelectedId(null);
    selectedIdRef.current = null;
    setEditingId(null);
    editingIdRef.current = null;
    setShowColorPicker(false);
  }, [addTextBlock, addStickyBlock, addImageBlock]);

  const onCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (panDragState.current) {
      if (containerRef.current) {
        containerRef.current.style.cursor = isSpaceDown.current ? 'grab' : '';
      }
    }
  }, []);

  // ── Block mousedown (drag start) ──────────────────────────────────────────
  const onBlockMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, block: Block) => {
    if (e.button !== 0) return;
    if (isSpaceDown.current) return; // let canvas handle pan

    e.stopPropagation();

    // Select the block
    setSelectedId(block.id);
    selectedIdRef.current = block.id;
    bringToFront(block.id);
    setShowColorPicker(false);

    // Don't start drag if editing
    if (editingIdRef.current === block.id) return;

    dragState.current = {
      blockId: block.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startBlockX: block.x,
      startBlockY: block.y,
    };
    document.body.style.userSelect = 'none';
  }, [bringToFront]);

  // ── Resize handle mousedown ───────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, block: Block) => {
    e.preventDefault();
    e.stopPropagation();
    recordSnapshot();
    resizeState.current = {
      blockId: block.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: block.width,
      startH: block.height,
    };
    document.body.style.userSelect = 'none';
  }, [recordSnapshot]);

  // ── Double-click to edit ──────────────────────────────────────────────────
  const onBlockDblClick = useCallback((e: React.MouseEvent, block: Block) => {
    e.stopPropagation();
    if (block.type === 'image') {
      pendingImageId.current = block.id;
      imageInputRef.current?.click();
      return;
    }
    setEditingId(block.id);
    editingIdRef.current = block.id;
  }, []);

  // ── Image file input ──────────────────────────────────────────────────────
  const onImageFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = pendingImageId.current;
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setBlocks((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, content: dataUrl } : b));
        blocksRef.current = next;
        saveNow(next);
        return next;
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    pendingImageId.current = null;
  }, [saveNow]);

  // ── Sticky color change ───────────────────────────────────────────────────
  const onChangeStickyColor = useCallback((id: string, color: StickyColor) => {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, color } : b));
      blocksRef.current = next;
      saveNow(next);
      return next;
    });
  }, [saveNow]);

  // ── Derived cursor ────────────────────────────────────────────────────────
  const canvasCursor =
    tool === 'text' ? 'crosshair' :
    tool === 'sticky' ? 'crosshair' :
    tool === 'image' ? 'crosshair' :
    'default';

  const pct = Math.round(zoom * 100);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onImageFileChange}
      />

      {/* ── Toolbar ── */}
      <CanvasToolbar
        tool={tool}
        stickyColor={stickyColor}
        showColorPicker={showColorPicker}
        zoom={pct}
        historyLen={historyLen}
        isDark={isDark}
        onSelectTool={(t) => { setTool(t); toolRef.current = t; setShowColorPicker(false); }}
        onStickyTool={() => {
          setTool('sticky');
          toolRef.current = 'sticky';
          setShowColorPicker((v) => !v);
        }}
        onPickColor={(c) => { setStickyColor(c); stickyColorRef.current = c; setShowColorPicker(false); }}
        onToggleColorPicker={() => setShowColorPicker((v) => !v)}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={resetZoom}
        onFitView={fitView}
        onAddText={() => addTextBlock()}
        onAddSticky={() => addStickyBlock()}
        onAddImage={() => addImageBlock()}
      />

      {/* ── Canvas area ── */}
      <div
        ref={containerRef}
        onMouseDown={onCanvasMouseDown}
        onMouseUp={onCanvasMouseUp}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: canvasCursor,
          backgroundColor: 'var(--color-bg-secondary)',
          backgroundImage: 'radial-gradient(circle, var(--color-border) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Transform layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            transformOrigin: '0 0',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            willChange: 'transform',
          }}
        >
          {blocks.map((block) => (
            <CanvasBlock
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              isEditing={editingId === block.id}
              isDark={isDark}
              onMouseDown={onBlockMouseDown}
              onDblClick={onBlockDblClick}
              onResizeMouseDown={onResizeMouseDown}
              onDelete={removeBlock}
              onContentChange={updateContent}
              onEditEnd={() => { setEditingId(null); editingIdRef.current = null; }}
              onColorChange={onChangeStickyColor}
            />
          ))}
        </div>

        {/* Empty state */}
        {blocks.length === 0 && (
          <EmptyState
            onAddText={() => addTextBlock()}
            onAddSticky={() => addStickyBlock()}
            onAddImage={() => addImageBlock()}
          />
        )}
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  tool: Tool;
  stickyColor: StickyColor;
  showColorPicker: boolean;
  zoom: number;
  historyLen: { past: number; future: number };
  isDark: boolean;
  onSelectTool: (t: Tool) => void;
  onStickyTool: () => void;
  onPickColor: (c: StickyColor) => void;
  onToggleColorPicker: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFitView: () => void;
  onAddText: () => void;
  onAddSticky: () => void;
  onAddImage: () => void;
}

function CanvasToolbar({
  tool, stickyColor, showColorPicker, zoom, historyLen, isDark,
  onSelectTool, onStickyTool, onPickColor,
  onUndo, onRedo, onZoomIn, onZoomOut, onZoomReset, onFitView,
}: ToolbarProps) {
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, transition: 'all 0.1s',
    background: 'none',
    color: 'var(--color-text-secondary)',
  };
  const btnActive: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'var(--color-accent-soft)',
    color: 'var(--color-accent)',
  };
  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.3,
    cursor: 'default',
  };

  const swatch = STICKY_PALETTE[stickyColor].bg;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 12px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: isDark ? 'var(--color-bg-primary)' : 'var(--color-bg-elevated)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
        flexWrap: 'wrap',
      }}
    >
      {/* Tool buttons */}
      <ToolBtn active={tool === 'select'} style={tool === 'select' ? btnActive : btnBase} title="Select (V)" onClick={() => onSelectTool('select')}>
        V
      </ToolBtn>
      <ToolBtn active={tool === 'text'} style={tool === 'text' ? btnActive : btnBase} title="Text Box (T)" onClick={() => onSelectTool('text')}>
        T
      </ToolBtn>

      {/* Sticky with color picker */}
      <div style={{ position: 'relative' }}>
        <button
          title="Sticky Note (S)"
          style={{
            ...btnBase,
            ...(tool === 'sticky' ? { backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' } : {}),
            display: 'flex', alignItems: 'center', gap: 3, paddingLeft: 6, paddingRight: 4,
            width: 'auto',
          }}
          onClick={onStickyTool}
        >
          <span>S</span>
          <span
            style={{
              display: 'inline-block',
              width: 10, height: 10, borderRadius: 2,
              backgroundColor: swatch,
              border: '1px solid rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          />
        </button>
        {showColorPicker && (
          <div
            style={{
              position: 'absolute',
              top: 36, left: 0,
              display: 'flex', gap: 4, padding: 8,
              borderRadius: 8,
              backgroundColor: isDark ? 'var(--color-bg-elevated)' : '#fff',
              boxShadow: 'var(--shadow-popup)',
              border: '1px solid var(--color-border)',
              zIndex: 100,
            }}
          >
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => onPickColor(c)}
                style={{
                  width: 20, height: 20, borderRadius: 4,
                  backgroundColor: STICKY_PALETTE[c].bg,
                  border: c === stickyColor ? `2px solid ${STICKY_PALETTE[c].border}` : '1px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ToolBtn active={tool === 'image'} style={tool === 'image' ? btnActive : btnBase} title="Image (I)" onClick={() => onSelectTool('image')}>
        I
      </ToolBtn>

      <Divider />

      {/* Undo / Redo */}
      <button
        style={historyLen.past > 0 ? btnBase : btnDisabled}
        disabled={historyLen.past === 0}
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        style={historyLen.future > 0 ? btnBase : btnDisabled}
        disabled={historyLen.future === 0}
        onClick={onRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↪
      </button>

      <Divider />

      {/* Zoom */}
      <button style={btnBase} onClick={onZoomOut} title="Zoom out">−</button>
      <button
        style={{
          ...btnBase,
          width: 52, fontSize: 12, fontWeight: 600,
          color: 'var(--color-text-secondary)',
        }}
        onClick={onZoomReset}
        title="Reset zoom to 100%"
      >
        {zoom}%
      </button>
      <button style={btnBase} onClick={onZoomIn} title="Zoom in">+</button>
      <button style={btnBase} onClick={onFitView} title="Fit view">⊡</button>

      <Divider />

      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>
        Space+drag to pan · Scroll to zoom
      </span>
    </div>
  );
}

function ToolBtn({
  children, active, style, title, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  style: React.CSSProperties;
  title: string;
  onClick: () => void;
}) {
  void active;
  return (
    <button style={style} title={title} onClick={onClick}>
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1, height: 20,
        backgroundColor: 'var(--color-border)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

// ─── CanvasBlock ──────────────────────────────────────────────────────────────

interface CanvasBlockProps {
  block: Block;
  isSelected: boolean;
  isEditing: boolean;
  isDark: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>, block: Block) => void;
  onDblClick: (e: React.MouseEvent, block: Block) => void;
  onResizeMouseDown: (e: React.MouseEvent<HTMLDivElement>, block: Block) => void;
  onDelete: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  onEditEnd: () => void;
  onColorChange: (id: string, color: StickyColor) => void;
}

function CanvasBlock({
  block, isSelected, isEditing, isDark,
  onMouseDown, onDblClick, onResizeMouseDown,
  onDelete, onContentChange, onEditEnd, onColorChange,
}: CanvasBlockProps) {
  const blockRef = useRef<Block>(block);
  useEffect(() => { blockRef.current = block; }, [block]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onMouseDown(e, blockRef.current);
  }, [onMouseDown]);

  const handleDblClick = useCallback((e: React.MouseEvent) => {
    onDblClick(e, blockRef.current);
  }, [onDblClick]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    onResizeMouseDown(e, blockRef.current);
  }, [onResizeMouseDown]);

  const shadow = isSelected
    ? '0 4px 16px rgba(0,0,0,0.15)'
    : '0 2px 8px rgba(0,0,0,0.08)';

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: block.x,
    top: block.y,
    width: block.width,
    height: block.height,
    overflow: 'visible',
    zIndex: block.zIndex,
    transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
    outline: isSelected ? '2px solid var(--color-accent)' : 'none',
    outlineOffset: 2,
    borderRadius: block.type === 'sticky-note' ? 2 : 6,
    boxShadow: block.type === 'sticky-note'
      ? '2px 3px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)'
      : shadow,
    cursor: 'grab',
    userSelect: 'none',
  };

  return (
    <div
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDblClick}
    >
      {/* Content area */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit' }}>
        {block.type === 'text-box' && (
          <TextBoxContent
            block={block}
            isEditing={isEditing}
            isDark={isDark}
            onContentChange={onContentChange}
            onEditEnd={onEditEnd}
          />
        )}
        {block.type === 'sticky-note' && (
          <StickyNoteContent
            block={block}
            isEditing={isEditing}
            isDark={isDark}
            onContentChange={onContentChange}
            onEditEnd={onEditEnd}
            onColorChange={onColorChange}
          />
        )}
        {block.type === 'image' && (
          <ImageBlockContent block={block} isDark={isDark} />
        )}
      </div>

      {/* Delete button — outside content div */}
      {isSelected && (
        <button
          style={{
            position: 'absolute', top: -12, right: -12,
            width: 22, height: 22, borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #fff',
            color: '#fff',
            fontSize: 13, fontWeight: 700, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
          title="Delete block"
        >
          ×
        </button>
      )}

      {/* Resize handle — outside content div */}
      {isSelected && (
        <div
          style={{
            position: 'absolute', right: -5, bottom: -5,
            width: 10, height: 10,
            backgroundColor: '#fff',
            border: '2px solid var(--color-accent)',
            borderRadius: 2,
            cursor: 'se-resize',
            zIndex: 20,
          }}
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
}

// ─── TextBoxContent ───────────────────────────────────────────────────────────

function TextBoxContent({
  block, isEditing, isDark, onContentChange, onEditEnd,
}: {
  block: Block;
  isEditing: boolean;
  isDark: boolean;
  onContentChange: (id: string, content: string) => void;
  onEditEnd: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isEditing && taRef.current) {
      taRef.current.focus();
      taRef.current.selectionStart = taRef.current.value.length;
    }
  }, [isEditing]);

  return (
    <div
      style={{
        width: '100%', height: '100%',
        backgroundColor: 'transparent',
        border: isEditing ? '1.5px solid var(--color-accent)' : '1.5px solid transparent',
        borderRadius: 6,
        padding: 4,
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!isEditing) el.style.borderColor = 'var(--color-border-hover)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!isEditing) el.style.borderColor = 'transparent';
      }}
    >
      {isEditing ? (
        <textarea
          ref={taRef}
          value={block.content}
          onChange={(e) => onContentChange(block.id, e.target.value)}
          onBlur={onEditEnd}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); onEditEnd(); }
          }}
          style={{
            width: '100%', height: '100%',
            background: 'none', border: 'none', outline: 'none',
            resize: 'none', padding: 4,
            fontSize: 14, lineHeight: 1.5,
            color: isDark ? 'var(--color-text-primary)' : 'var(--color-text-primary)',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          placeholder="Type something..."
        />
      ) : (
        <div
          style={{
            padding: 4, fontSize: 14, lineHeight: 1.5,
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            minHeight: 20,
          }}
        >
          {block.content || (
            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Double-click to edit
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── StickyNoteContent ────────────────────────────────────────────────────────

function StickyNoteContent({
  block, isEditing, isDark, onContentChange, onEditEnd, onColorChange,
}: {
  block: Block;
  isEditing: boolean;
  isDark: boolean;
  onContentChange: (id: string, content: string) => void;
  onEditEnd: () => void;
  onColorChange: (id: string, color: StickyColor) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const color = (block.color ?? 'yellow') as StickyColor;
  const palette = STICKY_PALETTE[color];

  useEffect(() => {
    if (isEditing && taRef.current) {
      taRef.current.focus();
      taRef.current.selectionStart = taRef.current.value.length;
    }
  }, [isEditing]);

  const textColor = isDark ? palette.border : palette.text;

  return (
    <div
      style={{
        width: '100%', height: '100%',
        backgroundColor: isDark ? `rgba(0,0,0,0)` : palette.bg,
        background: isDark
          ? `linear-gradient(135deg, ${palette.bg}26 0%, ${palette.bg}15 100%)`
          : palette.bg,
        borderTop: `3px solid ${palette.border}`,
        borderRadius: 2,
        padding: 4,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Color row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexShrink: 0 }}>
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onClick={(e) => { e.stopPropagation(); onColorChange(block.id, c); }}
            style={{
              width: 12, height: 12, borderRadius: 2,
              backgroundColor: STICKY_PALETTE[c].bg,
              border: c === color ? `2px solid ${STICKY_PALETTE[c].border}` : '1px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', flexShrink: 0, padding: 0,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isEditing ? (
          <textarea
            ref={taRef}
            value={block.content}
            onChange={(e) => onContentChange(block.id, e.target.value)}
            onBlur={onEditEnd}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') { e.preventDefault(); onEditEnd(); }
            }}
            style={{
              width: '100%', height: '100%',
              background: 'none', border: 'none', outline: 'none',
              resize: 'none', padding: 4,
              fontSize: 14, lineHeight: 1.5,
              color: textColor,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
            placeholder="Write a note..."
          />
        ) : (
          <div
            style={{
              padding: 4, fontSize: 14, lineHeight: 1.5,
              color: isDark ? palette.border : palette.text,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: 20,
            }}
          >
            {block.content || (
              <span style={{ opacity: 0.5, fontStyle: 'italic', color: isDark ? palette.border : palette.text }}>
                Double-click to write...
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ImageBlockContent ────────────────────────────────────────────────────────

function ImageBlockContent({ block, isDark }: { block: Block; isDark: boolean }) {
  void isDark;
  return (
    <div
      style={{
        width: '100%', height: '100%',
        borderRadius: 6,
        border: '1.5px solid var(--color-border)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--color-bg-tertiary)',
        boxSizing: 'border-box',
      }}
    >
      {block.content ? (
        <img
          src={block.content}
          alt="canvas image"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🖼</div>
          <div>Double-click to upload</div>
        </div>
      )}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  onAddText, onAddSticky, onAddImage,
}: {
  onAddText: () => void;
  onAddSticky: () => void;
  onAddImage: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-elevated)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    transition: 'all 0.1s',
  };

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{ textAlign: 'center', pointerEvents: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          Free Canvas
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Add sticky notes, text boxes, and images — place them anywhere.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={btnStyle} onClick={onAddSticky}>+ Sticky Note</button>
          <button style={btnStyle} onClick={onAddText}>+ Text Box</button>
          <button style={btnStyle} onClick={onAddImage}>+ Image</button>
        </div>
      </div>
    </div>
  );
}
