import React, { useState, useRef } from 'react';
import type { TaskStatus, TaskPriority } from '@/shared/types/task';
import { TaskFilterChips } from './TaskFilterChips';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import type { TaskDensity } from '@/shared/stores/appSettingsStore';

interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  dueBefore?: string;
  /** Client-side only: filter tasks with no due date set */
  noDueDate?: boolean;
}

interface TaskToolbarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  groupBy: string;
  onGroupByChange: (g: string) => void;
  sortBy: string;
  onSortByChange: (s: string) => void;
  filters: TaskFilters;
  onFilterChange: (f: TaskFilters) => void;
  onNewTask?: () => void;
}

const GROUP_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'dueDate', label: 'Due Date' },
];

const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'createdAt', label: 'Created' },
  { value: 'title', label: 'Title' },
];

const DENSITY_OPTIONS: { value: TaskDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'spacious', label: 'Spacious' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 4, label: 'Urgent' },
  { value: 3, label: 'High' },
  { value: 2, label: 'Medium' },
  { value: 1, label: 'Low' },
  { value: 0, label: 'No Priority' },
];

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '5px 8px',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
  paddingRight: 24,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
};

function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    (filters.status?.length ?? 0) > 0 ||
    (filters.priority?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0 ||
    !!filters.dueBefore ||
    !!filters.noDueDate
  );
}

export function TaskToolbar({
  onSearch,
  searchQuery,
  groupBy,
  onGroupByChange,
  sortBy,
  onSortByChange,
  filters,
  onFilterChange,
  onNewTask,
}: TaskToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const density = useAppSettingsStore((s) => s.app.taskDensity);
  const updateApp = useAppSettingsStore((s) => s.updateApp);

  const filtersActive = hasActiveFilters(filters);

  const toggleStatusFilter = (status: TaskStatus) => {
    const current = filters.status ?? [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const togglePriorityFilter = (priority: TaskPriority) => {
    const current = filters.priority ?? [];
    const updated = current.includes(priority)
      ? current.filter((p) => p !== priority)
      : [...current, priority];
    onFilterChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
  };

  const handleRemoveFilter = (key: string, value?: string) => {
    if (key === 'status' && value) {
      const updated = (filters.status ?? []).filter((s) => s !== value);
      onFilterChange({ ...filters, status: updated.length > 0 ? updated : undefined });
    } else if (key === 'priority' && value) {
      const updated = (filters.priority ?? []).filter((p) => String(p) !== value);
      onFilterChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
    } else if (key === 'tags' && value) {
      const updated = (filters.tags ?? []).filter((t) => t !== value);
      onFilterChange({ ...filters, tags: updated.length > 0 ? updated : undefined });
    } else if (key === 'dueBefore') {
      onFilterChange({ ...filters, dueBefore: undefined });
    } else if (key === 'noDueDate') {
      onFilterChange({ ...filters, noDueDate: undefined });
    }
  };

  const handleClearAll = () => {
    onFilterChange({});
  };

  // Count active filters for the badge
  const filterCount =
    (filters.status?.length ?? 0) +
    (filters.priority?.length ?? 0) +
    (filters.tags?.length ?? 0) +
    (filters.dueBefore ? 1 : 0) +
    (filters.noDueDate ? 1 : 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Search input */}
      <div style={{ position: 'relative', width: 200, flexShrink: 0 }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            fontSize: 13,
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: `1px solid ${searchFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 6,
            padding: '5px 8px 5px 28px',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filter dropdown */}
      <div style={{ position: 'relative' }} ref={filterRef}>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 500,
            color: filtersActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            backgroundColor: filtersActive ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
            border: `1px solid ${filtersActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 6,
            padding: '5px 10px',
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 2.5h11M3 6.5h7M5 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Filter
          {filtersActive && (
            <span
              style={{
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: 'var(--color-accent)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {filterCount}
            </span>
          )}
        </button>

        {/* Filter popover */}
        {filterOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: 50,
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-md)',
              padding: 12,
              minWidth: 220,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}
              >
                Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {STATUS_OPTIONS.map((opt) => {
                  const checked = filters.status?.includes(opt.value) ?? false;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        padding: '3px 4px',
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStatusFilter(opt.value)}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: 6,
                }}
              >
                Priority
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const checked = filters.priority?.includes(opt.value) ?? false;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        padding: '3px 4px',
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePriorityFilter(opt.value)}
                        style={{ accentColor: 'var(--color-accent)' }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => {
                  handleClearAll();
                  setFilterOpen(false);
                }}
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: 4,
                }}
              >
                Clear filters
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  borderRadius: 4,
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Group by */}
      <div style={{ position: 'relative' }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>
          Group:
        </label>
        <select
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value)}
          style={selectStyle}
        >
          {GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort by */}
      <div style={{ position: 'relative' }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>
          Sort:
        </label>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          style={selectStyle}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Density */}
      <div style={{ position: 'relative' }}>
        <label style={{ fontSize: 12, color: 'var(--color-text-muted)', marginRight: 4 }}>
          Density:
        </label>
        <select
          value={density}
          onChange={(e) => updateApp({ taskDensity: e.target.value as TaskDensity })}
          style={selectStyle}
        >
          {DENSITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Click outside to close filter popover */}
      {filterOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
          }}
          onClick={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}
