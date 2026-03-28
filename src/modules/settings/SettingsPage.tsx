import { useState } from 'react';
import { Settings, Palette, Clock, BookOpen, Database, Info, RotateCcw } from 'lucide-react';
import { useTimerStore } from '@/shared/stores/timerStore';
import type { PomodoroSettings } from '@/shared/types/timer';

type SettingsTab = 'general' | 'pomodoro' | 'flashcards' | 'data' | 'about';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Palette size={16} /> },
  { key: 'pomodoro', label: 'Pomodoro', icon: <Clock size={16} /> },
  { key: 'flashcards', label: 'Flashcards', icon: <BookOpen size={16} /> },
  { key: 'data', label: 'Data', icon: <Database size={16} /> },
  { key: 'about', label: 'About', icon: <Info size={16} /> },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <div className="w-52 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} className="text-[var(--color-text-muted)]" />
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
        <nav className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--color-accent)] bg-opacity-15 text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'pomodoro' && <PomodoroSettingsPanel />}
        {activeTab === 'flashcards' && <FlashcardSettings />}
        {activeTab === 'data' && <DataSettings />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

// ─── General ────────────────────────────────────────────────────────────────

function GeneralSettings() {
  return (
    <div>
      <SectionHeader title="General" description="App-wide preferences." />

      <SettingRow label="Theme" description="Color scheme for the app.">
        <select
          defaultValue="dark"
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
        >
          <option value="dark">Dark</option>
          <option value="light" disabled>
            Light (coming soon)
          </option>
        </select>
      </SettingRow>

      <SettingRow label="Sidebar" description="Default sidebar state on app start.">
        <select
          defaultValue="expanded"
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </select>
      </SettingRow>

      <SettingRow label="Date format" description="How dates appear throughout the app.">
        <select
          defaultValue="relative"
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
        >
          <option value="relative">Relative (Today, Tomorrow)</option>
          <option value="short">Short (Mar 28)</option>
          <option value="long">Long (March 28, 2026)</option>
        </select>
      </SettingRow>

      <SettingRow label="Start of week" description="First day of the week in calendar views.">
        <select
          defaultValue="1"
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none"
        >
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="6">Saturday</option>
        </select>
      </SettingRow>
    </div>
  );
}

// ─── Pomodoro ───────────────────────────────────────────────────────────────

function PomodoroSettingsPanel() {
  const { settings, updateSettings } = useTimerStore();

  return (
    <div>
      <SectionHeader title="Pomodoro Timer" description="Configure your focus and break intervals." />

      <SettingRow label="Work duration" description="Length of each focus session.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={120}
            value={settings.workMin}
            onChange={(e) => updateSettings({ workMin: Number(e.target.value) || 25 })}
            className="w-20 px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none text-center"
          />
          <span className="text-xs text-[var(--color-text-muted)]">minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Short break" description="Break after each work session.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={settings.shortBreakMin}
            onChange={(e) => updateSettings({ shortBreakMin: Number(e.target.value) || 5 })}
            className="w-20 px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none text-center"
          />
          <span className="text-xs text-[var(--color-text-muted)]">minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Long break" description="Break after completing a set of pomodoros.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={120}
            value={settings.longBreakMin}
            onChange={(e) => updateSettings({ longBreakMin: Number(e.target.value) || 15 })}
            className="w-20 px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none text-center"
          />
          <span className="text-xs text-[var(--color-text-muted)]">minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Long break after" description="Number of pomodoros before a long break.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={2}
            max={10}
            value={settings.longBreakAfter}
            onChange={(e) => updateSettings({ longBreakAfter: Number(e.target.value) || 4 })}
            className="w-20 px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none text-center"
          />
          <span className="text-xs text-[var(--color-text-muted)]">sessions</span>
        </div>
      </SettingRow>

      <SettingRow label="Auto-start break" description="Automatically start break after work ends.">
        <ToggleSwitch
          checked={settings.autoStartBreak}
          onChange={(v) => updateSettings({ autoStartBreak: v })}
        />
      </SettingRow>

      <SettingRow label="Auto-start work" description="Automatically start work after break ends.">
        <ToggleSwitch
          checked={settings.autoStartWork}
          onChange={(v) => updateSettings({ autoStartWork: v })}
        />
      </SettingRow>

      <div className="mt-6">
        <button
          onClick={() =>
            updateSettings({
              workMin: 25,
              shortBreakMin: 5,
              longBreakMin: 15,
              longBreakAfter: 4,
              autoStartBreak: false,
              autoStartWork: false,
            })
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

// ─── Flashcards ─────────────────────────────────────────────────────────────

function FlashcardSettings() {
  return (
    <div>
      <SectionHeader title="Flashcards" description="Spaced repetition preferences." />

      <SettingRow label="Default new cards per day" description="Maximum new cards shown daily per deck.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            defaultValue={20}
            className="w-20 px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] outline-none text-center"
          />
          <span className="text-xs text-[var(--color-text-muted)]">cards</span>
        </div>
      </SettingRow>

      <SettingRow label="Show interval preview" description="Display next review interval on rating buttons.">
        <ToggleSwitch checked={true} onChange={() => {}} />
      </SettingRow>
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

function DataSettings() {
  return (
    <div>
      <SectionHeader title="Data" description="Storage and backup settings." />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-4 mb-4">
        <div className="text-sm font-medium mb-1">Current storage</div>
        <div className="text-xs text-[var(--color-text-muted)]">
          In-memory (web-only development mode). Data resets on page refresh.
        </div>
        <div className="text-xs text-[var(--color-text-muted)] mt-1">
          SQLite persistence will be available when Electron is wired.
        </div>
      </div>

      <SettingRow label="Auto-backup" description="Automatically backup database on schedule.">
        <select
          defaultValue="disabled"
          disabled
          className="px-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] outline-none opacity-50"
        >
          <option value="disabled">Disabled (requires Electron)</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </SettingRow>
    </div>
  );
}

// ─── About ──────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div>
      <SectionHeader title="About Nexus" description="" />

      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-6 text-center">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-xl font-bold mb-1">Nexus</div>
          <div className="text-sm text-[var(--color-text-muted)]">v0.1.0 — Development Build</div>
        </div>

        <div className="text-xs text-[var(--color-text-muted)] space-y-1">
          <div>Local-first productivity super-app</div>
          <div>React 19 + TypeScript + Tailwind CSS 4</div>
          <div>Architecture: Electron (planned) + SQLite + Drizzle ORM</div>
        </div>

        <div className="text-xs text-[var(--color-text-muted)] pt-4 border-t border-[var(--color-border)]">
          <div className="font-medium text-[var(--color-text-secondary)] mb-1">Keyboard shortcuts</div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4">
            <span>Command palette</span>
            <span className="text-[var(--color-text-primary)]">Ctrl+K</span>
            <span>Navigate modules</span>
            <span className="text-[var(--color-text-primary)]">Sidebar click</span>
            <span>Quick-add task</span>
            <span className="text-[var(--color-text-primary)]">Dashboard Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ──────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{description}</p>
      )}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--color-border)]">
      <div className="mr-4">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">{label}</div>
        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
