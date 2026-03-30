import { Settings2 } from 'lucide-react';
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
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        className="text-sm flex-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-7 h-7 rounded-lg text-base font-bold flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
          }}
          onMouseEnter={(e) => {
            if (value > min) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--color-bg-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-bg-tertiary)';
          }}
        >
          −
        </button>
        <span
          className="tabular-nums text-sm font-semibold text-center"
          style={{
            color: 'var(--color-text-primary)',
            minWidth: '3.4rem',
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
          }}
        >
          {value}
          <span
            className="ml-1 text-xs font-normal"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {unit}
          </span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-7 h-7 rounded-lg text-base font-bold flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-primary)',
          }}
          onMouseEnter={(e) => {
            if (value < max) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                'var(--color-bg-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'var(--color-bg-tertiary)';
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
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 w-10 h-5 rounded-full transition-colors"
        style={{
          backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

export function PomodoroSettings({ settings, onChange }: PomodoroSettingsProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{
            backgroundColor:
              'var(--color-accent-soft, color-mix(in srgb, var(--color-accent) 15%, transparent))',
          }}
        >
          <Settings2 size={13} style={{ color: 'var(--color-accent)' }} />
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Pomodoro Settings
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Durations */}
        <div
          className="rounded-lg px-3 py-3 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
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

        {/* Behaviour toggles */}
        <div
          className="rounded-lg px-3 py-3 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-text-muted)' }}
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
    </div>
  );
}
