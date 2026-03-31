import { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Clock,
  BookOpen,
  Database,
  Info,
  RotateCcw,
  Keyboard,
  CornerDownLeft,
  Sun,
  Moon,
  Monitor,
  Search,
  Upload,
  Trash2,
  Check,
  Download,
  Layers,
  Bell,
} from 'lucide-react';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';
import { shortcutService, type ShortcutDef, type ShortcutGroup } from '@/shared/lib/shortcutService';
import { useNotificationStore } from '@/shared/stores/notificationStore';

type SettingsTab = 'general' | 'pomodoro' | 'flashcards' | 'shortcuts' | 'data' | 'about' | 'notifications';

// ─── Tab group definitions ────────────────────────────────────────────────────

const TAB_GROUPS: { label: string; items: { key: SettingsTab; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: 'App',
    items: [
      { key: 'general', label: 'General', icon: <Settings size={14} /> },
    ],
  },
  {
    label: 'Modules',
    items: [
      { key: 'pomodoro', label: 'Pomodoro', icon: <Clock size={14} /> },
      { key: 'flashcards', label: 'Flashcards', icon: <BookOpen size={14} /> },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
      { key: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={14} /> },
      { key: 'data', label: 'Data', icon: <Database size={14} /> },
      { key: 'about', label: 'About', icon: <Info size={14} /> },
    ],
  },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div
        className="w-52 flex-shrink-0 flex flex-col py-5"
        style={{
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 mb-5">
          <Layers size={18} style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Settings
          </h1>
        </div>

        {/* Grouped navigation */}
        <nav className="flex-1 px-3 space-y-5">
          {TAB_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="px-2 mb-1"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-text-muted)',
                }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((tab) => (
                  <SidebarTab
                    key={tab.key}
                    tab={tab}
                    active={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Version footer */}
        <div className="px-5 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>DiveIn v0.2.0</p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-10 py-8 max-w-2xl">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'pomodoro' && <PomodoroSettingsPanel />}
          {activeTab === 'flashcards' && <FlashcardSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'shortcuts' && <ShortcutSettings />}
          {activeTab === 'data' && <DataSettings />}
          {activeTab === 'about' && <AboutSection />}
        </div>
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
      className="flex items-center gap-2 w-full py-2 pr-3 rounded-md text-sm transition-all"
      style={{
        paddingLeft: active ? '9px' : '12px',
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
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
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)', flexShrink: 0 }}>
        {tab.icon}
      </span>
      {tab.label}
    </button>
  );
}

// ─── General ────────────────────────────────────────────────────────────────

function GeneralSettings() {
  const { app, updateApp } = useAppSettingsStore();

  return (
    <div>
      <SectionHeader title="General" description="App-wide preferences and appearance." />

      {/* Theme cards */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Theme
        </label>
        <div className="grid grid-cols-3 gap-3">
          <ThemeCard
            themeKey="light"
            label="Light"
            emoji={<Sun size={16} />}
            selected={app.theme === 'light'}
            onSelect={() => updateApp({ theme: 'light' })}
            previewBg="#f8f8f7"
            previewSidebar="#f0eeec"
            previewText="#1a1a1a"
            previewAccent="#6366f1"
          />
          <ThemeCard
            themeKey="dark"
            label="Dark"
            emoji={<Moon size={16} />}
            selected={app.theme === 'dark'}
            onSelect={() => updateApp({ theme: 'dark' })}
            previewBg="#18181b"
            previewSidebar="#141417"
            previewText="#fafafa"
            previewAccent="#818cf8"
          />
          <ThemeCard
            themeKey="system"
            label="System"
            emoji={<Monitor size={16} />}
            selected={app.theme === 'system'}
            onSelect={() => updateApp({ theme: 'system' })}
            previewBg="linear-gradient(135deg, #f8f8f7 50%, #18181b 50%)"
            previewSidebar=""
            previewText=""
            previewAccent=""
            isSystem
          />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: '24px' }} />

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

function ThemeCard({
  themeKey,
  label,
  emoji,
  selected,
  onSelect,
  previewBg,
  previewSidebar,
  previewText,
  previewAccent,
  isSystem,
}: {
  themeKey: string;
  label: string;
  emoji: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  previewBg: string;
  previewSidebar: string;
  previewText: string;
  previewAccent: string;
  isSystem?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl p-3 text-left transition-all flex flex-col gap-2"
      style={{
        border: selected
          ? '2px solid var(--color-accent)'
          : `2px solid ${hovered ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
        backgroundColor: selected ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: selected ? '0 0 0 3px var(--color-accent-soft)' : hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {/* Preview thumbnail */}
      <div
        className="w-full rounded-lg overflow-hidden"
        style={{ height: 52, background: previewBg, position: 'relative' }}
      >
        {!isSystem ? (
          <>
            {/* Mini sidebar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 20,
                backgroundColor: previewSidebar,
              }}
            />
            {/* Mini content */}
            <div style={{ position: 'absolute', left: 24, top: 8, right: 4 }}>
              <div style={{ height: 5, width: '60%', borderRadius: 3, backgroundColor: previewAccent, marginBottom: 4 }} />
              <div style={{ height: 3, width: '80%', borderRadius: 3, backgroundColor: previewText, opacity: 0.3 }} />
              <div style={{ height: 3, width: '50%', borderRadius: 3, backgroundColor: previewText, opacity: 0.2, marginTop: 3 }} />
              <div style={{ height: 3, width: '70%', borderRadius: 3, backgroundColor: previewAccent, opacity: 0.4, marginTop: 3 }} />
            </div>
          </>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'transparent',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              backgroundImage: 'linear-gradient(135deg, #1a1a1a 50%, #fafafa 50%)',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>⚙</span>
          </div>
        )}
      </div>

      {/* Label row */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
        >
          <span style={{ color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{emoji}</span>
          {label}
        </div>
        {selected && (
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 16, height: 16, backgroundColor: 'var(--color-accent)' }}
          >
            <Check size={10} color="white" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Pomodoro ───────────────────────────────────────────────────────────────

function MiniTimerFace({ workMin, shortBreakMin, longBreakMin }: { workMin: number; shortBreakMin: number; longBreakMin: number }) {
  const total = Math.max(workMin + shortBreakMin, 1);
  const RADIUS = 34;
  const CIRC = 2 * Math.PI * RADIUS;
  const workFraction = Math.min(workMin / 60, 1);
  const breakFraction = Math.min(shortBreakMin / 60, 1);

  return (
    <div
      className="rounded-xl p-4 flex flex-col items-center gap-3"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Preview
      </p>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={88} height={88} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={44} cy={44} r={RADIUS} fill="none" stroke="var(--color-bg-elevated)" strokeWidth={8} />
          {/* Work arc */}
          <circle
            cx={44} cy={44} r={RADIUS}
            fill="none" stroke="var(--color-accent)" strokeWidth={8}
            strokeDasharray={`${workFraction * CIRC} ${CIRC}`}
            strokeLinecap="round"
          />
          {/* Short break arc */}
          <circle
            cx={44} cy={44} r={RADIUS}
            fill="none" stroke="var(--color-success)" strokeWidth={8}
            strokeDasharray={`${breakFraction * CIRC} ${CIRC}`}
            strokeDashoffset={-workFraction * CIRC}
            strokeLinecap="round"
            opacity={0.7}
          />
        </svg>
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {workMin}m
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>focus</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Work · {workMin}m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Break · {shortBreakMin}m</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#2dd4bf' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>Long · {longBreakMin}m</span>
        </div>
      </div>
    </div>
  );
}

function PomodoroSettingsPanel() {
  const { settings, updateSettings } = useTimerStore();

  return (
    <div>
      <SectionHeader title="Pomodoro Timer" description="Configure your focus and break intervals." />

      <MiniTimerFace
        workMin={settings.workMin}
        shortBreakMin={settings.shortBreakMin}
        longBreakMin={settings.longBreakMin}
      />

      <div className="mt-6 space-y-0">
        <SettingRow label="Work duration" description="Length of each focus session.">
          <div className="flex items-center gap-2">
            <NumberInput
              min={1}
              max={120}
              value={settings.workMin}
              onChange={(v) => updateSettings({ workMin: v || 25 })}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>min</span>
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
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>min</span>
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
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>min</span>
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
      </div>

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

      <SettingRow label="New cards per day" description="Maximum new cards shown daily per deck.">
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

      {/* Algorithm info card */}
      <div
        className="mt-6 rounded-xl p-4"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            SM-2 Algorithm
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              color: 'var(--color-accent)',
              border: '1px solid var(--color-accent-muted)',
            }}
          >
            Active
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Cards are scheduled based on your rating (Again / Hard / Good / Easy). Each rating adjusts
          the card's ease factor and next review interval using the SM-2 spaced repetition algorithm.
          New cards are shown first; mature cards are reviewed based on optimized intervals to maximize
          retention with minimal review time.
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {[
            { label: 'Again', color: 'var(--color-danger)', bg: 'var(--color-danger-soft)' },
            { label: 'Hard', color: 'var(--color-warning)', bg: 'var(--color-warning-soft)' },
            { label: 'Good', color: 'var(--color-success)', bg: 'var(--color-success-soft)' },
            { label: 'Easy', color: 'var(--color-accent)', bg: 'var(--color-accent-soft)' },
          ].map((r) => (
            <span
              key={r.label}
              className="text-xs px-2 py-1 rounded-md font-medium"
              style={{ backgroundColor: r.bg, color: r.color }}
            >
              {r.label}
            </span>
          ))}
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
  const [searchQuery, setSearchQuery] = useState('');

  const grouped = shortcuts.reduce<Record<ShortcutGroup, ShortcutDef[]>>(
    (acc, s) => {
      acc[s.group].push(s);
      return acc;
    },
    { Global: [], Navigation: [], Tasks: [], Notes: [], Timer: [] }
  );

  const groupOrder: ShortcutGroup[] = ['Global', 'Navigation', 'Tasks', 'Notes', 'Timer'];

  // Filter shortcuts by search
  const filteredGrouped = searchQuery.trim()
    ? Object.fromEntries(
        Object.entries(grouped).map(([group, items]) => [
          group,
          items.filter(
            (s) =>
              s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.keys.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        ])
      ) as Record<ShortcutGroup, ShortcutDef[]>
    : grouped;

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

      {/* Search + reset row */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shortcuts…"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={resetAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
          style={{
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
          }}
        >
          <RotateCcw size={12} />
          Reset all
        </button>
      </div>

      {groupOrder.map((group) => {
        const items = filteredGrouped[group];
        if (!items || items.length === 0) return null;
        return (
          <div key={group} className="mb-6">
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {group}
            </h3>
            <div
              className="rounded-xl overflow-hidden"
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

      <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
        Click any shortcut key to customize it. Press Enter to save or Escape to cancel.
      </p>
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
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--color-accent-muted)',
              color: 'var(--color-accent)',
              fontSize: '10px',
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
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all"
        style={{
          backgroundColor: hovered ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
          border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
          color: hovered ? 'var(--color-accent)' : 'var(--color-text-primary)',
          boxShadow: hovered ? 'none' : '0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        {s.keys}
      </kbd>
    </button>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

function getStorageSize(): string {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
      }
    }
  } catch {
    return 'Unknown';
  }
  if (total < 1024) return `${total} B`;
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
  return `${(total / (1024 * 1024)).toFixed(2)} MB`;
}

function exportAllData() {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      data[key] = localStorage.getItem(key) ?? '';
    }
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `divein-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DataSettings() {
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [storageSize] = useState(getStorageSize);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          });
          setImportStatus('success');
          setTimeout(() => setImportStatus('idle'), 3000);
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      } catch {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClearAll() {
    localStorage.clear();
    window.location.reload();
  }

  return (
    <div>
      <SectionHeader title="Data" description="Storage, backup, and data management." />

      {/* Storage usage */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Storage Usage
          </span>
          <span
            className="text-sm font-bold font-mono"
            style={{ color: 'var(--color-accent)' }}
          >
            {storageSize}
          </span>
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Stored in localStorage · persists across page refreshes
        </div>
        {/* Usage bar */}
        <div
          className="mt-3 rounded-full overflow-hidden"
          style={{ height: 4, backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: '8%',
              backgroundColor: 'var(--color-accent)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>0 KB</span>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>5 MB limit</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Export */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Export Data
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Download all your data as a JSON backup file
            </p>
          </div>
          <button
            onClick={exportAllData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
              e.currentTarget.style.color = 'var(--color-accent)';
              e.currentTarget.style.borderColor = 'var(--color-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>

        {/* Import */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Import Data
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Restore from a previously exported JSON backup
            </p>
            {importStatus === 'success' && (
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-success)' }}>
                ✓ Data imported — refresh to apply changes
              </p>
            )}
            {importStatus === 'error' && (
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-danger)' }}>
                ✗ Invalid file format
              </p>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-data-file"
            />
            <label
              htmlFor="import-data-file"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <Upload size={14} />
              Import JSON
            </label>
          </div>
        </div>

        {/* Clear data */}
        <div
          className="flex items-center justify-between p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Clear All Data
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Permanently delete all tasks, notes, events, and settings
            </p>
          </div>
          <button
            onClick={() => setShowConfirmClear(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-danger-soft)',
              color: 'var(--color-danger)',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            <Trash2 size={14} />
            Clear Data
          </button>
        </div>
      </div>

      {/* Confirm clear modal */}
      {showConfirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowConfirmClear(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-popup)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl mb-3">⚠️</div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Clear all data?
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
              This will permanently delete all your tasks, notes, events, time entries, flashcards,
              and settings. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--color-danger)' }}
                onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── About ──────────────────────────────────────────────────────────────────

function AboutSection() {
  const techStack = [
    { name: 'React 19', color: '#61dafb', bg: '#0a2840' },
    { name: 'TypeScript', color: '#3178c6', bg: '#e8f2ff' },
    { name: 'TipTap', color: '#6c47ff', bg: '#f0ecff' },
    { name: 'FullCalendar', color: '#2d7dd2', bg: '#e8f3ff' },
    { name: 'Tailwind 4', color: '#06b6d4', bg: '#e0f9ff' },
    { name: 'Vite', color: '#646cff', bg: '#f0f0ff' },
    { name: 'TanStack Query', color: '#f73859', bg: '#fff0f3' },
    { name: 'Zustand', color: '#fc9b3f', bg: '#fff5e8' },
    { name: 'date-fns', color: '#770c56', bg: '#fce8f5' },
    { name: 'Drizzle ORM', color: '#c5f74f', bg: '#1e2d0a' },
  ];

  return (
    <div>
      <SectionHeader title="About DiveIn" description="" />

      {/* Hero card */}
      <div
        className="rounded-2xl p-8 text-center mb-6"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent-soft) 0%, var(--color-bg-secondary) 100%)',
          border: '1px solid var(--color-accent-muted)',
        }}
      >
        <div className="text-4xl mb-3">🚀</div>
        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          DiveIn
        </div>
        <div
          className="text-sm px-3 py-1 rounded-full inline-block mb-2"
          style={{
            backgroundColor: 'var(--color-accent-muted)',
            color: 'var(--color-accent)',
          }}
        >
          v0.2.0 · Development Build
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Local-first productivity super-app — tasks, notes, calendar, timer, and flashcards
        </p>
      </div>

      {/* Tech stack */}
      <div className="mb-6">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Built With
        </p>
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech.name}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                backgroundColor: tech.bg,
                color: tech.color,
                border: `1px solid ${tech.color}30`,
              }}
            >
              {tech.name}
            </span>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Architecture
        </p>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          {[
            ['Storage', 'localStorage (browser)'],
            ['Planned', 'Electron + SQLite'],
            ['State', 'Zustand + TanStack Query'],
            ['UI', 'React + Tailwind 4'],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex gap-3">
        {[
          { label: '📖 Documentation', href: '#' },
          { label: '💻 Source Code', href: '#' },
          { label: '🐛 Report Issue', href: '#' },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-xs px-3 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
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

// --- Notification Settings ----------------------------------------------------

function NotificationSettings() {
  const { preferences, permissionStatus, updatePreferences, requestPermission, refreshPermissionStatus } =
    useNotificationStore();
  const [testFired, setTestFired] = useState(false);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  function handleRequestPermission() {
    void requestPermission();
  }

  function handleTestNotification() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      const n = new Notification('DiveIn Test Notification ??', {
        body: "Notifications are working! You'll be reminded about tasks, habits, and events.",
        icon: '/favicon.ico',
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTestFired(true);
      setTimeout(() => setTestFired(false), 3000);
    } catch { /* ignore */ }
  }

  const isGranted = permissionStatus === 'granted';
  const isDenied = permissionStatus === 'denied';
  const isUnsupported = permissionStatus === 'unsupported';

  return (
    <div>
      <SectionHeader title="Notifications" description="Configure browser push notifications for reminders and alerts." />

      {/* Permission status */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          border: `1px solid ${isGranted ? 'var(--color-success)' : isDenied ? 'var(--color-danger)' : 'var(--color-warning)'}`,
          backgroundColor: isGranted ? 'var(--color-success-soft)' : isDenied ? 'var(--color-danger-soft)' : 'var(--color-warning-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {isGranted ? '?' : isDenied ? '??' : isUnsupported ? '?' : '??'}
          </span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {isGranted ? 'Notifications allowed' : isDenied ? 'Permission denied' : isUnsupported ? 'Not supported in this browser' : 'Permission needed'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {isGranted ? 'Browser will deliver notifications when the app is open' : isDenied ? 'Update browser settings to allow notifications from this site' : isUnsupported ? 'Your browser does not support the Notification API' : 'Click "Enable" to allow browser notifications'}
            </div>
          </div>
        </div>
        {!isGranted && !isDenied && !isUnsupported && (
          <button
            onClick={handleRequestPermission}
            style={{
              padding: '6px 16px', borderRadius: '20px',
              border: 'none', backgroundColor: 'var(--color-warning)',
              color: '#fff', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            Enable
          </button>
        )}
      </div>

      {/* Master toggle */}
      <SettingRow label="Enable notifications" description="Master switch � turns all notification types on or off">
        <ToggleSwitch checked={preferences.enabled} onChange={(v) => updatePreferences({ enabled: v })} />
      </SettingRow>

      {/* Task Reminders */}
      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Task Reminders</p>
      </div>
      <SettingRow label="?? Task due reminders" description="Notify when a task's due date is approaching">
        <ToggleSwitch checked={preferences.taskReminders && preferences.enabled} onChange={(v) => updatePreferences({ taskReminders: v })} />
      </SettingRow>
      {preferences.taskReminders && preferences.enabled && (
        <div style={{ paddingLeft: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Remind</span>
            <NumberInput min={5} max={120} value={preferences.taskReminderMinutes} onChange={(v) => updatePreferences({ taskReminderMinutes: v })} />
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>minutes before due</span>
          </div>
        </div>
      )}

      {/* Calendar Events */}
      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Calendar Events</p>
      </div>
      <SettingRow label="?? Event reminders" description="Notify before calendar events start">
        <ToggleSwitch checked={preferences.eventReminders && preferences.enabled} onChange={(v) => updatePreferences({ eventReminders: v })} />
      </SettingRow>
      {preferences.eventReminders && preferences.enabled && (
        <div style={{ paddingLeft: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Remind</span>
            <NumberInput min={1} max={60} value={preferences.eventReminderMinutes} onChange={(v) => updatePreferences({ eventReminderMinutes: v })} />
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>minutes before start</span>
          </div>
        </div>
      )}

      {/* Habits */}
      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Habits</p>
      </div>
      <SettingRow label="?? Habit reminders" description="Evening reminder for incomplete habits">
        <ToggleSwitch checked={preferences.habitReminders && preferences.enabled} onChange={(v) => updatePreferences({ habitReminders: v })} />
      </SettingRow>
      {preferences.habitReminders && preferences.enabled && (
        <div style={{ paddingLeft: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Remind at</span>
            <NumberInput min={0} max={23} value={preferences.habitReminderHour} onChange={(v) => updatePreferences({ habitReminderHour: v })} />
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>:00 (24h format)</span>
          </div>
        </div>
      )}

      {/* Pomodoro */}
      <div style={{ marginTop: '24px', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Focus Timer</p>
      </div>
      <SettingRow label="?? Pomodoro phase alerts" description="Notify on work/break phase changes">
        <ToggleSwitch checked={preferences.pomodoroAlerts && preferences.enabled} onChange={(v) => updatePreferences({ pomodoroAlerts: v })} />
      </SettingRow>

      {/* Test */}
      <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '2px' }}>Test Notification</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Send a sample notification to verify your setup</div>
          </div>
          <button
            onClick={handleTestNotification}
            disabled={!isGranted || testFired}
            style={{
              padding: '7px 18px', borderRadius: '8px', border: 'none',
              backgroundColor: testFired ? 'var(--color-success)' : isGranted ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              color: isGranted ? '#fff' : 'var(--color-text-muted)',
              fontSize: '13px', fontWeight: 500,
              cursor: isGranted && !testFired ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {testFired ? '? Sent!' : '?? Send Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
