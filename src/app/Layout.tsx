import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

export function Layout() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Page content */}
        <main
          className="flex-1 overflow-auto"
          style={{ backgroundColor: 'var(--color-bg-primary)' }}
        >
          <Outlet />
        </main>

        {/* Status bar */}
        <StatusBar />
      </div>
    </div>
  );
}
