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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  section?: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  // ── Core ──
  { path: '/tasks', label: 'Tasks', icon: CheckSquare, section: 'core' },
  { path: '/notes', label: 'Notes', icon: FileText, section: 'core' },
  { path: '/calendar', label: 'Calendar', icon: Calendar, section: 'core' },
  // ── Productivity ──
  { path: '/habits', label: 'Habits', icon: Target, section: 'productivity' },
  { path: '/timer', label: 'Timer', icon: Timer, section: 'productivity' },
  { path: '/flashcards', label: 'Flashcards', icon: BookOpen, section: 'productivity' },
  { path: '/tables', label: 'Tables', icon: Table2, section: 'productivity' },
  { path: '/projects', label: 'Projects', icon: FolderKanban, section: 'productivity' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* App title */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-[var(--color-border)]">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">
            NEXUS
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const prevItem = navItems[i - 1];
          const showSeparator =
            item.section && prevItem && prevItem.section !== item.section;

          return (
            <div key={item.path}>
              {showSeparator && (
                <div className="mx-3 my-2 border-t border-[var(--color-border)]" />
              )}
              <NavLink
                to={item.path}
                className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] bg-opacity-15 text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-[var(--color-border)] py-2">
        <NavLink
          to="/settings"
          className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors ${
            location.pathname === '/settings'
              ? 'bg-[var(--color-accent)] bg-opacity-15 text-[var(--color-accent)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
          } ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  );
}
