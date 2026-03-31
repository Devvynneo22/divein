import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useNotes } from '../hooks/useNotes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  icon: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  linkCount: number;
  isOrphan: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgba(color: string, alpha: number): string {
  // Handle rgb/rgba strings
  if (color.startsWith('rgb')) {
    const match = color.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
    }
  }
  // Handle hex
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(150,150,150,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Force simulation ─────────────────────────────────────────────────────────

function runSimulationStep(
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerX: number,
  centerY: number,
  pinnedId: string | null,
  pinnedX: number,
  pinnedY: number,
): number {
  const K_REPULSION = 5000;
  const K_SPRING = 0.01;
  const REST_LENGTH = 100;
  const GRAVITY = 0.01;
  const DAMPING = 0.9;

  // Build edge set for quick lookup
  const edgeSet = new Set<string>();
  for (const e of edges) {
    edgeSet.add(`${e.source}|${e.target}`);
    edgeSet.add(`${e.target}|${e.source}`);
  }

  // Compute forces
  const fx = new Float64Array(nodes.length);
  const fy = new Float64Array(nodes.length);

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const d2 = dx * dx + dy * dy || 1;
      const d = Math.sqrt(d2);
      const f = K_REPULSION / d2;
      const ux = dx / d;
      const uy = dy / d;
      fx[i] -= f * ux;
      fy[i] -= f * uy;
      fx[j] += f * ux;
      fy[j] += f * uy;
    }
  }

  // Spring attraction for edges
  for (const edge of edges) {
    const si = nodes.findIndex((n) => n.id === edge.source);
    const ti = nodes.findIndex((n) => n.id === edge.target);
    if (si === -1 || ti === -1) continue;
    const dx = nodes[ti].x - nodes[si].x;
    const dy = nodes[ti].y - nodes[si].y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = -K_SPRING * (d - REST_LENGTH);
    const ux = dx / d;
    const uy = dy / d;
    fx[si] -= f * ux;
    fy[si] -= f * uy;
    fx[ti] += f * ux;
    fy[ti] += f * uy;
  }

  // Center gravity
  for (let i = 0; i < nodes.length; i++) {
    fx[i] += GRAVITY * (centerX - nodes[i].x);
    fy[i] += GRAVITY * (centerY - nodes[i].y);
  }

  // Apply forces
  let maxV = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === pinnedId) {
      nodes[i].x = pinnedX;
      nodes[i].y = pinnedY;
      nodes[i].vx = 0;
      nodes[i].vy = 0;
      continue;
    }
    nodes[i].vx = (nodes[i].vx + fx[i]) * DAMPING;
    nodes[i].vy = (nodes[i].vy + fy[i]) * DAMPING;
    nodes[i].x += nodes[i].vx;
    nodes[i].y += nodes[i].vy;
    const speed = Math.sqrt(nodes[i].vx ** 2 + nodes[i].vy ** 2);
    if (speed > maxV) maxV = speed;
  }

  return maxV;
}

// ─── Build graph data from notes ──────────────────────────────────────────────

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function buildGraph(
  allNotes: Array<{ id: string; title: string; icon: string | null; content: string | null; parentId: string | null; isTrashed: boolean }>,
  canvasW: number,
  canvasH: number,
): GraphData {
  const notes = allNotes
    .filter((n) => !n.isTrashed)
    .slice(0, 300);

  const titleToId = new Map<string, string>();
  for (const n of notes) {
    titleToId.set(n.title.toLowerCase(), n.id);
  }

  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  function addEdge(src: string, tgt: string) {
    if (src === tgt) return;
    const key = [src, tgt].sort().join('|');
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source: src, target: tgt });
  }

  // Wiki-links
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
  for (const n of notes) {
    if (!n.content) continue;
    let m: RegExpExecArray | null;
    while ((m = wikilinkRegex.exec(n.content)) !== null) {
      const linked = titleToId.get(m[1].toLowerCase());
      if (linked) addEdge(n.id, linked);
    }
  }

  // Sibling connections (same parentId)
  const byParent = new Map<string, string[]>();
  for (const n of notes) {
    if (!n.parentId) continue;
    const arr = byParent.get(n.parentId) ?? [];
    arr.push(n.id);
    byParent.set(n.parentId, arr);
  }
  for (const siblings of byParent.values()) {
    for (let i = 0; i < siblings.length; i++) {
      for (let j = i + 1; j < siblings.length; j++) {
        addEdge(siblings[i], siblings[j]);
      }
    }
  }

  // Count links per node
  const linkCount = new Map<string, number>();
  for (const e of edges) {
    linkCount.set(e.source, (linkCount.get(e.source) ?? 0) + 1);
    linkCount.set(e.target, (linkCount.get(e.target) ?? 0) + 1);
  }

  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    icon: n.icon,
    x: canvasW / 2 + (Math.random() - 0.5) * 300,
    y: canvasH / 2 + (Math.random() - 0.5) * 300,
    vx: 0,
    vy: 0,
    linkCount: linkCount.get(n.id) ?? 0,
    isOrphan: !connectedIds.has(n.id),
  }));

  return { nodes, edges };
}

// ─── NoteGraph component ──────────────────────────────────────────────────────

interface NoteGraphProps {
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  /** If true, renders in mini mode (no interactions, subset of nodes) */
  mini?: boolean;
  /** In mini mode, only render this note + 1-hop neighbors */
  miniNoteId?: string | null;
}

export function NoteGraph({
  selectedNoteId,
  onSelectNote,
  mini = false,
  miniNoteId = null,
}: NoteGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const stableRef = useRef(false);
  const frameCountRef = useRef(0);

  // Transform state (zoom + pan)
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  // Interaction state
  const hoveredIdRef = useRef<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const { data: allNotes = [] } = useNotes();

  // Build graph data (memoized, re-run only when notes change)
  const graphData = useMemo<GraphData>(() => {
    const w = mini ? 200 : 800;
    const h = mini ? 200 : 600;

    if (mini && miniNoteId) {
      // Filter to 1-hop neighborhood
      const fullGraph = buildGraph(allNotes, w, h);
      const neighborIds = new Set<string>([miniNoteId]);
      for (const e of fullGraph.edges) {
        if (e.source === miniNoteId) neighborIds.add(e.target);
        if (e.target === miniNoteId) neighborIds.add(e.source);
      }
      const nodes = fullGraph.nodes.filter((n) => neighborIds.has(n.id));
      const edges = fullGraph.edges.filter(
        (e) => neighborIds.has(e.source) && neighborIds.has(e.target),
      );
      // Re-position nodes in mini canvas
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < nodes.length; i++) {
        const angle = (i / nodes.length) * 2 * Math.PI;
        nodes[i].x = cx + Math.cos(angle) * 60;
        nodes[i].y = cy + Math.sin(angle) * 60;
        nodes[i].vx = 0;
        nodes[i].vy = 0;
      }
      return { nodes, edges };
    }

    return buildGraph(allNotes, w, h);
  }, [allNotes, mini, miniNoteId]);

  // Mutable node positions (refs so canvas loop can mutate them)
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Reset when graph data changes
  useEffect(() => {
    nodesRef.current = graphData.nodes.map((n) => ({ ...n }));
    edgesRef.current = graphData.edges;
    stableRef.current = false;
    frameCountRef.current = 0;
    offsetRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
  }, [graphData]);

  // ── Canvas sizing ──────────────────────────────────────────────────────────

  const sizeRef = useRef({ w: 300, h: 200 });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    sizeRef.current = { w: width, h: height };
  }, []);

  useEffect(() => {
    resizeCanvas();
    if (mini) return; // No resize observer needed for mini
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas, mini]);

  // ── Draw ───────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Colors from CSS variables
    const bgColor = getCssVar('--color-bg-primary') || '#1a1a1a';
    const accentColor = getCssVar('--color-accent') || '#6366f1';
    const mutedColor = getCssVar('--color-text-muted') || '#888';
    const borderColor = getCssVar('--color-border') || '#333';
    const textSecondary = getCssVar('--color-text-secondary') || '#aaa';
    const textPrimary = getCssVar('--color-text-primary') || '#eee';

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Apply pan + zoom
    ctx.translate(offsetRef.current.x + w / 2, offsetRef.current.y + h / 2);
    ctx.scale(scaleRef.current, scaleRef.current);
    ctx.translate(-w / 2, -h / 2);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const hoveredId = hoveredIdRef.current;
    const selectedId = selectedNoteId;

    // Find connected nodes to selected / hovered
    const connectedToSelected = new Set<string>();
    const connectedToHovered = new Set<string>();
    for (const e of edges) {
      if (e.source === selectedId) connectedToSelected.add(e.target);
      if (e.target === selectedId) connectedToSelected.add(e.source);
      if (e.source === hoveredId) connectedToHovered.add(e.target);
      if (e.target === hoveredId) connectedToHovered.add(e.source);
    }

    // Draw edges
    for (const e of edges) {
      const src = nodes.find((n) => n.id === e.source);
      const tgt = nodes.find((n) => n.id === e.target);
      if (!src || !tgt) continue;

      const isConnectedToSelected =
        (e.source === selectedId || e.target === selectedId);
      const isConnectedToHovered =
        hoveredId && (e.source === hoveredId || e.target === hoveredId);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (isConnectedToSelected || isConnectedToHovered) {
        ctx.strokeStyle = hexToRgba(accentColor, 0.6);
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = hexToRgba(borderColor, 0.4);
        ctx.lineWidth = 1;
      }

      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoveredId;
      const isConnected = connectedToSelected.has(node.id) || connectedToHovered.has(node.id);
      const radius = Math.max(4, 6 + Math.min(node.linkCount * 2, 12));
      const orphanScale = node.isOrphan ? 0.7 : 1;
      const r = radius * orphanScale;

      // Hover glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(accentColor, 0.2);
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = accentColor;
      } else if (isConnected) {
        ctx.fillStyle = hexToRgba(accentColor, 0.7);
      } else if (node.isOrphan) {
        ctx.fillStyle = hexToRgba(mutedColor, 0.4);
      } else {
        ctx.fillStyle = hexToRgba(mutedColor, 0.6);
      }
      ctx.fill();

      // Label
      if (!mini || nodes.length <= 15) {
        const label = node.title.length > 20 ? node.title.slice(0, 20) + '…' : node.title;
        ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isSelected || isHovered ? textPrimary : textSecondary;

        if (node.isOrphan && !isSelected && !isHovered) {
          ctx.globalAlpha = 0.5;
        }

        ctx.fillText(label, node.x, node.y + r + 13);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }, [selectedNoteId, mini]);

  // ── Animation loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const loop = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const { w, h } = sizeRef.current;

      if (!stableRef.current && frameCountRef.current < 300) {
        const maxV = runSimulationStep(
          nodes,
          edges,
          w / 2,
          h / 2,
          draggedIdRef.current,
          0, // unused when null
          0,
        );
        frameCountRef.current++;
        if (maxV < 0.5 && frameCountRef.current > 30) {
          stableRef.current = true;
        }
      } else if (draggedIdRef.current) {
        // Keep animating while dragging
        stableRef.current = false;
        frameCountRef.current = 0;
      }

      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ── Coordinate transform helpers ──────────────────────────────────────────

  const canvasToWorld = useCallback(
    (cx: number, cy: number) => {
      const { w, h } = sizeRef.current;
      const s = scaleRef.current;
      const ox = offsetRef.current.x;
      const oy = offsetRef.current.y;
      // inverse of: translate(ox + w/2, oy + h/2) scale(s) translate(-w/2, -h/2)
      const wx = (cx - ox - w / 2) / s + w / 2;
      const wy = (cy - oy - h / 2) / s + h / 2;
      return { x: wx, y: wy };
    },
    [],
  );

  const hitTest = useCallback(
    (wx: number, wy: number): GraphNode | null => {
      const nodes = nodesRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const r = Math.max(4, 6 + Math.min(n.linkCount * 2, 12)) * (n.isOrphan ? 0.7 : 1);
        const dx = wx - n.x;
        const dy = wy - n.y;
        if (dx * dx + dy * dy <= (r + 4) * (r + 4)) return n;
      }
      return null;
    },
    [],
  );

  // ── Mouse / touch events ───────────────────────────────────────────────────

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    title: string;
    x: number;
    y: number;
  }>({ visible: false, title: '', x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mini) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (draggedIdRef.current) {
        // Drag node
        const world = canvasToWorld(cx, cy);
        const node = nodesRef.current.find((n) => n.id === draggedIdRef.current);
        if (node) {
          node.x = world.x - dragOffsetRef.current.x;
          node.y = world.y - dragOffsetRef.current.y;
          node.vx = 0;
          node.vy = 0;
          stableRef.current = false;
        }
        return;
      }

      if (isPanningRef.current) {
        // Pan
        offsetRef.current.x += cx - panStartRef.current.x;
        offsetRef.current.y += cy - panStartRef.current.y;
        panStartRef.current = { x: cx, y: cy };
        stableRef.current = false;
        return;
      }

      // Hover detection
      const world = canvasToWorld(cx, cy);
      const hit = hitTest(world.x, world.y);
      const newHoveredId = hit?.id ?? null;

      if (newHoveredId !== hoveredIdRef.current) {
        hoveredIdRef.current = newHoveredId;
        stableRef.current = false;
      }

      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? 'pointer' : 'grab';
      }

      if (hit) {
        setTooltipState({ visible: true, title: hit.title, x: e.clientX, y: e.clientY - 30 });
      } else {
        setTooltipState((s) => ({ ...s, visible: false }));
      }
    },
    [mini, canvasToWorld, hitTest],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mini) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const world = canvasToWorld(cx, cy);
      const hit = hitTest(world.x, world.y);

      if (hit) {
        draggedIdRef.current = hit.id;
        dragOffsetRef.current = {
          x: world.x - hit.x,
          y: world.y - hit.y,
        };
        stableRef.current = false;
      } else {
        isPanningRef.current = true;
        panStartRef.current = { x: cx, y: cy };
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      }
    },
    [mini, canvasToWorld, hitTest],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mini) return;

      if (draggedIdRef.current) {
        // If mouse barely moved, treat as click
        draggedIdRef.current = null;
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        return;
      }
    },
    [mini],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mini) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const world = canvasToWorld(cx, cy);
      const hit = hitTest(world.x, world.y);
      if (hit) {
        onSelectNote(hit.id);
      }
    },
    [mini, canvasToWorld, hitTest, onSelectNote],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (mini) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      scaleRef.current = Math.min(3, Math.max(0.3, scaleRef.current * delta));
      stableRef.current = false;
    },
    [mini],
  );

  const handleMouseLeave = useCallback(() => {
    hoveredIdRef.current = null;
    draggedIdRef.current = null;
    isPanningRef.current = false;
    setTooltipState((s) => ({ ...s, visible: false }));
  }, []);

  // ── Stats overlay ──────────────────────────────────────────────────────────

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: mini ? 200 : '100%',
        height: mini ? 200 : '100%',
        backgroundColor: 'var(--color-bg-primary)',
        borderRadius: mini ? 8 : 0,
        overflow: 'hidden',
        border: mini ? '1px solid var(--color-border)' : 'none',
        flexShrink: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {!mini && tooltipState.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltipState.x,
            top: tooltipState.y,
            transform: 'translateX(-50%)',
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            fontSize: 12,
            fontWeight: 500,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {tooltipState.title}
        </div>
      )}

      {/* Stats overlay (full graph only) */}
      {!mini && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            fontSize: 11,
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>{nodeCount} notes</span>
          <span>{edgeCount} connections</span>
          <span style={{ opacity: 0.6 }}>Scroll to zoom · Drag to pan</span>
        </div>
      )}

      {/* Mini label */}
      {mini && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        >
          {nodeCount} connected note{nodeCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
