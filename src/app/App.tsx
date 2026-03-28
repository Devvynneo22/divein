import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';
import { CommandPalette } from './CommandPalette';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { TasksPage } from '@/modules/tasks/TasksPage';
import { NotesPage } from '@/modules/notes/NotesPage';
import { CalendarPage } from '@/modules/calendar/CalendarPage';
import { HabitsPage } from '@/modules/habits/HabitsPage';
import { TimerPage } from '@/modules/timer/TimerPage';
import { FlashcardsPage } from '@/modules/flashcards/FlashcardsPage';
import { TablesPage } from '@/modules/tables/TablesPage';
import { ProjectsPage } from '@/modules/projects/ProjectsPage';
import { SettingsPage } from '@/modules/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute — local data is fast, but we still want reactivity
      retry: false,          // local DB doesn't need retries
    },
  },
});

/** Global keyboard shortcut handler — runs inside BrowserRouter context */
function GlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl+Shift+N — Global quick-add: navigate to Tasks and focus input
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        navigate('/tasks');
        // Focus the quick-add input after navigation renders
        requestAnimationFrame(() => {
          const input = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Add a task"]'
          );
          input?.focus();
        });
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GlobalShortcuts />
        <CommandPalette />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/timer" element={<TimerPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
