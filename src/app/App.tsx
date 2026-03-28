import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './Layout';
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
