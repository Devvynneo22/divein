import React, { useState } from 'react';
import { useActivityStore, type ActivityItem, type ActivityType } from '@/shared/stores/activityStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  limit?: number;
  filterTypes?: ActivityType[];
  compact?: boolean;
  onNavigate?: (entityType: string, entityId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'Yesterday';
  return `${Math.floor(diff / 86400)}d ago`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getItemDayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDay.getTime() === today.getTime()) return 'Today';
  if (itemDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Soft background per activity type for the icon circle
const TYPE_ICON_BG: Record<ActivityType, string> = {
  task_created:       'rgba(59,130,246,0.12)',
  task_completed:     'rgba(34,197,94,0.12)',
  task_status_changed:'rgba(249,115,22,0.12)',
  note_created:       'rgba(168,85,247,0.12)',
  note_updated:       'rgba(168,85,247,0.10)',
  habit_checked:      'rgba(20,184,166,0.12)',
  timer_completed:    'rgba(234,179,8,0.12)',
  project_created:    'rgba(59,130,246,0.12)',
  flashcard_studied:  'rgba(239,68,68,0.10)',
  deck_created:       'rgba(239,68,68,0.12)',
};

// ─── Compact Card ─────────────────────────────────────────────────────────────

function CompactCard({ item, onClick }: { item: ActivityItem; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--color-border)',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'var(--color-bg-elevated)',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: 100,
        maxWidth: 130,
        flexShrink: 0,
        transition: 'background-color 0.12s ease',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: TYPE_ICON_BG[item.type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}
      >
        {item.icon}
      </div>
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
        }}
      >
        {item.title}
      </span>
      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
        {relativeTime(item.timestamp)}
      </span>
    </div>
  );
}

// ─── List Item ────────────────────────────────────────────────────────────────

function ActivityListItem({ item, onClick }: { item: ActivityItem; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 8,
        minHeight: 40,
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: hovered ? 'var(--color-bg-hover)' : 'transparent',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: TYPE_ICON_BG[item.type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>

      {/* Text */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.title}
      >
        {item.title}
      </span>

      {/* Timestamp */}
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          marginLeft: 4,
        }}
      >
        {relativeTime(item.timestamp)}
      </span>
    </div>
  );
}

// ─── Day separator ────────────────────────────────────────────────────────────

function DaySeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px 2px',
      }}
    >
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

export function ActivityFeed({ limit = 20, filterTypes, compact = false, onNavigate }: ActivityFeedProps) {
  const activities = useActivityStore((s) => s.activities);

  const filtered = (filterTypes && filterTypes.length > 0
    ? activities.filter((a) => filterTypes.includes(a.type))
    : activities
  ).slice(0, limit);

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding: compact ? '12px' : '24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: 13,
        }}
      >
        No activity yet
      </div>
    );
  }

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '4px 2px',
          scrollbarWidth: 'none',
        }}
      >
        {filtered.map((item) => (
          <CompactCard
            key={item.id}
            item={item}
            onClick={
              item.entityType && item.entityId && onNavigate
                ? () => onNavigate(item.entityType!, item.entityId!)
                : undefined
            }
          />
        ))}
      </div>
    );
  }

  // Group by day for vertical list
  const groups: { dayLabel: string; items: ActivityItem[] }[] = [];
  let currentDay = '';
  for (const item of filtered) {
    const dl = getItemDayLabel(item.timestamp);
    if (dl !== currentDay) {
      currentDay = dl;
      groups.push({ dayLabel: dl, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map((group) => (
        <React.Fragment key={group.dayLabel}>
          <DaySeparator label={group.dayLabel} />
          {group.items.map((item) => (
            <ActivityListItem
              key={item.id}
              item={item}
              onClick={
                item.entityType && item.entityId && onNavigate
                  ? () => onNavigate(item.entityType!, item.entityId!)
                  : undefined
              }
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

export default ActivityFeed;
