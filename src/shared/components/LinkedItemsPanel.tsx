import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Link } from 'lucide-react';
import { useLinkStore, type LinkableType, type CrossLink } from '@/shared/stores/linkStore';
import { LinkPickerModal } from './LinkPickerModal';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useNotes } from '@/modules/notes/hooks/useNotes';
import { useProjects } from '@/modules/projects/hooks/useProjects';
import { useEvents } from '@/modules/calendar/hooks/useEvents';
import { useHabits } from '@/modules/habits/hooks/useHabits';
import { useDecks } from '@/modules/flashcards/hooks/useFlashcards';

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  LinkableType,
  { icon: string; label: string; color: string; route: string }
> = {
  task:    { icon: '✅', label: 'Task',    color: 'var(--color-accent)',               route: '/tasks'      },
  note:    { icon: '📝', label: 'Note',    color: '#a78bfa',                           route: '/notes'      },
  project: { icon: '📁', label: 'Project', color: '#fb923c',                           route: '/projects'   },
  event:   { icon: '📅', label: 'Event',   color: 'var(--color-success, #4ade80)',     route: '/calendar'   },
  habit:   { icon: '🎯', label: 'Habit',   color: 'var(--color-success, #34d399)',     route: '/habits'     },
  deck:    { icon: '🃏', label: 'Deck',    color: '#fbbf24',                           route: '/flashcards' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Hook to resolve item titles ──────────────────────────────────────────────

function useItemTitle(type: LinkableType, id: string): string {
  const { data: tasks = [] }    = useTasks();
  const { data: notes = [] }    = useNotes();
  const { data: projects = [] } = useProjects();
  const { data: events = [] }   = useEvents();
  const { data: habits = [] }   = useHabits();
  const { data: decks = [] }    = useDecks();

  switch (type) {
    case 'task':    return tasks.find((t) => t.id === id)?.title ?? 'Unknown Task';
    case 'note':    return notes.find((n) => n.id === id)?.title || 'Untitled Note';
    case 'project': return projects.find((p) => p.id === id)?.name ?? 'Unknown Project';
    case 'event':   return events.find((e) => e.id === id)?.title ?? 'Unknown Event';
    case 'habit':   return habits.find((h) => h.id === id)?.name ?? 'Unknown Habit';
    case 'deck':    return decks.find((d) => d.id === id)?.name ?? 'Unknown Deck';
    default:        return 'Unknown';
  }
}

// ─── LinkedItemRow ────────────────────────────────────────────────────────────

interface LinkedItemRowProps {
  link: CrossLink;
  sourceType: LinkableType;
  sourceId: string;
  onRemove: () => void;
}

function LinkedItemRow({ link, sourceType, sourceId, onRemove }: LinkedItemRowProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  // Determine the "other" side
  const isSource = link.sourceType === sourceType && link.sourceId === sourceId;
  const targetType = isSource ? link.targetType : link.sourceType;
  const targetId   = isSource ? link.targetId   : link.sourceId;

  const config = TYPE_CONFIG[targetType];
  const title  = useItemTitle(targetType, targetId);

  const handleClick = () => {
    navigate(config.route);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '0 6px',
        borderRadius: 6,
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {/* Type icon */}
      <span style={{ fontSize: 14, flexShrink: 0 }}>{config.icon}</span>

      {/* Title */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>

      {/* Type pill */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: 9999,
          backgroundColor: config.color + '22',
          color: config.color,
          border: `1px solid ${config.color}44`,
          flexShrink: 0,
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.1s',
        }}
      >
        {config.label}
      </span>

      {/* Relative time */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          opacity: hovered ? 0 : 1,
          transition: 'opacity 0.1s',
          minWidth: 40,
          textAlign: 'right',
        }}
      >
        {relativeTime(link.createdAt)}
      </span>

      {/* Remove button — only visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove link"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.1s',
          position: 'absolute',
          right: 6,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.backgroundColor = 'var(--color-danger-soft)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Compact pill ─────────────────────────────────────────────────────────────

interface CompactPillProps {
  link: CrossLink;
  sourceType: LinkableType;
  sourceId: string;
  onRemove: () => void;
}

function CompactPill({ link, sourceType, sourceId, onRemove }: CompactPillProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const isSource  = link.sourceType === sourceType && link.sourceId === sourceId;
  const targetType = isSource ? link.targetType : link.sourceType;
  const targetId   = isSource ? link.targetId   : link.sourceId;

  const config = TYPE_CONFIG[targetType];
  const title  = useItemTitle(targetType, targetId);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px 2px 6px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: config.color + '18',
        color: config.color,
        border: `1px solid ${config.color}40`,
        cursor: 'pointer',
        maxWidth: 180,
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(config.route)}
    >
      <span style={{ flexShrink: 0 }}>{config.icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </span>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'inherit',
            flexShrink: 0,
            opacity: 0.7,
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ─── LinkedItemsPanel ─────────────────────────────────────────────────────────

interface LinkedItemsPanelProps {
  sourceType: LinkableType;
  sourceId: string;
  compact?: boolean;
}

export function LinkedItemsPanel({ sourceType, sourceId, compact = false }: LinkedItemsPanelProps) {
  const [showPicker, setShowPicker] = useState(false);
  const { getLinksFor, removeLink } = useLinkStore();

  const links = getLinksFor(sourceType, sourceId);

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {links.map((link) => (
          <CompactPill
            key={link.id}
            link={link}
            sourceType={sourceType}
            sourceId={sourceId}
            onRemove={() => removeLink(link.id)}
          />
        ))}
        <button
          onClick={() => setShowPicker(true)}
          title="Link item"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 7px',
            borderRadius: 9999,
            border: '1px dashed var(--color-border)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: 12,
            color: 'var(--color-text-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <Plus size={10} />
          {links.length === 0 ? 'Link item...' : 'Link'}
        </button>

        {showPicker && (
          <LinkPickerModal
            sourceType={sourceType}
            sourceId={sourceId}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    );
  }

  // ── Full panel mode ───────────────────────────────────────────────────────

  // Group links by type
  const grouped: Partial<Record<LinkableType, CrossLink[]>> = {};
  for (const link of links) {
    const isSource  = link.sourceType === sourceType && link.sourceId === sourceId;
    const targetType = isSource ? link.targetType : link.sourceType;
    if (!grouped[targetType]) grouped[targetType] = [];
    grouped[targetType]!.push(link);
  }

  const hasLinks = links.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Linked Items
        </span>
        {hasLinks && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 7px',
              borderRadius: 9999,
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
            }}
          >
            {links.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!hasLinks && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '16px 0',
          }}
        >
          <Link size={22} style={{ color: 'var(--color-border-strong)', opacity: 0.5 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No linked items</span>
        </div>
      )}

      {/* Grouped items */}
      {(Object.entries(grouped) as [LinkableType, CrossLink[]][]).map(([type, typeLinks]) => {
        const config = TYPE_CONFIG[type];
        return (
          <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Group header */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                padding: '4px 6px 2px',
              }}
            >
              {config.icon} {config.label}s
            </div>
            {typeLinks.map((link) => (
              <div key={link.id} style={{ position: 'relative' }}>
                <LinkedItemRow
                  link={link}
                  sourceType={sourceType}
                  sourceId={sourceId}
                  onRemove={() => removeLink(link.id)}
                />
              </div>
            ))}
          </div>
        );
      })}

      {/* Add link button */}
      <button
        onClick={() => setShowPicker(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px dashed var(--color-border)',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: 13,
          color: 'var(--color-text-muted)',
          marginTop: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
          e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Plus size={13} />
        Link item...
      </button>

      {showPicker && (
        <LinkPickerModal
          sourceType={sourceType}
          sourceId={sourceId}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
