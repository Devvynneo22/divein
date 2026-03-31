import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Check, X } from 'lucide-react';
import { useLinkStore, type LinkableType } from '@/shared/stores/linkStore';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useNotes } from '@/modules/notes/hooks/useNotes';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useEvents } from '@/modules/calendar/hooks/useEvents';
import { useHabits } from '@/modules/habits/hooks/useHabits';
import { useDecks } from '@/modules/flashcards/hooks/useFlashcards';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickerItem {
  type: LinkableType;
  id: string;
  title: string;
  meta?: string;
}

type TabFilter = 'all' | LinkableType;

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<LinkableType, { icon: string; label: string; color: string }> = {
  task:    { icon: '✅', label: 'Tasks',    color: 'var(--color-accent)'           },
  note:    { icon: '📝', label: 'Notes',    color: '#a78bfa'                       },
  project: { icon: '📁', label: 'Projects', color: '#fb923c'                       },
  event:   { icon: '📅', label: 'Events',   color: 'var(--color-success, #4ade80)' },
  habit:   { icon: '🎯', label: 'Habits',   color: 'var(--color-success, #34d399)' },
  deck:    { icon: '🃏', label: 'Decks',    color: '#fbbf24'                       },
};

const ALL_TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',     label: 'All'      },
  { key: 'task',    label: 'Tasks'    },
  { key: 'note',    label: 'Notes'    },
  { key: 'project', label: 'Projects' },
  { key: 'event',   label: 'Events'   },
  { key: 'habit',   label: 'Habits'   },
  { key: 'deck',    label: 'Decks'    },
];

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LinkPickerModalProps {
  sourceType: LinkableType;
  sourceId: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinkPickerModal({ sourceType, sourceId, onClose }: LinkPickerModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const debouncedQuery = useDebounced(query, 180);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addLink, getLinksFor } = useLinkStore();
  const existingLinks = getLinksFor(sourceType, sourceId);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: tasks    = [] } = useTasks();
  const { data: notes    = [] } = useNotes();
  const { data: projects = [] } = useProjects();
  const { data: events   = [] } = useEvents();
  const { data: habits   = [] } = useHabits();
  const { data: decks    = [] } = useDecks();

  // ── Normalize all items ───────────────────────────────────────────────────
  const allItems = useMemo<PickerItem[]>(() => {
    const items: PickerItem[] = [];

    for (const t of tasks) {
      if (t.parentId !== null) continue; // skip subtasks
      items.push({ type: 'task', id: t.id, title: t.title, meta: t.status });
    }
    for (const n of notes) {
      if (n.isTrashed) continue;
      items.push({ type: 'note', id: n.id, title: n.title || 'Untitled', meta: undefined });
    }
    for (const p of projects) {
      items.push({ type: 'project', id: p.id, title: p.name, meta: p.status });
    }
    for (const e of events) {
      items.push({
        type: 'event',
        id: e.id,
        title: e.title,
        meta: new Date(e.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
    for (const h of habits) {
      if (h.isArchived) continue;
      items.push({ type: 'habit', id: h.id, title: h.name, meta: undefined });
    }
    for (const d of decks) {
      items.push({ type: 'deck', id: d.id, title: d.name, meta: undefined });
    }

    return items;
  }, [tasks, notes, projects, events, habits, decks]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo<PickerItem[]>(() => {
    const q = debouncedQuery.toLowerCase().trim();
    return allItems.filter((item) => {
      // Exclude self
      if (item.type === sourceType && item.id === sourceId) return false;
      // Tab filter
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      // Search
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allItems, debouncedQuery, activeTab, sourceType, sourceId]);

  // Group by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<LinkableType, PickerItem[]>> = {};
    for (const item of filtered) {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type]!.push(item);
    }
    return groups;
  }, [filtered]);

  // ── Keyboard handling ─────────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isLinked = (type: LinkableType, id: string): boolean => {
    return existingLinks.some((l) => {
      const isSource = l.sourceType === sourceType && l.sourceId === sourceId;
      const otherType = isSource ? l.targetType : l.sourceType;
      const otherId   = isSource ? l.targetId   : l.sourceId;
      return otherType === type && otherId === id;
    });
  };

  const handleSelect = (item: PickerItem) => {
    if (isLinked(item.type, item.id)) return; // already linked
    addLink({ type: sourceType, id: sourceId }, { type: item.type, id: item.id });
    onClose();
  };

  const orderedTypes: LinkableType[] = ['task', 'note', 'project', 'event', 'habit', 'deck'];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 201,
          width: 560,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-popup, 0 24px 64px rgba(0,0,0,0.25))',
          overflow: 'hidden',
        }}
      >
        {/* ── Search bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search items to link..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              fontSize: 14,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Tab filter ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '6px 10px',
            borderBottom: '1px solid var(--color-border)',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {ALL_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeTab === tab.key ? 600 : 400,
                backgroundColor: activeTab === tab.key ? 'var(--color-accent-muted)' : 'transparent',
                color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Results ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '32px 0',
                color: 'var(--color-text-muted)',
              }}
            >
              <Search size={24} style={{ opacity: 0.4 }} />
              <span style={{ fontSize: 13 }}>
                {debouncedQuery ? `No results for "${debouncedQuery}"` : 'No items found'}
              </span>
            </div>
          ) : (
            orderedTypes.map((type) => {
              const typeItems = grouped[type];
              if (!typeItems || typeItems.length === 0) return null;
              const config = TYPE_CONFIG[type];

              return (
                <div key={type} style={{ marginBottom: 4 }}>
                  {/* Group header */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--color-text-muted)',
                      padding: '6px 8px 3px',
                    }}
                  >
                    {config.icon} {config.label}
                  </div>

                  {/* Items */}
                  {typeItems.map((item) => {
                    const linked = isLinked(item.type, item.id);
                    return (
                      <PickerRow
                        key={item.id}
                        item={item}
                        config={config}
                        linked={linked}
                        onSelect={() => handleSelect(item)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Click an item to link it · <kbd style={{ fontFamily: 'inherit', opacity: 0.7 }}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </>
  );
}

// ─── PickerRow ────────────────────────────────────────────────────────────────

interface PickerRowProps {
  item: PickerItem;
  config: { icon: string; label: string; color: string };
  linked: boolean;
  onSelect: () => void;
}

function PickerRow({ item, config, linked, onSelect }: PickerRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      disabled={linked}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '7px 8px',
        borderRadius: 8,
        border: 'none',
        cursor: linked ? 'default' : 'pointer',
        backgroundColor: hovered && !linked ? 'var(--color-bg-hover)' : 'transparent',
        textAlign: 'left',
        transition: 'background-color 0.1s',
        opacity: linked ? 0.7 : 1,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 15, flexShrink: 0 }}>{config.icon}</span>

      {/* Title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            color: 'var(--color-text-primary)',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.title}
        </span>
        {item.meta && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              display: 'block',
            }}
          >
            {item.meta}
          </span>
        )}
      </div>

      {/* Already linked badge */}
      {linked ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 9999,
            backgroundColor: 'var(--color-success-soft)',
            color: 'var(--color-success)',
            border: '1px solid rgba(74,222,128,0.3)',
            flexShrink: 0,
          }}
        >
          <Check size={10} />
          Linked
        </span>
      ) : (
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: 9999,
            backgroundColor: config.color + '18',
            color: config.color,
            border: `1px solid ${config.color}35`,
            flexShrink: 0,
            opacity: hovered ? 1 : 0.6,
          }}
        >
          {config.label.replace(/s$/, '')}
        </span>
      )}
    </button>
  );
}
