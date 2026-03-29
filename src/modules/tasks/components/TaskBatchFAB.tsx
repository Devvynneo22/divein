import React, { useState, useRef, useEffect } from 'react';
import { X, CheckSquare, Flag, Calendar, Trash2 } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '@/shared/types/task';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'backlog',     label: 'Backlog' },
  { value: 'inbox',      label: 'Inbox' },
  { value: 'todo',       label: 'Todo' },
  { value: 'in_progress',label: 'In Progress' },
  { value: 'in_review',  label: 'In Review' },
  { value: 'done',       label: 'Done' },
  { value: 'cancelled',  label: 'Cancelled' },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 0, label: 'None',   color: 'var(--color-text-muted)' },
  { value: 1, label: 'Low',    color: 'var(--color-p1, #3b82f6)' },
  { value: 2, label: 'Medium', color: 'var(--color-p2, #eab308)' },
  { value: 3, label: 'High',   color: 'var(--color-p3, #f97316)' },
  { value: 4, label: 'Urgent', color: 'var(--color-p4, #ef4444)' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type OpenMenu = 'status' | 'priority' | 'dueDate' | null;

interface TaskBatchFABProps {
  selectedCount: number;
  onSetStatus: (status: TaskStatus) => void;
  onSetPriority: (priority: TaskPriority) => void;
  onSetDueDate: (date: string | null) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FABButton({
  icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlighted = active || hovered;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 8,
        border: 'none',
        backgroundColor: highlighted
          ? danger
            ? 'var(--color-danger-soft)'
            : 'var(--color-bg-hover)'
          : 'transparent',
        color: danger
          ? 'var(--color-danger)'
          : highlighted
          ? 'var(--color-text-primary)'
          : 'var(--color-text-secondary)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        backgroundColor: 'var(--color-border)',
        margin: '0 2px',
        flexShrink: 0,
      }}
    />
  );
}

function PopoverMenu({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        minWidth: 160,
      }}
    >
      {children}
    </div>
  );
}

function PopoverItem({
  onClick,
  children,
  color,
}: {
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 14px',
        textAlign: 'left',
        fontSize: 13,
        color: color ?? 'var(--color-text-primary)',
        background: hovered ? 'var(--color-bg-hover)' : 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.1s ease',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskBatchFAB({
  selectedCount,
  onSetStatus,
  onSetPriority,
  onSetDueDate,
  onDelete,
  onClearSelection,
}: TaskBatchFABProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [dateInput, setDateInput] = useState('');
  const fabRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (openMenu) {
          setOpenMenu(null);
        } else {
          onClearSelection();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu, onClearSelection]);

  function toggleMenu(menu: OpenMenu) {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes fab-rise {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div
        ref={fabRef}
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          animation: 'fab-rise 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: 'auto',
        }}
      >
        {/* ── Popovers (render above the bar) ──────────────────────────── */}
        {openMenu === 'status' && (
          <PopoverMenu>
            {STATUSES.map((s) => (
              <PopoverItem
                key={s.value}
                onClick={() => { onSetStatus(s.value); setOpenMenu(null); }}
              >
                {s.label}
              </PopoverItem>
            ))}
          </PopoverMenu>
        )}

        {openMenu === 'priority' && (
          <PopoverMenu>
            {PRIORITIES.map((p) => (
              <PopoverItem
                key={p.value}
                onClick={() => { onSetPriority(p.value); setOpenMenu(null); }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: p.color,
                    flexShrink: 0,
                  }}
                />
                {p.label}
              </PopoverItem>
            ))}
          </PopoverMenu>
        )}

        {openMenu === 'dueDate' && (
          <div
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              minWidth: 200,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
              }}
            >
              Set Due Date
            </span>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              autoFocus
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                width: '100%',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  onSetDueDate(dateInput ? dateInput : null);
                  setOpenMenu(null);
                  setDateInput('');
                }}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
              >
                Apply
              </button>
              <button
                onClick={() => { onSetDueDate(null); setOpenMenu(null); setDateInput(''); }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── FAB bar ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '6px 10px',
            borderRadius: 14,
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Count badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 8,
              backgroundColor: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <CheckSquare size={12} />
            {selectedCount} selected
          </div>

          <Divider />

          <FABButton
            icon={<CheckSquare size={12} />}
            label="Status"
            active={openMenu === 'status'}
            onClick={() => toggleMenu('status')}
          />
          <FABButton
            icon={<Flag size={12} />}
            label="Priority"
            active={openMenu === 'priority'}
            onClick={() => toggleMenu('priority')}
          />
          <FABButton
            icon={<Calendar size={12} />}
            label="Due Date"
            active={openMenu === 'dueDate'}
            onClick={() => toggleMenu('dueDate')}
          />

          <Divider />

          <FABButton
            icon={<Trash2 size={12} />}
            label="Delete"
            danger
            onClick={() => { onDelete(); setOpenMenu(null); }}
          />

          <Divider />

          {/* Clear selection */}
          <button
            onClick={onClearSelection}
            title="Clear selection (Esc)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </>
  );
}
