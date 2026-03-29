# DiveIn — Changelog

Session-by-session record of all development work. AI agents: **append to this file after every session.**

---

## Session 14 — Rebrand, Theme System, Full UI Overhaul, and Tasks Rewrite (2026-03-29, ~11:39–13:18 SGT)

**Coordinator:** Work Claw (planning / orchestration / auditing)  
**Coding agents:** Claude Sonnet 4.6 sub-agents only (per Devvyn instruction)

### Context / user direction
Devvyn rejected the current UI quality as far below the target standard and asked for:
- rebrand from **Nexus → DiveIn**
- proper **light mode**
- all future coding to be done by **Claude Sonnet 4.6** sub-agents
- research-driven, top-tier product thinking (Linear / Notion / Jira / Todoist quality bar)
- better project management discipline: auditing, context docs, handover quality
- immediate focus on a **complete Tasks feature overhaul**

### Part 1 — Rebrand + Theme + App-wide UI overhaul

#### Rebrand
- Renamed **Nexus → DiveIn** across project metadata, page title, sidebar branding, settings/about, export text
- Project now lives at: `C:\Users\immer\OneDrive\Desktop\divein\`

#### Theme system
- Rewrote `src/styles/globals.css` into a tokenized semantic design system
- Added **Light / Dark / System** theme support via CSS variables and `[data-theme="dark"]`
- Added theme persistence/migration in `src/shared/stores/appSettingsStore.ts`
- Added system theme detection (`prefers-color-scheme`) support
- Sidebar theme toggle + Settings theme selector both wired

#### App-shell UI changes
- `Sidebar.tsx` redesigned into a cleaner Notion-style layout with sections and stronger navigation hierarchy
- `Layout.tsx`, `StatusBar.tsx`, `CommandPalette.tsx`, `ShortcutCheatsheet.tsx` themed and polished
- Created `UI-DESIGN-GUIDE.md` for future sub-agent consistency

#### Module-level UI work completed
Large visual overhaul across:
- Dashboard
- Calendar
- Habits
- Notes
- Timer
- Flashcards
- Tables
- Projects
- Settings
- app shell components

### Part 2 — Tasks research + architecture
Because Devvyn explicitly wanted much stronger product thinking before more coding, a research-first pass was done.

#### Research output
Created: **`TASKS-UI-RESEARCH.md`**

Covered and analyzed:
- Notion
- Linear
- Jira
- Todoist
- TickTick
- Asana

Documented:
- views
- kanban structures
- task card anatomy
- detail panel patterns
- drag/drop expectations
- filtering and grouping patterns
- concrete color/layout recommendations
- React/Tailwind implementation patterns

#### Spec output
Created: **`TASKS-OVERHAUL-SPEC.md`**

Defined a complete Tasks rewrite with:
- 4 views: **Board / List / Today / Backlog**
- Linear-inspired rich cards
- Notion-style columns/grouping
- Todoist-style focus view
- slide-in detail panel
- richer create modal
- filtering, chips, search, sorting, grouping
- new statuses: `backlog`, `in_review`

### Part 3 — Complete Tasks module rewrite

#### Foundation updates
- `TaskStatus` expanded to include:
  - `backlog`
  - `in_review`
- Added status / priority / tag semantic color tokens to `globals.css`
- Added reusable task UI primitives:
  - `StatusIcon.tsx`
  - `PriorityIcon.tsx`
  - `TaskToast.tsx`
  - `TaskQuickActions.tsx`

#### New Tasks components created
- `TaskBoard.tsx`
- `TaskBoardColumn.tsx`
- `TaskCard.tsx`
- `TaskList.tsx`
- `TaskListRow.tsx`
- `TaskTodayView.tsx`
- `TaskToolbar.tsx`
- `TaskFilterChips.tsx`
- `TaskCreateModal.tsx`

#### Existing Tasks components rewritten
- `TasksPage.tsx` — complete rewrite into orchestrator page
- `TaskDetail.tsx` — complete rewrite into 420px slide-in detail panel

#### Tasks UX/features delivered
- **Board view** with kanban columns and drag-and-drop
- **List view** with dense rows and sorting
- **Today view** grouped by priority and overdue state
- **Backlog view** using the new backlog status
- hover quick actions on task cards
- rich create modal
- slide-in detail panel with editable title/properties/description/subtasks
- toolbar with search, filter, grouping, sorting
- filter chips
- keyboard shortcuts preserved and adapted

### Git commits
```bash
aae6e5c feat: DiveIn rebrand + light/dark theme + comprehensive UI overhaul
5abbc93 feat: complete UI overhaul — Flashcards, Tables, Projects, Settings
e37b49e feat: Tasks overhaul foundation — new statuses, status/priority colors, spec
2ffc80d feat: complete Tasks module overhaul — Kanban board, list, today, detail panel
```

### Validation
- Repeated `npx tsc --noEmit` checks throughout session
- Final TypeScript state: **zero errors**

### Important instructions from Devvyn established this session
1. **All coding should be done by Claude Sonnet 4.6 sub-agents** until told otherwise
2. Main agent should act as **planner / researcher / manager / auditor**, not default coder
3. Quality bar is **top-tier product quality**, not “acceptable” quality
4. Continue improving UI/UX iteratively with research and critique, especially using screenshots

### Remaining / next steps
- Visually QA the new Tasks module in real usage
- Refine board/list/detail panel UX based on live feedback
- Audit drag/drop and keyboard interaction polish
- Clean remaining legacy styling inconsistencies across the broader app
- Update/normalize any remaining old “Nexus” wording in docs

---

## Session 13 — Comprehensive Audit Round 3 + Fixes (2026-03-28, 15:13–15:28 SGT)

**Model:** Opus × 8 sub-agents (3 audit + 4 fix + 1 verification)

### Audit Phase (3 parallel agents)
- **Functional/Logic Bugs:** 4 critical, 15+ medium found
- **UI/UX & Components:** 6 critical, 22 medium, 19 low found
- **Docs/Deps/Health:** 5 medium, 15+ low found

### Fix Phase (4 parallel agents) — 35+ fixes

**Critical Bug Fixes (8):**
1. Ghost timer entries — orphaned timers capped at 4h max duration
2. Milestone delete cascade — cleans up task milestoneId references
3. Task delete cascade — clears taskId on timer entries
4. NoteEditor JSON.parse — both locations wrapped in try/catch
5. Project delete cascade — cleans up orphaned notes and timer entries
6. Task undo — now captures and restores subtasks
7. Dashboard quick-add — uses local date format instead of UTC ISO
8. Pomodoro race condition — transition guard against double-fire from background tabs

**UI/UX Fixes (12):**
- Delete confirmations: habits, calendar events (recurring-aware), flashcards, table columns
- Error handling: dashboard error banner, habit check-in onError, timer start onError
- Accessibility: dialog roles on CommandPalette + ShortcutCheatsheet, aria-labels on StatusBar/TaskItem, role=switch on SettingsPage toggles

**React Pattern Fixes (5):**
- TasksPage: useCallback for handlers, proper useEffect deps, removed eslint-disable
- KanbanBoard: invalidates ['projects'] queries on drag-drop
- HabitItem: useCallback wrappers, React.memo now effective
- TimerPage: fixed useEffect deps for refetch

**Docs/Deps Fixes (10):**
- Removed unused @radix-ui/react-icons
- Moved tailwindcss to devDependencies
- README: added lucide-react/highlight.js/lowlight, clarified Electron status
- IMPLEMENTATION-STATUS: Drizzle schemas ⚠️ caveat
- CHANGELOG: fixed Session 6 dep list, Session 10 reference direction
- Plan: updated Section 3.2 to reflect actual stack (no shadcn/dnd-kit/Recharts/FlexSearch)
- Extracted recurrenceUtils.ts from recurrence.ts (types vs logic separation)

### Aftermath Verification
**22/22 items verified ✅** — 0 regressions, 0 circular imports, 0 TS errors

### Commit
`9dc56e5` on Develop — 29 files changed, +347/-220 lines
