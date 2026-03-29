import { useState } from 'react';
import { Settings, Palette, Clock, BookOpen, Database, Info, RotateCcw, Keyboard, CornerDownLeft } from 'lucide-react';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { shortcutService, type ShortcutDef, type ShortcutGroup } from '@/shared/lib/shortcutService';

type SettingsTab = 'general' | 'pomodoro' | 'flashcards' | 'shortcuts' | 'data' | 'about';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Palette size={16} /> },
  { key: 'pomodoro', label: 'Pomodoro', icon: <Clock size={16} /> },
  { key: 'flashcards', label: 'Flashcards', icon: <BookOpen size={16} /> },
  { key: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
  { key: 'data', label: 'Data', icon: <Database size={16} /> },
  { key: 'about', label: 'About', icon: <Info size={16} /> },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="flex h-full">
      {/* Settings sidebar */}
      <div
        className="w-52 p-4"
        style={{
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Settings size={20} style={{ color: 'var(--color-text-muted)' }} />
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Settings
          </h1>
        </div>
        <nav className="space-y-1">
          {TABS.map((tab) => (
            <SidebarTab
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'pomodoro' && <PomodoroSettingsPanel />}
        {activeTab === 'flashcards' && <FlashcardSettings />}
        {activeTab === 'shortcuts' && <ShortcutSettings />}
        {activeTab === 'data' && <DataSettings />}
        {activeTab === 'about' && <AboutSection />}
      </div>
    </div>
  );
}

// ─── Sidebar tab button ──────────────────────────────────────────────────────

function SidebarTab({
  tab,
  active,
  onClick,
}: {
  tab: { key: string; label: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors"
      style={{
        backgroundColor: active
          ? 'var(--color-accent-muted)'
          : hovered
          ? 'var(--color-bg-tertiary)'
          : 'transparent',
        color: active
          ? 'var(--color-accent)'
          : hovered
          ? 'var(--color-text-primary)'
          : 'var(--color-text-secondary)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tab.icon}
      {tab.label}
    </button>
  );
}

// ─── General ────────────────────────────────────────────────────────────────

function GeneralSettings() {
  const { app, updateApp } = useAppSettingsStore();

  return (
    <div>
      <SectionHeader title="General" description="App-wide preferences." />

      <SettingRow label="Theme" description="Color scheme for the app.">
        <SelectInput
          value={app.theme}
          onChange={(v) => updateApp({ theme: v as 'dark' | 'light' | 'system' })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </SelectInput>
      </SettingRow>

      <SettingRow label="Sidebar" description="Default sidebar state on app start.">
        <SelectInput
          value={app.sidebarDefault}
          onChange={(v) => updateApp({ sidebarDefault: v as 'expanded' | 'collapsed' })}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed</option>
        </SelectInput>
      </SettingRow>

      <SettingRow label="Date format" description="How dates appear throughout the app.">
        <SelectInput
          value={app.dateFormat}
          onChange={(v) => updateApp({ dateFormat: v as 'relative' | 'short' | 'long' })}
        >
          <option value="relative">Relative (Today, Tomorrow)</option>
          <option value="short">Short (Mar 28)</option>
          <option value="long">Long (March 28, 2026)</option>
        </SelectInput>
      </SettingRow>

      <SettingRow label="Start of week" description="First day of the week in calendar views.">
        <SelectInput
          value={String(app.startOfWeek)}
          onChange={(v) => updateApp({ startOfWeek: Number(v) as 0 | 1 | 6 })}
        >
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="6">Saturday</option>
        </SelectInput>
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
          <NumberInput
            min={1}
            max={120}
            value={settings.workMin}
            onChange={(v) => updateSettings({ workMin: v || 25 })}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Short break" description="Break after each work session.">
        <div className="flex items-center gap-2">
          <NumberInput
            min={1}
            max={60}
            value={settings.shortBreakMin}
            onChange={(v) => updateSettings({ shortBreakMin: v || 5 })}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Long break" description="Break after completing a set of pomodoros.">
        <div className="flex items-center gap-2">
          <NumberInput
            min={1}
            max={120}
            value={settings.longBreakMin}
            onChange={(v) => updateSettings({ longBreakMin: v || 15 })}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>minutes</span>
        </div>
      </SettingRow>

      <SettingRow label="Long break after" description="Number of pomodoros before a long break.">
        <div className="flex items-center gap-2">
          <NumberInput
            min={2}
            max={10}
            value={settings.longBreakAfter}
            onChange={(v) => updateSettings({ longBreakAfter: v || 4 })}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>sessions</span>
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
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
  const { flashcard, updateFlashcard } = useAppSettingsStore();

  return (
    <div>
      <SectionHeader title="Flashcards" description="Spaced repetition preferences." />

      <SettingRow label="Default new cards per day" description="Maximum new cards shown daily per deck.">
        <div className="flex items-center gap-2">
          <NumberInput
            min={1}
            max={100}
            value={flashcard.newCardsPerDay}
            onChange={(v) => updateFlashcard({ newCardsPerDay: v || 20 })}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>cards</span>
        </div>
      </SettingRow>

      <SettingRow label="Show interval preview" description="Display next review interval on rating buttons.">
        <ToggleSwitch
          checked={flashcard.showIntervalPreview}
          onChange={(v) => updateFlashcard({ showIntervalPreview: v })}
        />
      </SettingRow>
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

function DataSettings() {
  return (
    <div>
      <SectionHeader title="Data" description="Storage and backup settings." />

      <div
        className="rounded-lg p-4 mb-4"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-tertiary)',
        }}
      >
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Current storage
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          localStorage (browser). Your data persists across page refreshes.
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          SQLite persistence will be available when Electron is wired.
        </div>
      </div>

      <SettingRow label="Auto-backup" description="Automatically backup database on schedule.">
        <select
          defaultValue="disabled"
          disabled
          className="px-3 py-1.5 rounded-md text-sm outline-none opacity-50"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
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
      <SectionHeader title="About DiveIn" description="" />

      <div className="space-y-4">
        <div
          className="rounded-lg p-6 text-center"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-tertiary)',
          }}
        >
          <div className="text-3xl mb-2">🚀</div>
          <div className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            DiveIn
          </div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            v0.2.0 — Development Build
          </div>
        </div>

        <div className="text-xs space-y-1" style={{ color: 'var(--color-text-muted)' }}>
          <div>Local-first productivity super-app</div>
          <div>React 19 + TypeScript + Tailwind CSS 4</div>
          <div>Architecture: Electron (planned) + SQLite + Drizzle ORM</div>
        </div>

        <div
          className="text-xs pt-4"
          style={{
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div className="font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Keyboard shortcuts
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-4">
            <span>Command palette</span>
            <span style={{ color: 'var(--color-text-primary)' }}>Ctrl+K</span>
            <span>Navigate modules</span>
            <span style={{ color: 'var(--color-text-primary)' }}>Sidebar click</span>
            <span>Quick-add task</span>
            <span style={{ color: 'var(--color-text-primary)' }}>Dashboard Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shortcuts ──────────────────────────────────────────────────────────────

function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<ShortcutDef[]>(() => shortcutService.getAll());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const grouped = shortcuts.reduce<Record<ShortcutGroup, ShortcutDef[]>>(
    (acc, s) => {
      acc[s.group].push(s);
      return acc;
    },
    { Global: [], Navigation: [], Tasks: [], Notes: [], Timer: [] }
  );

  const groupOrder: ShortcutGroup[] = ['Global', 'Navigation', 'Tasks', 'Notes', 'Timer'];

  function startEditing(s: ShortcutDef) {
    setEditingId(s.id);
    setEditValue(s.keys);
  }

  function saveEdit(id: string) {
    if (editValue.trim()) {
      shortcutService.updateShortcut(id, editValue.trim());
    }
    setEditingId(null);
    setShortcuts(shortcutService.getAll());
  }

  function resetSingle(id: string) {
    shortcutService.resetShortcut(id);
    setEditingId(null);
    setShortcuts(shortcutService.getAll());
  }

  function resetAll() {
    shortcutService.resetAll();
    setEditingId(null);
    setShortcuts(shortcutService.getAll());
  }

  return (
    <div>
      <SectionHeader title="Keyboard Shortcuts" description="View and customize keyboard shortcuts." />

      <div className="mb-4">
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <RotateCcw size={12} />
          Reset all to defaults
        </button>
      </div>

      {groupOrder.map((group) => {
        const items = grouped[group];
        if (!items || items.length === 0) return null;
        return (
          <div key={group} className="mb-6">
            <h3
              className="text-[10px] font-medium uppercase tracking-wider mb-2 px-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {group}
            </h3>
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--color-border)' }}
            >
              {items.map((s, i) => {
                const isEditing = editingId === s.id;
                const isCustomized = shortcutService.isCustomized(s.id);
                return (
                  <ShortcutRow
                    key={s.id}
                    shortcut={s}
                    isEditing={isEditing}
                    isCustomized={isCustomized}
                    editValue={editValue}
                    isLast={i === items.length - 1}
                    onEditValueChange={setEditValue}
                    onStartEditing={() => startEditing(s)}
                    onSaveEdit={() => saveEdit(s.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onResetSingle={() => resetSingle(s.id)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
        Click any shortcut key to customize it. Press Enter to save or Escape to cancel.
      </div>
    </div>
  );
}

interface ShortcutRowProps {
  shortcut: ShortcutDef;
  isEditing: boolean;
  isCustomized: boolean;
  editValue: string;
  isLast: boolean;
  onEditValueChange: (v: string) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onResetSingle: () => void;
}

function ShortcutRow({
  shortcut: s,
  isEditing,
  isCustomized,
  editValue,
  isLast,
  onEditValueChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onResetSingle,
}: ShortcutRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
        backgroundColor: hovered ? 'var(--color-bg-tertiary)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {s.label}
        </span>
        {isCustomized && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--color-accent-muted)',
              color: 'var(--color-accent)',
            }}
          >
            custom
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="w-32 px-2 py-1 text-xs rounded text-center font-mono focus:outline-none"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-accent)',
                color: 'var(--color-text-primary)',
              }}
              autoFocus
            />
            <button
              onClick={onSaveEdit}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title="Save"
            >
              <CornerDownLeft size={12} />
            </button>
            {isCustomized && (
              <button
                onClick={onResetSingle}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Reset to default"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </>
        ) : (
          <KbdButton shortcut={s} onStartEditing={onStartEditing} />
        )}
      </div>
    </div>
  );
}

function KbdButton({ shortcut: s, onStartEditing }: { shortcut: ShortcutDef; onStartEditing: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onStartEditing}
      title="Click to edit"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <kbd
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
          color: 'var(--color-text-primary)',
        }}
      >
        {s.keys}
      </kbd>
    </button>
  );
}

// ─── Shared components ──────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      {description && (
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
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
    <div
      className="flex items-center justify-between py-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="mr-4">
        <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-md text-sm outline-none"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
    >
      {children}
    </select>
  );
}

function NumberInput({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 px-3 py-1.5 rounded-md text-sm outline-none text-center"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
    />
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
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{
        backgroundColor: checked ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
        border: checked ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
        style={{
          backgroundColor: checked ? '#fff' : 'var(--color-text-muted)',
          transform: checked ? 'translateX(18px)' : 'translateX(3px)',
        }}
      />
    </button>
  );
}
