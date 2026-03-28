# Nexus — Changelog

Session-by-session record of all development work. AI agents: **append to this file after every session.**

---

## Session 1 — 2026-03-28 09:42–10:50 SGT (Gemini)

**Worker:** Gemini (via OpenClaw sub-agent)  
**Model:** google/gemini

### What was done
- Initial product brainstorming and requirements gathering with Devvyn
- Created `productivity-app-plan.md` v1.0 (Tauri + React stack)
- Reviewed and upgraded plan to v2.0 (switched Tauri → Electron due to DB layer issues)
- Created Drizzle schemas for tasks, notes, projects
- Scaffolded project with `npm create vite@latest` (vanilla TS template — **wrong template**)
- Installed dependencies
- Created electron/main.ts, electron/preload.ts, electron/db/connection.ts
- Created directory structure for all modules

### Key decisions
- **Tauri → Electron:** better-sqlite3 and Drizzle ORM cannot run in Tauri's WebView; Rust learning curve too steep
- **SQLite over PostgreSQL:** local-first desktop app, portable, no server needed; Drizzle ORM makes future Postgres migration easy
- **DataService abstraction:** all modules call through service layer, not direct DB/IPC; enables web extraction later

### Issues left
- ⚠️ Project scaffolded with **vanilla Vite TS template, not React** — needs complete rebuild
- ⚠️ Electron not wired (main.ts/preload.ts exist but aren't integrated)
- ⚠️ No React, no ReactDOM, no Router in the project

---

## Session 2 — 2026-03-28 11:05–11:30 SGT (Claude Opus)

**Worker:** Claude Opus 4 (via OpenClaw main session)  
**Model:** anthropic/claude-opus-4-6

### Audit findings
1. Project was fundamentally broken — vanilla Vite TS template, not React
2. `src/main.ts` was raw DOM manipulation (Vite welcome page), not React
3. Missing: React, react-dom, react-router-dom, @vitejs/plugin-react, lucide-react, @fullcalendar/react, concurrently
4. No `vite.config.ts` with React plugin
5. No JSX support in tsconfig
6. Drizzle schemas had import bugs (`notes.ts` missing `real` import, `projects.ts` missing `sql` import)

### What was rebuilt from scratch
1. **package.json** — complete rewrite with correct deps (React 19, Router, TanStack Query, all UI libs)
2. **tsconfig.json** — JSX support, path aliases (@/, @shared/, @modules/), strict mode
3. **tsconfig.node.json** — for Vite config
4. **tsconfig.electron.json** — for future Electron compilation
5. **vite.config.ts** — React plugin, Tailwind plugin, path aliases
6. **index.html** — React root div, dark body class
7. **src/main.tsx** — React 19 entry point
8. **src/styles/globals.css** — Tailwind 4 + custom theme CSS variables, scrollbar styling

### What was built new
1. **App shell** — Layout with collapsible sidebar (9 nav items + settings), status bar, React Router
2. **Dashboard** — stat cards (tasks/events/habits/flashcards), quick capture bar, today sections
3. **Task Manager (full CRUD)**
   - Types: `shared/types/task.ts`
   - Service: `shared/lib/taskService.ts` (in-memory, matches IPC contract)
   - Hooks: `modules/tasks/hooks/useTasks.ts` (TanStack Query)
   - UI: TasksPage, TaskItem, TaskDetail
   - Features: quick-add, status tabs, priority flags, due dates, tags, description, status cycling
4. **Notes module (full CRUD)**
   - Types: `shared/types/note.ts`
   - Service: `shared/lib/noteService.ts`
   - Hooks: `modules/notes/hooks/useNotes.ts`
   - UI: NotesPage with sidebar + NoteEditor (TipTap)
   - Features: rich text toolbar, search, pin/unpin, auto-save (500ms debounce)
5. **Calendar module (full CRUD)**
   - Types: `shared/types/event.ts`
   - Service: `shared/lib/eventService.ts`
   - Hooks: `modules/calendar/hooks/useEvents.ts`
   - UI: CalendarPage with FullCalendar + event form panel
   - Features: month/week/day views, click-to-create, click-to-edit, drag-to-reschedule, dark theme
6. **All Drizzle schemas completed** — 9 files covering every module
7. **Fixed schema bugs** — missing imports in notes.ts and projects.ts
8. **IMPLEMENTATION-STATUS.md** — comprehensive tracking document
9. **README.md** — project overview and documentation index
10. **CHANGELOG.md** — this file

### Files deleted
- `src/main.ts` (old vanilla Vite entry)
- `src/counter.ts` (old Vite demo)
- `src/style.css` (old Vite demo)

### Architecture patterns established
- **DataService abstraction:** every module has a service in `shared/lib/` that matches the future Electron IPC contract. Components never call IPC directly. When wiring Electron, only the service files change.
- **Module structure:** Types → Service → Hooks → Components → Page
- **Event bus pattern** (planned, not implemented): modules will communicate via typed events, never direct imports

### Verified working
- ✅ Vite dev server starts and serves app
- ✅ All routes render (sidebar navigation works)
- ✅ Task creation, display, status cycling, detail panel
- ✅ Note creation, TipTap editor with formatting toolbar
- ✅ Calendar renders with FullCalendar (month/week/day), event creation
- ✅ Dark theme consistent across all modules

### Context for next session
- 200k token context window was at 80% (161k/200k) at session end
- Devvyn wants top-class quality — think carefully, verify correctness
- User is a data scientist, not a deep engineer — keep things clean and well-documented
- Data is in-memory only — page refresh clears everything. This is expected until Electron is wired.

---

## Devvyn's Standing Instructions

1. **Quality bar:** "I expect a top class world standard quality product." Think deeply, verify correctness, consider if there's a better way.
2. **Documentation:** Every session must update `IMPLEMENTATION-STATUS.md` and append to `CHANGELOG.md`.
3. **Plan updates:** Any changes to features, cancellations, or architecture upgrades should be reflected in `productivity-app-plan.md`.
4. **Sub-agents welcome:** "Spawn as many sub agents as you need to get the job done."
5. **Think first, build second:** "Is this correct? Is there a better way?" — but also "get the first layer done."
6. **Future-proof:** Always consider scalability (personal → multi-user), platform expansion (desktop → web → mobile), and AI integration readiness.
7. **SQLite first:** Devvyn initially wanted PostgreSQL but was convinced SQLite is better for local-first. Don't revisit this unless there's a real problem.

---

## Next Steps (Priority Order)

1. Build Tables module (TanStack Table)
2. Build Projects module
3. Wire Electron (main process, preload, IPC handlers, SQLite persistence)
4. Command palette (Ctrl+K)
5. Settings page
6. Keyboard shortcuts system
7. Cross-module integration (tasks on calendar, notes→flashcards)

---

## Session 3 — 2026-03-28 11:35–11:55 SGT (Claude Opus)

**Worker:** Claude Opus 4 (main) + 3× Claude Sonnet sub-agents  
**Model:** anthropic/claude-opus-4-6 (orchestrator), anthropic/claude-sonnet-4-6 (builders)

### Audit & fixes on entry
1. Fixed tsconfig.node.json — added `composite: true` and `declaration: true` (TS project reference requirement)
2. Fixed CalendarPage.tsx — `eventClick` handler typing (FullCalendar's `EventClickArg` vs inline type)
3. Fixed NoteEditor.tsx — `useRef()` requires initial value in React 19 strict types
4. Removed cruft files: `src/assets/hero.png`, `src/assets/typescript.svg`, `src/assets/vite.svg`
5. `npx tsc --noEmit` passes clean after all fixes

### Built: Habits Module (sub-agent)
**Files created:** 7
- `src/shared/types/habit.ts` — Habit, HabitEntry, HabitFrequency, HabitWithStatus types
- `src/shared/lib/habitService.ts` — Full service: CRUD + checkIn/uncheckIn + streak/longestStreak/completionRate + getTodayStatus
- `src/modules/habits/hooks/useHabits.ts` — 9 TanStack Query hooks
- `src/modules/habits/HabitsPage.tsx` — Main page with grouped list, side panel, empty state
- `src/modules/habits/components/HabitItem.tsx` — Boolean checkbox / measurable input+progress, streak badge
- `src/modules/habits/components/HabitForm.tsx` — Full form: name, color picker, emoji, frequency (daily/specific days/X per week), boolean/measurable toggle, groups
- `src/modules/habits/components/HabitStats.tsx` — Current/longest streak, 7/30-day rates, 12-week GitHub-style heatmap

### Built: Timer & Pomodoro Module (sub-agent)
**Files created:** 8
- `src/shared/types/timer.ts` — TimeEntry, PomodoroSettings, PomodoroPhase types
- `src/shared/lib/timerService.ts` — Start/stop, manual entry, today total, week summary
- `src/shared/stores/timerStore.ts` — Zustand store with drift-free `tick()` via `Date.now()` epoch anchoring
- `src/modules/timer/hooks/useTimer.ts` — 7 TanStack Query hooks
- `src/modules/timer/TimerPage.tsx` — Hero timer display, controls, session entries
- `src/modules/timer/components/TimerDisplay.tsx` — SVG circular progress ring (Pomodoro) / plain digits (Stopwatch)
- `src/modules/timer/components/TimerControls.tsx` — Play/Pause/Stop/Skip, Stopwatch↔Pomodoro toggle
- `src/modules/timer/components/TimeEntryList.tsx` — Today's entries with 🍅 badges
- `src/modules/timer/components/PomodoroSettings.tsx` — Collapsible settings with sliders/toggles

### Built: Flashcards & Spaced Repetition Module (sub-agent)
**Files created:** 9
- `src/shared/types/flashcard.ts` — Deck, Card, CardReview, StudySession, DeckStats types
- `src/shared/lib/sm2.ts` — Pure SM-2 algorithm + interval preview function
- `src/shared/lib/flashcardService.ts` — Full service: deck/card CRUD + study queue (learning→due→new ordering) + review + stats
- `src/modules/flashcards/hooks/useFlashcards.ts` — 13 TanStack Query hooks
- `src/modules/flashcards/FlashcardsPage.tsx` — Two-mode: deck browser grid ↔ deck view (Cards/Study tabs)
- `src/modules/flashcards/components/DeckCard.tsx` — Color stripe, counts, due badge
- `src/modules/flashcards/components/DeckForm.tsx` — Name, description, color, new cards/day
- `src/modules/flashcards/components/CardList.tsx` — Status badges, next review, inline creation
- `src/modules/flashcards/components/CardForm.tsx` — Front/back textareas + tags
- `src/modules/flashcards/components/StudySession.tsx` — CSS 3D card flip, 4 review buttons with interval previews, session complete screen

### Integrated: Dashboard (main session)
- Rewrote `DashboardPage.tsx` — now wired to all 6 services (tasks, events, habits, flashcards, timer)
- 5 stat cards with live data + click-to-navigate
- Quick capture creates tasks with today's due date
- Today's Tasks/Events sections pull from services with "view all" links
- Today's Habits section with completion status
- Dynamic greeting (morning/afternoon/evening)

### Integrated: StatusBar (main session)
- Rewrote `StatusBar.tsx` — shows live timer from Zustand store
- Animated green pulse dot when timer running
- Monospace tabular-nums display (no digit jumping)
- Phase label for Pomodoro (🍅 Focus / ☕ Break)
- Click to navigate to Timer page

### Verification
- `npx tsc --noEmit` — **zero errors** across entire codebase
- All 7 modules render correctly in browser (verified via snapshot)
- All navigation working
- Dashboard displays real data from all services
- StatusBar timer integration working

### File count
- **Total new files this session:** 24
- **Files modified:** 4 (DashboardPage.tsx, StatusBar.tsx, CalendarPage.tsx, NoteEditor.tsx, tsconfig.node.json)

### Architecture patterns maintained
- DataService abstraction: every new module has service → hooks → components → page
- Zustand for real-time state (timer) that React Query can't handle
- SM-2 as pure function (testable, no side effects)
- All modules follow same directory and naming conventions

---

## Session 4 — 2026-03-28 12:05–12:15 SGT (Claude Opus)

**Worker:** Claude Opus 4 (main) + 2× Claude Sonnet sub-agents  
**Model:** anthropic/claude-opus-4-6 (orchestrator), anthropic/claude-sonnet-4-6 (builders)

### Built: Tables & Structured Data Module (sub-agent)
**Files created:** 10
- `src/shared/types/table.ts` — ColumnDef (8 types), TableDef, TableRow, filter/sort interfaces
- `src/shared/lib/tableService.ts` — 16 methods: CRUD + addColumn/updateColumn/deleteColumn + updateCell + type-aware filtering & sorting
- `src/modules/tables/hooks/useTables.ts` — 13 TanStack Query hooks
- `src/modules/tables/TablesPage.tsx` — Two-mode: table browser grid → table view with grid
- `src/modules/tables/components/TableCard.tsx` — Browser grid card
- `src/modules/tables/components/TableGrid.tsx` — TanStack Table spreadsheet: sticky header, inline editing, Tab nav, row selection
- `src/modules/tables/components/CellEditor.tsx` — Per-type inline editors (text/number/date/select/multiselect/url/email/checkbox)
- `src/modules/tables/components/ColumnHeader.tsx` — Sort toggle, right-click context menu (rename/type change/delete)
- `src/modules/tables/components/AddColumnPanel.tsx` — Add column with type selector, options editor for select/multiselect
- `src/modules/tables/components/FilterBar.tsx` — Multi-filter bar with type-appropriate operators
- `src/modules/tables/components/SortBar.tsx` — Multi-sort with direction toggle and priority

### Built: Projects Module (sub-agent)
**Files created:** 10
- `src/shared/types/project.ts` — Project, ProjectStatus, ProjectStats types
- `src/shared/lib/projectService.ts` — CRUD + archive/unarchive + cross-service getStats
- `src/modules/projects/hooks/useProjects.ts` — 10 hooks including useProjectTasks, useProjectNotes, useProjectStats
- `src/modules/projects/ProjectsPage.tsx` — Two-mode: project browser → project view with tabs
- `src/modules/projects/components/ProjectCard.tsx` — Color stripe, stats row, archived badge
- `src/modules/projects/components/ProjectForm.tsx` — Name, description, color picker, emoji icon
- `src/modules/projects/components/ProjectHeader.tsx` — Color accent bar, actions (edit/archive/delete)
- `src/modules/projects/components/ProjectOverview.tsx` — 4 stat cards + recent tasks + recent notes + time
- `src/modules/projects/components/ProjectTaskList.tsx` — Quick-add with auto projectId, status filters
- `src/modules/projects/components/ProjectNoteList.tsx` — Note list with inline creation
- `src/modules/projects/components/ProjectActivity.tsx` — Time entries for project

### Built: Command Palette (main session)
- `src/app/CommandPalette.tsx` — cmdk-powered, Ctrl+K trigger, backdrop overlay
- 10 navigation items + 4 create actions, fuzzy search, keyboard hints
- Integrated into App.tsx (renders above Routes)

### Built: Settings Page (main session)
- Complete rewrite of `src/modules/settings/SettingsPage.tsx`
- Tabbed layout: General (theme/sidebar/date format/week start), Pomodoro (wired to Zustand), Flashcards, Data (storage info), About
- Custom ToggleSwitch component, SettingRow pattern

### Fixes
- `noteService.list()` now filters by `projectId` (was missing, needed for Projects module)
- Restarted Vite dev server (stale cache from deleted asset files)

### Verification
- `npx tsc --noEmit` — **zero errors** across entire 97-file codebase
- All 9 modules + settings render correctly in browser
- Command palette opens/closes with Ctrl+K, search works
- Dashboard, Tables, Projects all verified via browser snapshots

### Committed
- `c0306ba` — Tables + Projects + Command Palette + Settings (26 files, +4352 lines)

### Milestone: ALL 9 MODULES COMPLETE 🎉
Every module in the plan is now functional:
1. Dashboard ✅ (wired to all services)
2. Tasks ✅ (full CRUD)
3. Notes ✅ (TipTap editor)
4. Calendar ✅ (FullCalendar)
5. Habits ✅ (tracker + heatmap)
6. Timer ✅ (stopwatch + pomodoro)
7. Flashcards ✅ (SM-2 + study sessions)
8. Tables ✅ (spreadsheet + inline editing)
9. Projects ✅ (organizational layer)
Plus: Command Palette ✅, Settings ✅

### Next priorities
1. Electron IPC wiring (main process, preload, SQLite persistence)
2. Cross-module integration (tasks on calendar, notes→flashcards)
3. Keyboard shortcuts system
4. Polish (error boundaries, loading states, animations)

---

## Session 5 — 2026-03-28 12:23–12:35 SGT (Claude Opus)

**Worker:** Claude Opus 4 (main) + Claude Sonnet (Notes overhaul)
**Model:** anthropic/claude-opus-4-6 (orchestrator), anthropic/claude-sonnet-4-6 (builder)

### 🔥 Major: Notes Module Overhaul
Complete rebuild from flat note list to Notion-level hierarchical knowledge base:

**New architecture:**
- Pages nest infinitely (any page can contain sub-pages)
- Tree sidebar with expand/collapse, hover actions (+ sub-page, ⋯ menu)
- Breadcrumb navigation showing full page path
- Page icons (emoji picker with 30+ presets)
- Favorites section (pinned pages at sidebar top)
- Sub-pages list at bottom of each page editor
- Soft delete with Trash (restore + empty trash)
- Full-text search with breadcrumb context in results

**New components created (8):**
- `NotesSidebar.tsx` — Tree sidebar with search, favorites, pages, trash
- `NoteTreeItem.tsx` — Recursive tree node with expand/collapse animations
- `NoteBreadcrumb.tsx` — Clickable hierarchy breadcrumb
- `NoteHeader.tsx` — Editable icon + title + creation meta
- `SubPagesList.tsx` — Children shown at bottom of each page
- `NoteSearchResults.tsx` — Search results with breadcrumb context
- `TrashPanel.tsx` — Trash management (restore, empty)
- `PageIconPicker.tsx` — Emoji grid picker

**Rewritten files (5):**
- `shared/types/note.ts` — Added parentId, icon, coverColor, isTrashed, depth, hasChildren, sortOrder, NoteTreeNode
- `shared/lib/noteService.ts` — Full tree-aware service: getTree, getAncestors, moveTo, trash/restore, search, descendants
- `modules/notes/hooks/useNotes.ts` — 15 hooks including useNoteTree, useNoteAncestors, useMoveNote, useTrashNote
- `modules/notes/NotesPage.tsx` — Complete rebuild with sidebar + breadcrumb + header + editor + sub-pages
- `modules/notes/components/NoteEditor.tsx` — Enhanced styling and placeholder

### Fix: Dashboard Numbers Not Updating
Root cause: dashboard query keys used `['dashboard', ...]` prefix which wasn't invalidated by module mutations.
Fix: Aligned query keys to start with module prefix (e.g. `['tasks', 'dashboard', 'dueToday']`) so TanStack Query's prefix-based invalidation cascades from module mutations.
Also set `staleTime: 0` and `refetchOnWindowFocus: true` for dashboard queries.

### Thorough Testing Done
Verified in browser:
- ✅ Task creation + detail panel + status cycling
- ✅ Notes: create root page, create sub-page, rename, breadcrumb navigation
- ✅ Notes: tree sidebar expand/collapse, sub-pages list
- ✅ Flashcards: create deck, view deck with stats
- ✅ All modules render without errors

### Committed
- `0726827` — Notes overhaul + dashboard fix (14 files, +1455/-229 lines)

---

## Session 6 — 2026-03-28 12:50–13:15 SGT (Claude Opus)

**Worker:** Claude Opus 4 (main) + Claude Sonnet (initial pass, reviewed by Opus)
**Model:** anthropic/claude-opus-4-6

### 🔥 Major: Notes Editor Deep Overhaul (Per Devvyn's Request)
Focus: make Notes the best module in the app. Quality over breadth.

**Devvyn's specific requests:**
- Notes should persist (not lost on refresh)
- Add image support
- Top = title area, bottom = freeform content (words, pictures, emojis)
- Remove "add sub-page" button from editor (sidebar-only)
- Make it truly great

### What was built

**1. localStorage Persistence**
- Notes now survive page refresh via `localStorage` (`nexus-notes` key)
- Every mutation (create/update/delete/trash/restore/move/emptyTrash) calls `persist()`
- Bridge solution until Electron/SQLite wiring

**2. Freeform Editor Layout**
- Removed SubPagesList from editor area — sub-pages managed only from sidebar
- Removed border between header and editor — flows as one continuous page
- Editor fills all remaining space below header

**3. Image Support**
- Toolbar button opens file picker
- Drag & drop images into editor
- Paste from clipboard (Ctrl+V screenshots)
- Images stored as base64 data URLs in content JSON
- Images render with rounded corners, max-width 100%, selection outline

**4. Slash Commands (/ menu)**
- Type `/` to open floating command menu
- 11 commands: Heading 1/2/3, Bullet/Numbered/To-do List, Image, Code Block, Quote, Divider, Callout
- Fuzzy search as you type, keyboard navigation (↑↓ Enter Escape)
- Menu positioned at caret, auto-deletes slash text on selection

**5. Task Lists**
- Interactive checkboxes via @tiptap/extension-task-list + task-item
- Checked items get strikethrough + muted color
- Custom checkbox styling (accent color, checkmark SVG)

**6. Enhanced Toolbar**
- Added: Underline, Highlight (yellow), Text color picker (9 colors + reset), Image, Emoji, Task List, Code Block
- Emoji picker: 6 categories (Smileys, Gestures, Objects, Nature, Symbols, Activities), search, ~230 emojis

**7. Floating Bubble Menu**
- Appears on text selection
- Bold, Italic, Underline, Strikethrough, Code, Highlight, Link + 7-color palette
- Custom implementation (TipTap v3 doesn't export React BubbleMenu component)

**8. Code Blocks with Syntax Highlighting**
- Powered by @tiptap/extension-code-block-lowlight + lowlight
- 8 languages: JavaScript, TypeScript, Python, CSS, HTML, JSON, SQL, Bash
- Catppuccin-inspired dark theme for syntax colors

**9. Editor CSS**
- Task list checkbox styling with custom checkmark
- Code block dark theme with rounded corners
- Image styling with selection outline
- Blockquote accent border
- Inline code pink highlight
- Link styling with underline offset
- Horizontal rule styling

### New files (3)
- `SlashCommandMenu.tsx` — Floating slash command menu (192 lines)
- `EditorBubbleMenu.tsx` — Custom floating selection toolbar (160 lines)
- `EmojiPicker.tsx` — Rich categorized emoji picker (130 lines)

### Modified files (5)
- `noteService.ts` — localStorage persistence layer
- `NotesPage.tsx` — Removed SubPagesList, seamless layout
- `NoteEditor.tsx` — Complete rewrite with all new extensions
- `globals.css` — All new editor styles (task lists, code blocks, images, etc.)
- `package.json` — 10 new TipTap extensions

### New dependencies installed
@tiptap/extension-task-list, @tiptap/extension-task-item, @tiptap/extension-underline, @tiptap/extension-highlight, @tiptap/extension-text-style, @tiptap/extension-color, @tiptap/extension-typography, @tiptap/extension-dropcursor

### Verification
- `npx tsc --noEmit` — **zero errors** (with `--incremental false` to clear stale cache)
- Tested in browser:
  - ✅ Create page, type content, word count updates
  - ✅ Slash command menu appears on `/`, all commands work
  - ✅ Task list checkbox renders and is interactive
  - ✅ **Content persists across full page refresh** (localStorage working)
  - ✅ Sub-page creation from sidebar, tree hierarchy intact
  - ✅ Breadcrumb navigation correct for nested pages
  - ✅ Enhanced toolbar renders all new buttons

### Committed
- `75331e1` — Notes overhaul: localStorage, slash commands, images, task lists, enhanced editor (9 files, +1365/-67 lines)

### Devvyn's Standing Instruction Update
- **Sub-agents for coding must use Claude Opus 4-6** — not Sonnet or other models

---

## Session 7 — 2026-03-28 13:27–13:35 SGT (Claude Opus)

**Worker:** Claude Opus 4 (main) + 2× Claude Opus sub-agents (parallel)
**Model:** anthropic/claude-opus-4-6

### 🔥 Critical: localStorage Persistence for ALL Services

All 7 remaining data services now persist to localStorage (Notes was done in session 6):

| Service | Storage Keys | Mutations with persist() |
|---------|-------------|--------------------------|
| taskService | `nexus-tasks` | create, update, delete, reorder |
| eventService | `nexus-events` | create, update, delete |
| habitService | `nexus-habits`, `nexus-habit-entries` | create, update, delete, checkIn, uncheckIn |
| timerService | `nexus-timer-entries` | startTimer, stopTimer, createManualEntry, updateEntry, deleteEntry |
| flashcardService | `nexus-decks`, `nexus-cards`, `nexus-reviews` | createDeck, updateDeck, deleteDeck, createCard, updateCard, deleteCard, reviewCard |
| tableService | `nexus-tables`, `nexus-table-rows` | createTable, updateTable, deleteTable, addColumn, updateColumn, deleteColumn, createRow, updateRow, deleteRow, updateCell |
| projectService | `nexus-projects` | create, update, delete |

**Total: 12 localStorage keys across 8 services (including noteService).**

### Verification
- `npx tsc --noEmit --incremental false` — **zero errors**
- Tested in browser:
  - ✅ Created task "Test persistence task" → survived page refresh
  - ✅ Created calendar event "Persistence test event" → survived page refresh
  - ✅ Dashboard shows persisted data (1 event today, task count)
  - ✅ Cross-module data flow working (events service → dashboard)

### Committed
- `9a7ab6f` — localStorage persistence for ALL services (7 files, +242/-15 lines)

### Impact
**The app is now genuinely usable as a daily tool.** Every module retains data across sessions. This was the single biggest blocker to MVP usability.
