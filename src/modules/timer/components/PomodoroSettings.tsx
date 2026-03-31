import { useState } from 'react';
import { Settings2, ChevronDown } from 'lucide-react';
import type { PomodoroSettings } from '@/shared/types/timer';

interface PomodoroSettingsProps {
  settings: PomodoroSettings;
  onChange: (partial: Partial<PomodoroSettings>) => void;
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}

function Stepper({ label, value, min, max, step = 1, unit, onChange }: StepperProps) {
  const [minusHovered, setMinusHovered] = useState(false);
  const [plusHovered, setPlusHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <label style={{ fontSize: '0.85rem', flex: 1, color: 'var(--color-text-secondary)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          onMouseEnter={() => setMinusHovered(true)}
          onMouseLeave={() => setMinusHovered(false)}
          aria-label={`Decrease ${label}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border)',
            backgroundColor:
              minusHovered && value > min
                ? 'var(--color-bg-elevated)'
                : 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: value <= min ? 'not-allowed' : 'pointer',
            opacity: value <= min ? 0.3 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          −
        </button>

        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
            minWidth: '3.2rem',
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
            color: 'var(--color-text-primary)',
          }}
        >
          {value}
          <span
            style={{
              marginLeft: 4,
              fontSize: '0.75rem',
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              fontFamily: 'inherit',
            }}
          >
            {unit}
          </span>
        </span>

        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          onMouseEnter={() => setPlusHovered(true)}
          onMouseLeave={() => setPlusHovered(false)}
          aria-label={`Increase ${label}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-border)',
            backgroundColor:
              plusHovered && value < max
                ? 'var(--color-bg-elevated)'
                : 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: value >= max ? 'not-allowed' : 'pointer',
            opacity: value >= max ? 0.3 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
          {label}
        </p>
        {description && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              margin: '2px 0 0',
            }}
          >
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          flexShrink: 0,
          width: 40,
          height: 22,
          borderRadius: 11,
          border: 'none',
          cursor: 'pointer',
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
          transition: 'background-color 0.2s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    </div>
  );
}

export function PomodoroSettings({ settings, onChange }: PomodoroSettingsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [headerHovered, setHeaderHovered] = useState(false);

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* ── Collapsible header ──────────────────────────────────────── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: headerHovered
            ? 'var(--color-bg-tertiary)'
            : 'transparent',
          border: 'none',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            flexShrink: 0,
          }}
        >
          <Settings2 size={13} style={{ color: 'var(--color-accent)' }} />
        </div>

        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            flex: 1,
            textAlign: 'left',
            color: 'var(--color-text-primary)',
          }}
        >
          Pomodoro Settings
        </span>

        <ChevronDown
          size={15}
          style={{
            color: 'var(--color-text-muted)',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Body (collapsible) ──────────────────────────────────────── */}
      {!isCollapsed && (
        <div
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Durations */}
          <div
            style={{
              borderRadius: 8,
              padding: '12px',
              backgroundColor: 'var(--color-bg-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Durations
            </p>
            <Stepper
              label="Focus"
              value={settings.workMin}
              min={1}
              max={90}
              step={5}
              unit="min"
              onChange={(v) => onChange({ workMin: v })}
            />
            <Stepper
              label="Short break"
              value={settings.shortBreakMin}
              min={1}
              max={30}
              step={1}
              unit="min"
              onChange={(v) => onChange({ shortBreakMin: v })}
            />
            <Stepper
              label="Long break"
              value={settings.longBreakMin}
              min={5}
              max={60}
              step={5}
              unit="min"
              onChange={(v) => onChange({ longBreakMin: v })}
            />
            <Stepper
              label="Sessions before long break"
              value={settings.longBreakAfter}
              min={2}
              max={8}
              step={1}
              unit="sessions"
              onChange={(v) => onChange({ longBreakAfter: v })}
            />
          </div>

          {/* Behaviour */}
          <div
            style={{
              borderRadius: 8,
              padding: '12px',
              backgroundColor: 'var(--color-bg-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Behaviour
            </p>
            <Toggle
              label="Auto-start breaks"
              description="Start break timer when focus ends"
              checked={settings.autoStartBreak}
              onChange={(v) => onChange({ autoStartBreak: v })}
            />
            <Toggle
              label="Auto-start focus"
              description="Start focus timer when break ends"
              checked={settings.autoStartWork}
              onChange={(v) => onChange({ autoStartWork: v })}
            />
            <Toggle
              label="Audio notifications"
              description="Play a tone on phase transitions"
              checked={settings.audioEnabled}
              onChange={(v) => onChange({ audioEnabled: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
