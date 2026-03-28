# 📋 Handoff Message for Next Session

**Project:** Nexus — local-first productivity super-app  
**Location:** `C:\Users\immer\OneDrive\Desktop\nexus\`  
**Branch:** Develop  
**Date:** 2026-03-28 15:08 SGT

---

## Start Here

Read these files in order:
1. **`IMPLEMENTATION-STATUS.md`** — what's done, what's left (✅/📋 for every feature)
2. **`CHANGELOG.md`** — full session history (Sessions 1–11) + handover notes
3. **`productivity-app-plan.md`** — master design doc (Phase 4 items, deferred features list)

---

## Current State

| Aspect | Status |
|--------|--------|
| **Phases 1–3** | ✅ 100% Complete |
| **Phase 4** | 📋 Not started |
| **TypeScript** | Zero errors (`npx tsc --noEmit --incremental false`) |
| **Git** | Clean working tree, 29 commits on Develop |
| **npm** | Clean (`npm ls` — no warnings) |
| **Source files** | 103 (.ts/.tsx) |
| **Audit status** | 2 rounds complete. 0 critical, 0 medium bugs remaining |

### Run it
```bash
cd C:\Users\immer\OneDrive\Desktop\nexus
npm run dev
# → http://localhost:5173
```

---

## Tech Stack

- **Framework:** React 19 + TypeScript (strict) + Vite
- **Styling:** Tailwind CSS 4 + CSS custom properties (dark theme)
- **State:** TanStack Query (server state) + Zustand (timer + app settings)
- **Rich text:** TipTap 2 (ProseMirror) with extensions
- **Calendar:** FullCalendar
- **Tables:** TanStack Table
- **Command palette:** cmdk
- **Icons:** Lucide React
- **Dates:** date-fns
- **Data:** localStorage (12+ keys across 8 services)
- **ORM (planned):** Drizzle ORM (schemas already written)
- **DB (planned):** SQLite via better-sqlite3

---

## Architecture

```
src/
  app/          → App shell (Layout, Sidebar, StatusBar, CommandPalette, ErrorBoundary, ShortcutCheatsheet)
  modules/      → 10 feature modules (dashboard, tasks, notes, calendar, habits, timer, flashcards, tables, projects, settings)
    [module]/
      [Module]Page.tsx     → Main page component
      hooks/use[Module].ts → TanStack Query hooks
      components/          → Sub-components
  shared/
    types/      → TypeScript interfaces (9 type files + recurrence.ts)
    lib/        → Service layer (14 services — localStorage CRUD, each matches future Electron IPC contract)
    stores/     → Zustand stores (timerStore, appSettingsStore)
```

**Key pattern:** DataService abstraction. Every module calls through `shared/lib/*Service.ts`. Components never touch storage directly. When wiring Electron, only the service files change — zero component changes.

---

## 9 Modules (all complete)

| Module | Key Features |
|--------|-------------|
| **Dashboard** | 5 stat cards, quick capture, today's tasks/events/habits |
| **Tasks** | CRUD, subtasks, keyboard shortcuts, drag reorder, recurring tasks, undo delete |
| **Notes** | TipTap editor, hierarchical pages, wiki-links, backlinks, slash commands, images, code blocks, flashcard creation, export (MD/PDF) |
| **Calendar** | FullCalendar (month/week/day), event CRUD, tasks on calendar, recurring events with exceptions |
| **Habits** | Boolean + measurable, streaks, heatmap, groups |
| **Timer** | Stopwatch + Pomodoro, audio notifications, task linking, phase indicator, settings persist |
| **Flashcards** | SM-2 spaced repetition, deck/card CRUD, 3D flip study session |
| **Tables** | 9 column types (incl. formula), inline editing, filtering, sorting, board view, CSV import/export |
| **Projects** | Organizational layer, kanban board, milestones with progress bars, cross-service stats |

Plus: Command Palette (Ctrl+K with global search), Settings (6 tabs, all persist), Keyboard Shortcuts (? cheatsheet, customizable), Error Boundaries, Loading States.

---

## Phase 4: What's Next

Priority order from the plan:

### 1. Electron IPC Wiring
- `electron/main.ts` and `electron/preload.ts` are scaffolded but not wired
- Need: IPC handlers for each service, preload API exposure, main process DB connection
- Swap each `shared/lib/*Service.ts` from localStorage to `window.api.*` IPC calls
- Drizzle schemas exist in `drizzle/schema/` (9 files) — ready for SQLite tables

### 2. SQLite Persistence
- Replace localStorage with better-sqlite3 via Electron main process
- Drizzle ORM migrations from existing schemas
- Data migration: one-time import from localStorage → SQLite

### 3. Auto-backup
- Periodic SQLite DB file copy to backup location
- Configurable in Settings → Data tab

### 4. Auto-updater
- electron-updater (already in deps)

### 5. CI/CD + Packaging
- electron-builder config already in package.json (win/mac/linux targets)

### 6. Cloud Sync (future)
- Drizzle ORM supports both SQLite and PostgreSQL — schema migration path is clean

---

## Remaining Low-Priority Polish (optional)

These were flagged in audit but are cosmetic/non-functional:
- aria-labels on interactive elements (sidebar, status bar, task toggles)
- Focus trapping in modals (CommandPalette, ShortcutCheatsheet, CreateFlashcardModal)
- Hardcoded hex colors in CalendarPage priority colors → should use CSS vars
- Document title updates per route (browser tab always shows default)
- Mutation loading states (buttons don't disable during save)
- Formula engine: no circular reference detection (silent wrong results, not crash)
- CSV import: no user feedback for empty files; sequential row creation (slow for large imports)

---

## localStorage Keys (current persistence)

| Key | Service | Data |
|-----|---------|------|
| `nexus-tasks` | taskService | Task[] |
| `nexus-events` | eventService | CalendarEvent[] |
| `nexus-projects` | projectService | Project[] |
| `nexus-milestones` | milestoneService | Milestone[] |
| `nexus-notes` | noteService | Note[] |
| `nexus-habits` | habitService | Habit[] |
| `nexus-habit-entries` | habitService | HabitEntry[] |
| `nexus-timer-entries` | timerService | TimeEntry[] |
| `nexus-timer-settings` | timerStore | PomodoroSettings |
| `nexus-decks` | flashcardService | Deck[] |
| `nexus-cards` | flashcardService | Card[] |
| `nexus-reviews` | flashcardService | Review[] |
| `nexus-tables` | tableService | TableDef[] |
| `nexus-table-rows` | tableService | TableRow[] |
| `nexus-shortcuts` | shortcutService | user overrides |
| `nexus-app-settings` | appSettingsStore | AppSettings |
| `nexus-flashcard-settings` | appSettingsStore | FlashcardSettings |

---

## Standing Rules

- **Sub-agents for coding MUST use Claude Opus 4-6** (`anthropic/claude-opus-4-6`)
- **Quality bar:** Top 1% FANG engineering standards. Test everything in browser.
- **After every session:** Append to `CHANGELOG.md`, update `IMPLEMENTATION-STATUS.md`
- **Plan changes:** Update `productivity-app-plan.md`
- **Dependencies:** `npm install --legacy-peer-deps`
- **Type check:** `npx tsc --noEmit --incremental false` must pass zero errors
- Sub-agents can be spawned freely, in parallel where possible

---

## Git Log (full)

```
ea53213 fix: resolve 4 medium issues from round 2 audit
b04ea63 docs: CHANGELOG session 11 — comprehensive audit + 28 bug fixes
03bedbf chore: docs rewrite, dependency cleanup, dead code removal
b7cd9cb fix: persist settings, improve search, fix audio & add phase indicator
c49086c fix: editor memory leak, bubble menu positioning, 404 route, PDF export, null guard
70fba9e docs: CHANGELOG + IMPLEMENTATION-STATUS session 10 — Phase 2+3 complete
17ddd1b feat: loading states + note export menu + CSV import/board view fixups
806ee80 feat: add recurring events and tasks support
c364e10 feat(tables): add formula column type with expression engine
e278c9d feat: add global search, keyboard shortcut cheatsheet, and customizable shortcuts
3427fa6 feat: add Notes → Flashcards cross-module integration
3ec0a35 feat(timer): add audio notifications on pomodoro phase transitions and task linking
bbe28a0 docs: handover notes for Phase 2+3 completion
e9496ef docs: CHANGELOG + IMPLEMENTATION-STATUS session 9 — MVP1 100% complete
2a1d718 feat: Wiki-links [[...]] with autocomplete + Backlinks panel
f54e1a2 feat: Global quick-add hotkey (Ctrl+Shift+N)
13bd5ad docs: CHANGELOG + IMPLEMENTATION-STATUS session 8 — MVP1 complete
b3b74d1 feat: MVP1 completion — Tasks polish + Tasks on Calendar
d9b10a6 docs: CHANGELOG + IMPLEMENTATION-STATUS session 7
9a7ab6f feat: localStorage persistence for ALL services
f6d8e37 docs: CHANGELOG session 6, IMPLEMENTATION-STATUS update
75331e1 feat: Notes overhaul — localStorage, slash commands, images, task lists
d496242 docs: update IMPLEMENTATION-STATUS for Notes overhaul
c4d50ca docs: CHANGELOG session 5
0726827 feat: Notes overhaul + dashboard fix
037b2ba docs: session 4
c0306ba feat: Tables + Projects + Command Palette + Settings
4f9bb23 feat: Habits + Timer + Flashcards + Dashboard wiring
2347e42 Initial commit
```
