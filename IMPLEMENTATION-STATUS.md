# Nexus — Implementation Status

> Last updated: 2026-03-28 11:20 SGT  
> Architecture: Electron (planned) + React 19 + TypeScript + Vite  
> Current mode: Web-only dev (in-memory data layer, no Electron IPC yet)

---

## Status Legend

- ✅ Complete and tested
- 🔨 In progress
- 📋 Planned (not started)
- ⚠️ Has known issues

---

## Phase 0: Foundation

| Component | Status | Notes |
|-----------|--------|-------|
| Project scaffolding (Vite + React + TS) | ✅ | Rebuilt from scratch — original was vanilla TS template, not React |
| package.json with correct deps | ✅ | React 19, React Router, lucide-react, TanStack Query, all libs |
| tsconfig.json (renderer) | ✅ | Strict mode, path aliases (@/, @shared/, @modules/) |
| tsconfig.node.json (vite config) | ✅ | |
| tsconfig.electron.json | ✅ | For future Electron main process compilation |
| vite.config.ts | ✅ | React plugin, Tailwind plugin, path aliases |
| Tailwind CSS 4 + globals.css | ✅ | Custom theme vars, dark mode, scrollbar styling |
| App shell (Layout + Sidebar + StatusBar) | ✅ | Collapsible sidebar, nav sections, status bar |
| React Router setup | ✅ | All 10 routes defined |
| TanStack Query client | ✅ | 1min stale time, no retry (local data) |
| Drizzle schemas (all tables) | ✅ | tasks, projects, notes, calendar, habits, flashcards, timer, tables, settings, tags, activity_log, schema_version |
| Electron main.ts | ⚠️ | File exists but NOT wired — app runs as web-only for now |
| Electron preload.ts | ⚠️ | File exists but not compiled or used yet |
| DB connection (better-sqlite3) | ⚠️ | File exists but not tested — requires Electron process |
| Auto-backup service | 📋 | |
| Logging service | 📋 | |
| Error boundaries | 📋 | |

### Known Issues (Phase 0)
1. **Electron is not wired yet.** The app runs purely as a Vite web app. The Electron main process, preload, and IPC handlers are scaffolded but not integrated. This is intentional — build and test UI first, wire Electron later.
2. **Data is in-memory only.** Tasks (and all future modules) use an in-memory JavaScript array. Data is lost on page refresh. The `taskService` abstraction ensures zero code changes when we swap to Electron IPC + SQLite.
3. The old Vite template files (`src/main.ts`, `src/counter.ts`, `src/style.css`) have been deleted but the `src/assets/` folder (hero.png, logos) still exists as unused cruft. Safe to delete.

---

## Phase 1: MVP — Daily Driver

### Module 1: Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard page | ✅ | Stat cards (tasks due, events, habits, cards to review) |
| Quick capture bar | ✅ | Present on dashboard, not wired to task creation yet |
| Today's Tasks section | ✅ | Placeholder — needs to pull from task service |
| Today's Events section | ✅ | Placeholder |
| Weekly overview | 📋 | |
| Customizable widgets | 📋 | |

### Module 2: Task Manager
| Feature | Status | Notes |
|---------|--------|-------|
| Task types & interfaces | ✅ | Full TypeScript types: Task, CreateTaskInput, UpdateTaskInput, TaskFilter |
| Data service (taskService) | ✅ | In-memory implementation matching IPC contract |
| TanStack Query hooks | ✅ | useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask |
| Quick-add input | ✅ | Enter to create, clears after |
| Task list view | ✅ | Sorted by sortOrder |
| Status filter tabs | ✅ | All, Inbox, Todo, In Progress, Done, Cancelled |
| Task item component | ✅ | Status icon, priority flag, title, tags, due date, delete button |
| Status cycling on click | ✅ | inbox→todo→in_progress→done→todo |
| Detail panel | ✅ | Title, status dropdown, priority buttons, due date, tags, description |
| Tag management | ✅ | Add (Enter), remove (×) in detail panel |
| Auto completedAt | ✅ | Set when status→done, cleared when status leaves done |
| Priority display | ✅ | Color-coded flags (P1 red, P2 orange, P3 blue, P4 gray) |
| Due date formatting | ✅ | "Today" (blue), "Tomorrow" (amber), overdue (red), future (gray) |
| Subtasks | 📋 | Schema supports parentId, UI not built |
| Kanban board view | 📋 | |
| Keyboard shortcuts | 📋 | N=new, 1-4=priority, D=done |
| Global quick-add hotkey | 📋 | Requires Electron |
| Drag-and-drop reorder | 📋 | dnd-kit installed |
| Batch operations | 📋 | |
| Saved filters | 📋 | |
| Task dependencies | 📋 | Schema planned, not in Drizzle schema yet |
| Recurring tasks | 📋 | |

### Module 3: Notes & Knowledge Base
| Feature | Status | Notes |
|---------|--------|-------|
| Note types & interfaces | ✅ | Note, NoteFolder, CreateNoteInput, UpdateNoteInput, NoteFilter |
| Data service (noteService) | ✅ | In-memory with search, pinning, sorting |
| TanStack Query hooks | ✅ | useNotes, useNote, useCreateNote, useUpdateNote, useDeleteNote |
| Notes page with sidebar | ✅ | Search bar, new note button, note list, pin/delete actions |
| TipTap editor | ✅ | Full toolbar: B/I/S/Code, H1-H3, Lists, Quote, Divider, Undo/Redo |
| Note title editing | ✅ | Inline editable title |
| Note metadata | ✅ | Updated date, word count |
| Pin/unpin notes | ✅ | Pinned notes sort to top |
| Debounced auto-save | ✅ | 500ms debounce on editor changes |
| Search notes | ✅ | Searches title + content text |
| Folder tree | 📋 | Service supports folders, UI not built |
| Full-text search (FTS5) | 📋 | Requires SQLite |
| Wiki-links | 📋 | |
| Backlinks | 📋 | |
| Slash commands | 📋 | |
| Export to Markdown/PDF | 📋 | |

### Module 4: Calendar
| Feature | Status | Notes |
|---------|--------|-------|
| Event types & interfaces | ✅ | CalendarEvent, CreateEventInput, UpdateEventInput |
| Data service (eventService) | ✅ | In-memory with date range filtering |
| TanStack Query hooks | ✅ | useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent |
| FullCalendar integration | ✅ | Month, Week, Day views, dark theme, today highlight |
| Event CRUD | ✅ | Create/edit/delete via side panel form |
| Click date to create event | ✅ | Opens form with pre-filled date |
| Click event to edit | ✅ | Opens form with event data |
| Drag-and-drop reschedule | ✅ | eventDrop handler updates start/end times |
| All-day toggle | ✅ | Switches between date and datetime inputs |
| Dark theme CSS vars | ✅ | Custom FullCalendar theme vars matching app |
| Tasks on calendar | 📋 | Need cross-module integration |
| Recurring events | 📋 | |
| Reminders | 📋 | |
| .ics import/export | 📋 | |

---

## Phase 2: Productivity Features

All Phase 2 modules are 📋 (placeholder pages exist, no functionality).

- Habits page
- Timer/Pomodoro page
- Projects page
- Command palette (Ctrl+K)

## Phase 3: Advanced Features

All Phase 3 modules are 📋.

- Flashcards / Spaced Repetition
- Tables / Structured Data
- Cross-module integration
- Polish (keyboard shortcuts, settings)

## Phase 4: Distribution & Sync

All Phase 4 items are 📋.

- Electron IPC wiring
- SQLite persistence
- Auto-updater
- CI/CD (GitHub Actions)
- Cloud sync

---

## Architecture Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-28 | Electron over Tauri | better-sqlite3 + Drizzle ORM can't run in Tauri's WebView; Rust learning curve too high |
| 2026-03-28 | Web-first development | Build and test all UI as a web app, wire Electron IPC last. Zero code changes needed — DataService abstraction handles the swap. |
| 2026-03-28 | In-memory data layer | Matches the Electron IPC contract exactly. When we swap, only the service implementation files change — no hooks, components, or pages touched. |
| 2026-03-28 | Rebuilt from vanilla Vite template | Original scaffold used wrong template (vanilla TS, not React). Complete rebuild with proper React 19, Router, TanStack Query. |
| 2026-03-28 | lucide-react over @radix-ui/react-icons | lucide has more icons (1500+), consistent style, tree-shakeable |

---

## File Structure (current)

```
nexus/
├── drizzle/schema/          # All Drizzle ORM schemas (9 files)
├── electron/                # Electron main process (scaffolded, not wired)
│   ├── main.ts
│   ├── preload.ts
│   └── db/connection.ts
├── src/
│   ├── main.tsx             # React entry point
│   ├── vite-env.d.ts        # Vite + window.api type declarations
│   ├── styles/globals.css   # Tailwind + theme vars
│   ├── app/
│   │   ├── App.tsx          # Root: QueryClient + Router + Layout
│   │   ├── Layout.tsx       # Shell: Sidebar + main + StatusBar
│   │   ├── Sidebar.tsx      # Navigation with sections
│   │   └── StatusBar.tsx    # Bottom bar
│   ├── modules/
│   │   ├── dashboard/DashboardPage.tsx  # ✅ Working
│   │   ├── tasks/
│   │   │   ├── TasksPage.tsx            # ✅ Full CRUD
│   │   │   ├── components/TaskItem.tsx  # ✅ Task row
│   │   │   ├── components/TaskDetail.tsx # ✅ Detail panel
│   │   │   └── hooks/useTasks.ts        # ✅ TanStack Query hooks
│   │   ├── notes/NotesPage.tsx          # Placeholder
│   │   ├── calendar/CalendarPage.tsx    # Placeholder
│   │   ├── habits/HabitsPage.tsx        # Placeholder
│   │   ├── timer/TimerPage.tsx          # Placeholder
│   │   ├── flashcards/FlashcardsPage.tsx # Placeholder
│   │   ├── tables/TablesPage.tsx        # Placeholder
│   │   ├── projects/ProjectsPage.tsx    # Placeholder
│   │   └── settings/SettingsPage.tsx    # Placeholder
│   └── shared/
│       ├── lib/taskService.ts           # ✅ In-memory task data layer
│       └── types/task.ts                # ✅ Task type definitions
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.electron.json
├── productivity-app-plan.md             # Full design document
└── IMPLEMENTATION-STATUS.md             # This file
```

---

## Next Steps (Priority Order)

1. **Wire Dashboard to real task data** — quick capture creates tasks, Today's Tasks shows due items
2. **Build Notes module** — TipTap editor, folder tree, search
3. **Build Calendar module** — FullCalendar integration, event CRUD, tasks on calendar
4. **Wire Electron** — main process, preload, IPC handlers, SQLite persistence
5. **Add remaining modules** — Habits, Timer, Flashcards, Tables, Projects
