import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Calendar,
  Target,
  Timer,
  BookOpen,
  Table2,
  FolderKanban,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAppSettingsStore } from '@/shared/stores/appSettingsStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: '',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'WORKSPACE',
    items: [
      { path: '/tasks', label: 'Tasks', icon: CheckSquare },
      { path: '/notes', label: 'Notes', icon: FileText },
      { path: '/calendar', label: 'Calendar', icon: Calendar },
      { path: '/projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { path: '/habits', label: 'Habits', icon: Target },
      { path: '/timer', label: 'Timer', icon: Timer },
      { path: '/flashcards', label: 'Flashcards', icon: BookOpen },
      { path: '/tables', label: 'Tables', icon: Table2 },
    ],
  },
];

export function Sidebar() {
  const { app, effectiveTheme, updateApp } = useAppSettingsStore();
  const [collapsed, setCollapsed] = useState(app.sidebarDefault === 'collapsed');
  const location = useLocation();

  // Persist sidebar state
  useEffect(() => {
    updateApp({ sidebarDefault: collapsed ? 'collapsed' : 'expanded' });
  }, [collapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTheme() {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    updateApp({ theme: next });
  }

  return (
    <aside
      className="flex flex-col border-r transition-all duration-200 select-none"
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ─── App Header ───────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3 shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--color-border)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'var(--color-accent)' }}
            >
              D
            </div>
            <span
              className="text-sm font-semibold tracking-tight truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              DiveIn
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      {/* ─── Search / Command Palette trigger ─────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => {
              // Trigger Ctrl+K command palette
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-bg-tertiary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search...</span>
            <kbd
              className="text-[11px] px-1.5 py-0.5 rounded font-mono"
              style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-muted)' }}
            >
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ─── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto px-2">
        {sections.map((section, sectionIdx) => (
          <div key={section.title || sectionIdx} className={sectionIdx > 0 ? 'mt-4' : ''}>
            {/* Section header */}
            {section.title && !collapsed && (
              <div
                className="px-2 pb-1 text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: 'var(--sidebar-section-text)' }}
              >
                {section.title}
              </div>
            )}

            {/* Divider for collapsed mode */}
            {section.title && collapsed && (
              <div
                className="mx-2 my-2"
                style={{ borderTop: '1px solid var(--color-border)' }}
              />
            )}

            {/* Nav items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center rounded-lg transition-colors ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent-soft)' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      fontWeight: isActive ? 500 : 400,
                      fontSize: '0.875rem',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Bottom actions ───────────────────────────────────────────── */}
      <div
        className="px-2 py-2 space-y-0.5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`flex items-center rounded-lg transition-colors w-full ${
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'
          }`}
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title={collapsed ? `Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode` : undefined}
        >
          {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {!collapsed && (
            <span>{effectiveTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          )}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={`flex items-center rounded-lg transition-colors ${
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-2.5 py-2'
          }`}
          style={{
            backgroundColor: location.pathname === '/settings' ? 'var(--color-accent-soft)' : 'transparent',
            color: location.pathname === '/settings' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: location.pathname === '/settings' ? 500 : 400,
            fontSize: '0.875rem',
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/settings') {
              e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/settings') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
