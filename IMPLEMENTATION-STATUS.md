# Nexus — Implementation Status

> Last updated: 2026-03-28 11:50 SGT  
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
| package.json with correct deps | ✅ | React 19, React Router, TanStack Query, all libs |
| tsconfig.json (renderer) | ✅ | Strict mode, path aliases (@/, @shared/, @modules/) |
| tsconfig.node.json (vite config) | ✅ | Fixed: composite + declaration enabled |
| tsconfig.electron.json | ✅ | For future Electron main process compilation |
| vite.config.ts | ✅ | React plugin, Tailwind plugin, path aliases |
| Tailwind CSS 4 + globals.css | ✅ | Custom theme vars, dark mode, scrollbar styling |
| App shell (Layout + Sidebar + StatusBar) | ✅ | Collapsible sidebar, nav sections, status bar with live timer |
| React Router setup | ✅ | All 10 routes defined |
| TanStack Query client | ✅ | 1min stale time, no retry (local data) |
| Drizzle schemas (all tables) | ✅ | tasks, projects, notes, calendar, habits, flashcards, timer, tables, settings, tags, activity_log, schema_version |
| Electron main.ts | ⚠️ | File exists but NOT wired — app runs as web-only for now |
| Electron preload.ts | ⚠️ | File exists but not compiled or used yet |
| DB connection (better-sqlite3) | ⚠️ | File exists but not tested — requires Electron process |
| Auto-backup service | 📋 | |
| Logging service | 📋 | |
| Error boundaries | 📋 | |
| Old cruft files cleaned | ✅ | Removed unused src/assets/ (hero.png, typescript.svg, vite.svg) |

### Known Issues (Phase 0)
1. **Electron is not wired yet.** The app runs purely as a Vite web app. The Electron main process, preload, and IPC handlers are scaffolded but not integrated. This is intentional — build and test UI first, wire Electron later.
2. **Data is in-memory only.** All modules use in-memory JavaScript arrays. Data is lost on page refresh. The DataService abstraction ensures zero code changes when we swap to Electron IPC + SQLite.

---

## Phase 1: MVP — Daily Driver

### Module 1: Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard page | ✅ | Fully wired to real data from all services |
| Quick capture bar | ✅ | Creates tasks with today's due date via Enter key |
| Today's Tasks section | ✅ | Pulls from taskService, shows up to 5 with "view all" |
| Today's Events section | ✅ | Pulls from eventService with date range filtering |
| Stat cards | ✅ | 5 cards: Tasks due, Events today, Habits (X/Y), Cards to review, Time today |
| Today's Habits section | ✅ | Shows habit list with completion status |
| Stat card navigation | ✅ | Click any stat card to navigate to that module |
| Dynamic greeting | ✅ | Morning/afternoon/evening based on time |
| Weekly overview | 📋 | |
| Customizable widgets | 📋 | |

### Module 2: Task Manager
| Feature | Status | Notes |
|---------|--------|-------|
| Task types & interfaces | ✅ | Full TypeScript types |
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
| Drag-and-drop reorder | 📋 | dnd-kit installed |
| Batch operations | 📋 | |
| Saved filters | 📋 | |
| Recurring tasks | 📋 | |

### Module 3: Notes & Knowledge Base
| Feature | Status | Notes |
|---------|--------|-------|
| Note types & interfaces | ✅ | |
| Data service (noteService) | ✅ | In-memory with search, pinning, sorting |
| TanStack Query hooks | ✅ | |
| Notes page with sidebar | ✅ | Search bar, new note button, note list |
| TipTap editor | ✅ | Full toolbar: B/I/S/Code, H1-H3, Lists, Quote, Divider, Undo/Redo |
| Note title editing | ✅ | |
| Note metadata | ✅ | Updated date, word count |
| Pin/unpin notes | ✅ | Pinned notes sort to top |
| Debounced auto-save | ✅ | 500ms debounce on editor changes |
| Search notes | ✅ | Searches title + content text |
| Folder tree | 📋 | Service supports folders, UI not built |
| Wiki-links | 📋 | |
| Backlinks | 📋 | |
| Slash commands | 📋 | |

### Module 4: Calendar
| Feature | Status | Notes |
|---------|--------|-------|
| Event types & interfaces | ✅ | |
| Data service (eventService) | ✅ | In-memory with date range filtering |
| TanStack Query hooks | ✅ | |
| FullCalendar integration | ✅ | Month, Week, Day views, dark theme |
| Event CRUD | ✅ | Create/edit/delete via side panel form |
| Click date to create event | ✅ | |
| Click event to edit | ✅ | |
| Drag-and-drop reschedule | ✅ | |
| All-day toggle | ✅ | |
| Dark theme CSS vars | ✅ | |
| Tasks on calendar | 📋 | Need cross-module integration |
| Recurring events | 📋 | |

---

## Phase 2: Productivity Features

### Module 5: Habit Tracker ✅ NEW
| Feature | Status | Notes |
|---------|--------|-------|
| Habit types & interfaces | ✅ | Habit, HabitEntry, HabitFrequency, HabitWithStatus |
| Data service (habitService) | ✅ | Full CRUD + checkIn/uncheckIn + streak/completion calculations |
| TanStack Query hooks | ✅ | useHabits, useCheckIn, useUncheckIn, useTodayStatus, useHabitEntries |
| Habits page | ✅ | Grouped habit list, today's date, side panel |
| Habit item component | ✅ | Color border, boolean checkbox / measurable input+progress bar |
| Streak display | ✅ | Current streak with 🔥 badge |
| Create/edit habit form | ✅ | Name, description, color picker, emoji icon, frequency selector |
| Frequency types | ✅ | Daily, specific days (Mon-Sun), X times per week |
| Boolean vs Measurable | ✅ | Toggle with target value + unit for measurable |
| Habit groups | ✅ | Group headers, autocomplete from existing groups |
| Habit stats panel | ✅ | Current streak, longest streak, 7/30-day completion rates |
| Heatmap calendar | ✅ | GitHub contribution-style 12-week grid with habit color intensity |
| Empty state | ✅ | Friendly onboarding with "Add your first habit" button |
| Dashboard integration | ✅ | Habits stat card + today's habits section on dashboard |

### Module 6: Timer & Pomodoro ✅ NEW
| Feature | Status | Notes |
|---------|--------|-------|
| Timer types & interfaces | ✅ | TimeEntry, PomodoroSettings, PomodoroPhase, TimerState |
| Data service (timerService) | ✅ | Start/stop, manual entry, today total, week summary |
| Zustand store (timerStore) | ✅ | Drift-free tick via Date.now() epoch anchoring, phase transitions |
| TanStack Query hooks | ✅ | useTimeEntries, useStartTimer, useStopTimer, useRunningEntry |
| Timer page | ✅ | Big display, controls, description input, today's entries |
| Timer display component | ✅ | SVG circular progress (Pomodoro) / plain digits (Stopwatch) |
| Timer controls | ✅ | Play/Pause hero button, Stop, Skip, mode toggle |
| Stopwatch mode | ✅ | Count-up timer |
| Pomodoro mode | ✅ | Work/short break/long break with configurable intervals |
| Phase transitions | ✅ | Auto-advance with optional auto-start |
| Pomodoro settings | ✅ | Collapsible panel with duration sliders and toggles |
| Time entry list | ✅ | Today's entries with time range, duration, 🍅 badge |
| Manual time entry | ✅ | Add completed entry with start/end/duration |
| StatusBar integration | ✅ | Live timer display with animated pulse when running |
| Dashboard integration | ✅ | "Time today" stat card |

### Module 7: Flashcards & Spaced Repetition ✅ NEW
| Feature | Status | Notes |
|---------|--------|-------|
| Flashcard types & interfaces | ✅ | Deck, Card, CardReview, StudySession, DeckStats |
| SM-2 algorithm | ✅ | Pure function in sm2.ts with interval preview |
| Data service (flashcardService) | ✅ | Full CRUD + study queue + review + stats |
| TanStack Query hooks | ✅ | 13 hooks: useDecks, useCards, useStudyQueue, useReviewCard, etc. |
| Flashcards page | ✅ | Two-mode: deck browser grid ↔ deck view |
| Deck card component | ✅ | Color stripe, card count, due today badge |
| Deck form | ✅ | Name, description, color picker, new cards per day |
| Card list | ✅ | Status badges (new/learning/review/suspended), next review dates |
| Card form | ✅ | Front/back textareas + tag input |
| Study session | ✅ | One card at a time, show/hide answer with CSS 3D flip animation |
| Review buttons | ✅ | Again/Hard/Good/Easy with live interval previews |
| Session complete screen | ✅ | Stats summary with per-rating breakdown |
| Study queue ordering | ✅ | Learning first → due for review → new cards (up to daily limit) |
| Dashboard integration | ✅ | "Cards to review" stat card |

### Remaining Phase 2
| Feature | Status | Notes |
|---------|--------|-------|
| Command palette (Ctrl+K) | 📋 | cmdk library installed |
| Settings page | 📋 | Placeholder exists |

## Phase 3: Advanced Features

### Module 8: Tables & Structured Data
| Feature | Status | Notes |
|---------|--------|-------|
| Tables page | 📋 | Placeholder only |

### Module 9: Project Management
| Feature | Status | Notes |
|---------|--------|-------|
| Projects page | 📋 | Placeholder only |

### Cross-Module Integration
| Feature | Status | Notes |
|---------|--------|-------|
| Tasks on calendar | 📋 | |
| Notes → Flashcards | 📋 | |
| Keyboard shortcuts | 📋 | |

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
| 2026-03-28 | Electron over Tauri | better-sqlite3 + Drizzle ORM can't run in Tauri's WebView |
| 2026-03-28 | Web-first development | Build all UI as web app, wire Electron IPC last |
| 2026-03-28 | In-memory data layer | Matches Electron IPC contract; only service files change on swap |
| 2026-03-28 | Rebuilt from vanilla Vite template | Original scaffold used wrong template |
| 2026-03-28 | lucide-react over @radix-ui/react-icons | More icons, consistent, tree-shakeable |
| 2026-03-28 | Zustand for timer state | Real-time tick state can't be in React Query; Zustand is lightweight |
| 2026-03-28 | SM-2 as pure function | Testable, no side effects, easy to verify correctness |

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
│   │   └── StatusBar.tsx    # Bottom bar (live timer integration)
│   ├── modules/
│   │   ├── dashboard/DashboardPage.tsx  # ✅ Wired to all services
│   │   ├── tasks/                       # ✅ Full CRUD
│   │   │   ├── TasksPage.tsx
│   │   │   ├── components/TaskItem.tsx
│   │   │   ├── components/TaskDetail.tsx
│   │   │   └── hooks/useTasks.ts
│   │   ├── notes/                       # ✅ Full CRUD + TipTap
│   │   │   ├── NotesPage.tsx
│   │   │   ├── components/NoteEditor.tsx
│   │   │   └── hooks/useNotes.ts
│   │   ├── calendar/                    # ✅ Full CRUD + FullCalendar
│   │   │   ├── CalendarPage.tsx
│   │   │   └── hooks/useEvents.ts
│   │   ├── habits/                      # ✅ Full CRUD + heatmap
│   │   │   ├── HabitsPage.tsx
│   │   │   ├── components/HabitForm.tsx
│   │   │   ├── components/HabitItem.tsx
│   │   │   ├── components/HabitStats.tsx
│   │   │   └── hooks/useHabits.ts
│   │   ├── timer/                       # ✅ Stopwatch + Pomodoro
│   │   │   ├── TimerPage.tsx
│   │   │   ├── components/TimerDisplay.tsx
│   │   │   ├── components/TimerControls.tsx
│   │   │   ├── components/TimeEntryList.tsx
│   │   │   ├── components/PomodoroSettings.tsx
│   │   │   └── hooks/useTimer.ts
│   │   ├── flashcards/                  # ✅ SM-2 + study sessions
│   │   │   ├── FlashcardsPage.tsx
│   │   │   ├── components/CardForm.tsx
│   │   │   ├── components/CardList.tsx
│   │   │   ├── components/DeckCard.tsx
│   │   │   ├── components/DeckForm.tsx
│   │   │   ├── components/StudySession.tsx
│   │   │   └── hooks/useFlashcards.ts
│   │   ├── tables/TablesPage.tsx        # 📋 Placeholder
│   │   ├── projects/ProjectsPage.tsx    # 📋 Placeholder
│   │   └── settings/SettingsPage.tsx    # 📋 Placeholder
│   └── shared/
│       ├── lib/
│       │   ├── taskService.ts           # ✅ In-memory
│       │   ├── noteService.ts           # ✅ In-memory
│       │   ├── eventService.ts          # ✅ In-memory
│       │   ├── habitService.ts          # ✅ In-memory
│       │   ├── timerService.ts          # ✅ In-memory
│       │   ├── flashcardService.ts      # ✅ In-memory
│       │   └── sm2.ts                   # ✅ Pure SM-2 algorithm
│       ├── stores/
│       │   └── timerStore.ts            # ✅ Zustand (drift-free)
│       └── types/
│           ├── task.ts
│           ├── note.ts
│           ├── event.ts
│           ├── habit.ts
│           ├── timer.ts
│           └── flashcard.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.electron.json
├── productivity-app-plan.md
├── IMPLEMENTATION-STATUS.md
├── CHANGELOG.md
└── README.md
```

---

## Next Steps (Priority Order)

1. **Build Tables module** — TanStack Table, column types, inline editing
2. **Build Projects module** — project container grouping tasks/notes/time
3. **Wire Electron** — main process, preload, IPC handlers, SQLite persistence
4. **Command palette** (Ctrl+K) — cmdk library
5. **Settings page** — all configurable preferences
6. **Keyboard shortcuts system** — global shortcut handler
7. **Cross-module integration** — tasks on calendar, notes→flashcards
