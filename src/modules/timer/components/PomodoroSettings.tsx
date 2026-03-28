import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import type { PomodoroSettings } from '@/shared/types/timer';

interface PomodoroSettingsProps {
  settings: PomodoroSettings;
  onChange: (partial: Partial<PomodoroSettings>) => void;
}

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}

function NumberInput({ label, value, min, max, onChange, unit = 'min' }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-[var(--color-text-secondary)]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-28 accent-[var(--color-accent)]"
        />
        <span className="text-sm font-medium text-[var(--color-text-primary)] w-16 text-right tabular-nums">
          {value} {unit}
        </span>
      </div>
    </div>
  );
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-[var(--color-text-secondary)]">{label}</label>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-tertiary)]'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function PomodoroSettings({ settings, onChange }: PomodoroSettingsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors text-sm font-medium text-[var(--color-text-secondary)]"
      >
        <span className="flex items-center gap-2">
          <Settings2 size={14} />
          Pomodoro Settings
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="px-4 py-4 bg-[var(--color-bg-elevated)] flex flex-col gap-4">
          <NumberInput
            label="Work duration"
            value={settings.workMin}
            min={1}
            max={90}
            onChange={(v) => onChange({ workMin: v })}
          />
          <NumberInput
            label="Short break"
            value={settings.shortBreakMin}
            min={1}
            max={30}
            onChange={(v) => onChange({ shortBreakMin: v })}
          />
          <NumberInput
            label="Long break"
            value={settings.longBreakMin}
            min={5}
            max={60}
            onChange={(v) => onChange({ longBreakMin: v })}
          />
          <NumberInput
            label="Long break after"
            value={settings.longBreakAfter}
            min={2}
            max={8}
            unit="pomodoros"
            onChange={(v) => onChange({ longBreakAfter: v })}
          />
          <div className="h-px bg-[var(--color-border)]" />
          <Toggle
            label="Auto-start breaks"
            checked={settings.autoStartBreak}
            onChange={(v) => onChange({ autoStartBreak: v })}
          />
          <Toggle
            label="Auto-start work"
            checked={settings.autoStartWork}
            onChange={(v) => onChange({ autoStartWork: v })}
          />
        </div>
      )}
    </div>
  );
}
