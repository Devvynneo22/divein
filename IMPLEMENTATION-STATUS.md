# Nexus — Implementation Status

> Last updated: 2026-03-28 12:15 SGT  
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
| Project scaffolding (Vite + React + TS) | ✅ | |
| package.json with correct deps | ✅ | React 19, React Router, TanStack Query/Table, all UI libs |
| tsconfig (renderer + node + electron) | ✅ | Strict mode, path aliases, composite |
| vite.config.ts | ✅ | React plugin, Tailwind plugin, path aliases |
| Tailwind CSS 4 + globals.css | ✅ | Custom theme vars, dark mode, scrollbar styling |
| App shell (Layout + Sidebar + StatusBar) | ✅ | Collapsible sidebar, live timer in status bar |
| React Router setup | ✅ | All 10 routes |
| TanStack Query client | ✅ | |
| Drizzle schemas (all tables) | ✅ | 10 schema files |
| Command Palette (Ctrl+K) | ✅ | cmdk-powered, navigation + create actions |
| Electron main.ts | ⚠️ | Scaffolded, not wired |
| Electron preload.ts | ⚠️ | Scaffolded, not wired |
| DB connection (better-sqlite3) | ⚠️ | Scaffolded, not wired |
| Error boundaries | 📋 | |
| Logging service | 📋 | |

---

## Phase 1: MVP — Daily Driver (ALL COMPLETE ✅)

### Dashboard ✅
| Feature | Status |
|---------|--------|
| Wired to all services (tasks, events, habits, flashcards, timer) | ✅ |
| 5 stat cards with click-to-navigate | ✅ |
| Quick capture (creates task with today's due date) | ✅ |
| Today's Tasks + Events sections | ✅ |
| Today's Habits section | ✅ |
| Dynamic greeting (morning/afternoon/evening) | ✅ |

### Task Manager ✅
| Feature | Status |
|---------|--------|
| Full CRUD with in-memory service | ✅ |
| Quick-add, status tabs, priority flags, tags, due dates | ✅ |
| Detail panel with inline editing | ✅ |
| Status cycling, auto completedAt | ✅ |
| Subtasks | 📋 |
| Kanban board | 📋 |
| Keyboard shortcuts | 📋 |

### Notes & Knowledge Base ✅
| Feature | Status |
|---------|--------|
| Full CRUD with TipTap rich text editor | ✅ |
| Toolbar, pin/unpin, search, auto-save (500ms debounce) | ✅ |
| projectId filtering | ✅ |
| Folder tree | 📋 |
| Wiki-links / backlinks | 📋 |

### Calendar ✅
| Feature | Status |
|---------|--------|
| FullCalendar (month/week/day), event CRUD, drag reschedule | ✅ |
| Tasks on calendar | 📋 |
| Recurring events | 📋 |

---

## Phase 2: Productivity Features (ALL COMPLETE ✅)

### Habit Tracker ✅
| Feature | Status |
|---------|--------|
| Full CRUD + check-in/uncheckIn | ✅ |
| Boolean + measurable types, frequency options | ✅ |
| Streak tracking (current + longest) | ✅ |
| Completion rates (7/30 day) | ✅ |
| 12-week GitHub-style heatmap | ✅ |
| Habit groups with autocomplete | ✅ |

### Timer & Pomodoro ✅
| Feature | Status |
|---------|--------|
| Stopwatch + Pomodoro modes | ✅ |
| Zustand store (drift-free tick via Date.now()) | ✅ |
| SVG circular progress ring | ✅ |
| Phase transitions + auto-start | ✅ |
| Manual time entry | ✅ |
| Configurable settings | ✅ |
| StatusBar live timer | ✅ |

### Flashcards & Spaced Repetition ✅
| Feature | Status |
|---------|--------|
| SM-2 algorithm (pure function) | ✅ |
| Deck/card CRUD, study queue | ✅ |
| Study session with CSS 3D card flip | ✅ |
| Review buttons with interval previews | ✅ |
| Session complete screen | ✅ |

### Tables & Structured Data ✅
| Feature | Status |
|---------|--------|
| TanStack Table spreadsheet grid | ✅ |
| 8 column types (text/number/date/checkbox/select/multiselect/url/email) | ✅ |
| Inline cell editing | ✅ |
| Type-aware filtering (multi-filter AND logic) | ✅ |
| Multi-column sorting | ✅ |
| Column management (add/rename/type change/delete) | ✅ |
| Tab navigation between cells | ✅ |
| Default template (Name + Status + Notes) | ✅ |
| Formula columns | 📋 |
| Board/Calendar views | 📋 |
| CSV import/export | 📋 |

### Project Management ✅
| Feature | Status |
|---------|--------|
| Full CRUD with archive/unarchive | ✅ |
| Cross-service stats (tasks, notes, time) | ✅ |
| 4-tab view: Overview, Tasks, Notes, Activity | ✅ |
| Task quick-add with auto projectId | ✅ |
| Note creation with auto projectId | ✅ |
| Milestones | 📋 |
| Kanban board per project | 📋 |

### Settings ✅
| Feature | Status |
|---------|--------|
| Tabbed settings page (General/Pomodoro/Flashcards/Data/About) | ✅ |
| Pomodoro settings wired to Zustand store | ✅ |
| Theme, date format, start of week options | ✅ |

### Command Palette ✅
| Feature | Status |
|---------|--------|
| Ctrl+K trigger with backdrop overlay | ✅ |
| Fuzzy search, keyboard navigation | ✅ |
| Navigation + Create action groups | ✅ |

---

## Phase 3: Advanced Features

| Feature | Status | Notes |
|---------|--------|-------|
| Tasks on calendar | 📋 | Cross-module integration |
| Notes → Flashcards | 📋 | Select text → create card |
| Keyboard shortcuts system | 📋 | Global handler + ? discovery |
| Formula columns in Tables | 📋 | SUM, AVG, COUNT, IF |
| Board/Calendar views for Tables | 📋 | |
| CSV import/export | 📋 | |
| Wiki-links + backlinks | 📋 | |
| Full-text search | 📋 | |

## Phase 4: Distribution & Sync

| Feature | Status | Notes |
|---------|--------|-------|
| Electron IPC wiring | 📋 | Main + preload + handlers |
| SQLite persistence | 📋 | Swap in-memory → better-sqlite3 |
| Auto-backup | 📋 | |
| Auto-updater | 📋 | |
| CI/CD | 📋 | |
| Cloud sync | 📋 | |

---

## Architecture Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-28 | Electron over Tauri | better-sqlite3 + Drizzle can't run in Tauri WebView |
| 2026-03-28 | Web-first development | Build all UI as web app, wire Electron last |
| 2026-03-28 | In-memory data layer | Matches IPC contract; only service files change on swap |
| 2026-03-28 | Zustand for timer state | Real-time tick can't be in React Query |
| 2026-03-28 | SM-2 as pure function | Testable, no side effects |
| 2026-03-28 | cmdk for command palette | Lightweight, accessible, keyboard-first |
| 2026-03-28 | Projects as org layer | No own data — filters existing services by projectId |
| 2026-03-28 | Column types as JSON | Flexible schema, extensible for Formula type later |

---

## Next Steps (Priority Order)

1. **Electron IPC wiring** — main process, preload, IPC handlers, SQLite persistence
2. **Cross-module integration** — tasks on calendar, notes→flashcards
3. **Keyboard shortcuts system** — global handler
4. **Polish** — error boundaries, loading states, animations
5. **Formula columns** in Tables
6. **CSV import/export**
