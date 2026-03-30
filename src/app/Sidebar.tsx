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
  emoji: string;
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
      { path: '/dashboard', label: 'Dashboard', emoji: '🏠', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { path: '/tasks',    label: 'Tasks',    emoji: '✅', icon: CheckSquare },
      { path: '/notes',    label: 'Notes',    emoji: '📝', icon: FileText },
      { path: '/calendar', label: 'Calendar', emoji: '📅', icon: Calendar },
      { path: '/projects', label: 'Projects', emoji: '📁', icon: FolderKanban },
    ],
  },
  {
    title: 'Tools',
    items: [
      { path: '/habits',     label: 'Habits',     emoji: '🎯', icon: Target },
      { path: '/timer',      label: 'Timer',      emoji: '⏱️', icon: Timer },
      { path: '/flashcards', label: 'Flashcards', emoji: '🃏', icon: BookOpen },
      { path: '/tables',     label: 'Tables',     emoji: '📊', icon: Table2 },
    ],
  },
];

export function Sidebar() {
  const { app, effectiveTheme, updateApp } = useAppSettingsStore();
  const [collapsed, setCollapsed] = useState(app.sidebarDefault === 'collapsed');
  const location = useLocation();
  const isDark = effectiveTheme === 'dark';

  useEffect(() => {
    updateApp({ sidebarDefault: collapsed ? 'collapsed' : 'expanded' });
  }, [collapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTheme() {
    const next = effectiveTheme === 'dark' ? 'light' : 'dark';
    updateApp({ theme: next });
  }

  // Active state: warm neutral, not accent blue
  const activeItemStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    color: isDark ? '#ebebeb' : '#1a1a1a',
    fontWeight: 500,
  };
  const inactiveItemStyle = {
    backgroundColor: 'transparent',
    color: isDark ? '#8a8a8a' : '#6b6b6b',
    fontWeight: 400,
  };
  const hoverItemStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    color: isDark ? '#d0d0d0' : '#2a2a2a',
  };

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ─── App Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 10px 0 14px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
                letterSpacing: '-0.02em',
              }}
            >
              D
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              DiveIn
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.1s ease, color 0.1s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* ─── Search ────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div style={{ padding: '10px 10px 4px' }}>
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              width: '100%',
              padding: '6px 10px',
              borderRadius: 7,
              border: '1px solid var(--color-border)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              color: isDark ? '#6b6b6b' : '#9b9b9b',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'border-color 0.1s ease, background-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <Search size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
            <kbd
              style={{
                fontSize: 11,
                padding: '1px 5px',
                borderRadius: 4,
                fontFamily: 'inherit',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: isDark ? '#6b6b6b' : '#9b9b9b',
                border: 'none',
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>
      )}

      {/* ─── Navigation ────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
        }}
      >
        {sections.map((section, sectionIdx) => (
          <div key={section.title || sectionIdx} style={{ marginTop: sectionIdx > 0 ? 20 : 4 }}>

            {/* Section label */}
            {section.title && !collapsed && (
              <div
                style={{
                  padding: '0 8px 4px',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: isDark ? '#4a4a4a' : '#b0b0b0',
                  textTransform: 'none',
                }}
              >
                {section.title}
              </div>
            )}

            {section.title && collapsed && (
              <div
                style={{
                  margin: '0 8px 8px',
                  borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
                }}
              />
            )}

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? 0 : 7,
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '7px 0' : '5px 8px',
                      borderRadius: 6,
                      textDecoration: 'none',
                      fontSize: 13,
                      transition: 'background-color 0.1s ease, color 0.1s ease',
                      ...(isActive ? activeItemStyle : inactiveItemStyle),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = hoverItemStyle.backgroundColor;
                        (e.currentTarget as HTMLElement).style.color = hoverItemStyle.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = inactiveItemStyle.backgroundColor;
                        (e.currentTarget as HTMLElement).style.color = inactiveItemStyle.color;
                      }
                    }}
                  >
                    {/* Emoji replaces the Lucide icon */}
                    <span
                      style={{
                        fontSize: collapsed ? 17 : 15,
                        lineHeight: 1,
                        flexShrink: 0,
                        opacity: isActive ? 1 : 0.75,
                        transition: 'opacity 0.1s ease',
                        width: collapsed ? undefined : 18,
                        textAlign: 'center',
                      }}
                    >
                      {item.emoji}
                    </span>
                    {!collapsed && (
                      <span style={{ lineHeight: 1.3 }}>{item.label}</span>
                    )}
                    {/* Active indicator dot */}
                    {isActive && !collapsed && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Bottom actions ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: '6px 8px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={collapsed ? `Switch to ${effectiveTheme === 'dark' ? 'light' : 'dark'} mode` : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 7,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '7px 0' : '5px 8px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'transparent',
            color: isDark ? '#8a8a8a' : '#6b6b6b',
            cursor: 'pointer',
            fontSize: 13,
            width: '100%',
            transition: 'background-color 0.1s ease, color 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = hoverItemStyle.backgroundColor;
            e.currentTarget.style.color = hoverItemStyle.color;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = isDark ? '#8a8a8a' : '#6b6b6b';
          }}
        >
          <span style={{ fontSize: collapsed ? 17 : 15, lineHeight: 1, flexShrink: 0, opacity: 0.75, width: collapsed ? undefined : 18, textAlign: 'center' }}>
            {effectiveTheme === 'dark' ? '☀️' : '🌙'}
          </span>
          {!collapsed && (
            <span style={{ lineHeight: 1.3 }}>
              {effectiveTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          )}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : 7,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '7px 0' : '5px 8px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 13,
            transition: 'background-color 0.1s ease, color 0.1s ease',
            ...(location.pathname === '/settings' ? activeItemStyle : inactiveItemStyle),
          }}
          onMouseEnter={(e) => {
            if (location.pathname !== '/settings') {
              (e.currentTarget as HTMLElement).style.backgroundColor = hoverItemStyle.backgroundColor;
              (e.currentTarget as HTMLElement).style.color = hoverItemStyle.color;
            }
          }}
          onMouseLeave={(e) => {
            if (location.pathname !== '/settings') {
              (e.currentTarget as HTMLElement).style.backgroundColor = inactiveItemStyle.backgroundColor;
              (e.currentTarget as HTMLElement).style.color = inactiveItemStyle.color;
            }
          }}
        >
          <span style={{ fontSize: collapsed ? 17 : 15, lineHeight: 1, flexShrink: 0, opacity: location.pathname === '/settings' ? 1 : 0.75, width: collapsed ? undefined : 18, textAlign: 'center' }}>
            ⚙️
          </span>
          {!collapsed && (
            <>
              <span style={{ lineHeight: 1.3 }}>Settings</span>
              {location.pathname === '/settings' && (
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}
                />
              )}
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}
