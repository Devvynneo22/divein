import React, { useState } from 'react';
import { useTaskSettingsStore, DEFAULT_CUSTOM_STATUSES, type CustomStatus } from '@/shared/stores/taskSettingsStore';

const STATE_OPTIONS: { value: CustomStatus['state']; label: string }[] = [
  { value: 'unstarted', label: 'Unstarted' },
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const STATE_COLORS: Record<CustomStatus['state'], string> = {
  unstarted: 'var(--color-text-muted)',
  active:    'var(--color-accent)',
  completed: 'var(--color-success, #4ade80)',
};

interface EditingStatus {
  id: string | null; // null = new
  name: string;
  state: CustomStatus['state'];
  color: string;
}

const EMPTY_NEW: EditingStatus = { id: null, name: '', state: 'unstarted', color: '#60a5fa' };

interface CustomStatusManagerProps {
  onClose: () => void;
}

export function CustomStatusManager({ onClose }: CustomStatusManagerProps) {
  const { customStatuses, addCustomStatus, updateCustomStatus, removeCustomStatus, resetStatuses } =
    useTaskSettingsStore();

  const [editing, setEditing] = useState<EditingStatus | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  function startAdd() {
    setEditing({ ...EMPTY_NEW });
  }

  function startEdit(s: CustomStatus) {
    setEditing({ id: s.id, name: s.name, state: s.state, color: s.color });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit() {
    if (!editing || !editing.name.trim()) return;
    if (editing.id === null) {
      addCustomStatus({ name: editing.name.trim(), state: editing.state, color: editing.color });
    } else {
      updateCustomStatus(editing.id, { name: editing.name.trim(), state: editing.state, color: editing.color });
    }
    setEditing(null);
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 13,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-md)',
          width: 480,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Workflow Statuses
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Customize status names, colors, and workflow states.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: 20,
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            ×
          </button>
        </div>

        {/* Status list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {customStatuses.map((s) => (
            <div
              key={s.id}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                backgroundColor: hovered === s.id ? 'var(--color-bg-hover)' : 'transparent',
                transition: 'background-color 0.12s',
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: s.color,
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />

              {/* Name */}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {s.name}
              </span>

              {/* State badge */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: STATE_COLORS[s.state],
                  textTransform: 'capitalize',
                }}
              >
                {s.state}
              </span>

              {/* Core badge */}
              {s.isCore && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>core</span>
              )}

              {/* Edit button */}
              {hovered === s.id && (
                <button
                  onClick={() => startEdit(s)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-accent)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  Edit
                </button>
              )}

              {/* Delete button (non-core only) */}
              {hovered === s.id && !s.isCore && (
                <button
                  onClick={() => removeCustomStatus(s.id)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-danger, #ef4444)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Edit / Add form */}
        {editing && (
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: '14px 20px',
              backgroundColor: 'var(--color-bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {editing.id === null ? 'Add New Status' : 'Edit Status'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Color picker */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: editing.color,
                    border: '2px solid var(--color-border)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <input
                    type="color"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </div>
              </label>

              {/* Name */}
              <input
                autoFocus
                type="text"
                placeholder="Status name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                style={{ ...inputStyle, flex: 1 }}
              />

              {/* State selector */}
              <select
                value={editing.state}
                onChange={(e) => setEditing({ ...editing, state: e.target.value as CustomStatus['state'] })}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: 28,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2371717a' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                {STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={cancelEdit}
                style={{ fontSize: 13, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 6 }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!editing.name.trim()}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: editing.name.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                  border: 'none',
                  cursor: editing.name.trim() ? 'pointer' : 'default',
                  padding: '5px 14px',
                  borderRadius: 6,
                }}
              >
                {editing.id === null ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
              }}
            >
              Reset to defaults
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-danger, #ef4444)' }}>Are you sure?</span>
              <button
                onClick={() => { resetStatuses(); setConfirmReset(false); }}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-danger, #ef4444)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={startAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent-soft)',
              border: '1px solid var(--color-accent)',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            + Add Status
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomStatusManager;
