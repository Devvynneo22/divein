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

## Session 15 — Tasks refinement pass: real grouping/sorting, tag fix, intra-column reorder, better due-date UX (2026-03-29, ~13:44–14:10 SGT)

**Coordinator / implementer:** Work Claw  
**Context:** Devvyn pushed for maximum-effort improvement on Tasks, specifically calling out weak board design, broken group/sort behavior, bad tagging UX, weak date UX, missing in-column drag reorder, and overall lack of world-class polish.

### What was verified from code before changes
The user’s complaints were largely correct:
- **Group / Sort controls were mostly not affecting rendered output** at the page level
- **Tag UX was broken** — the detail tag picker could accidentally save color hex values like `#ef4444` as tag names
- **Board drag/drop only supported cross-column moves**, not proper reordering inside the same column
- **Today linkage was conceptually present as a separate view**, but weakly surfaced in list/task UI
- **Date UX relied mostly on raw native date inputs** with no fast affordances
- **Board styling was serviceable but still too flat / low-hierarchy** for the target bar

### Implementation changes made

#### 1) Grouping and sorting now actually drive rendered views
Created:
- `src/modules/tasks/components/taskViewUtils.ts`

Added:
- canonical task sorting utility
- canonical grouping utility for:
  - none
  - status
  - priority
  - project
  - due date
- today/overdue helper logic

Wired `TasksPage.tsx` to:
- compute `sortedTasks` from toolbar sort state
- compute `groupedTasks` from toolbar group state
- pass sorted/grouped results into list and backlog views

Result:
- **Sort now affects list/backlog/today inputs**
- **Group now affects list/backlog rendering**
- board still groups by status only for now (intentional in this pass)

#### 2) Tagging bug fixed
Updated:
- `TaskDetail.tsx`
- `TaskCreateModal.tsx`
- `TaskCard.tsx`

Changes:
- added tag sanitization
- reject empty tags
- reject accidental hex-color inputs like `#ef4444`
- removed the broken "color dots create a color-string tag" behavior from detail panel
- clarified that tags are names, and color is currently auto-assigned visually

Result:
- the exact bad behavior Devvyn reported is fixed

#### 3) Board drag-and-drop now supports reordering inside the same column
Updated:
- `TaskBoard.tsx`
- `TaskBoardColumn.tsx`
- `TasksPage.tsx`

Changes:
- added reorder handling via existing `useReorderTask`
- implemented drop targets around cards for before-position insertion
- added same-column and cross-column reorder path using `sortOrder`
- preserved existing cross-column status changes

Result:
- you can now drag tasks **within the same status column**, not just across columns

#### 4) Due-date UX improved
Updated:
- `TaskDetail.tsx`

Changes:
- added quick due-date actions:
  - Today
  - Tomorrow
  - Next week
  - Clear
- kept direct date input for precise edits

Result:
- much faster common scheduling flow without removing precision control

#### 5) Today linkage surfaced more clearly
Updated:
- `TaskListRow.tsx`

Changes:
- tasks due today now show a visible **Today** chip in list rows
- today due date gets stronger visual emphasis

Result:
- better connection between general task views and the Today concept

#### 6) Board visual polish improved
Updated:
- `TaskBoardColumn.tsx`

Changes:
- slightly wider columns
- stronger card-column framing
- proper bordered column containers instead of mostly flat washes
- subtle gradient header treatment
- better depth / separation via radius + shadow

Result:
- board reads more intentionally and less like loosely spaced boxes on a blank canvas

### Validation performed
- Ran `npm exec tsc --noEmit --incremental false`
- First run surfaced a real type issue from stricter toolbar state typing
- Fixed it
- Re-ran typecheck successfully

Final TypeScript state after this pass: **zero errors**

### What still remains after this pass
This was a meaningful fix pass, but not the end-state.
Still needed for true best-in-class quality:
- richer board/card density controls
- better customizable color system (themes, status palettes, label colors)
- true multi-property board grouping beyond status
- better list header semantics now that parent controls own sorting
- stronger Today integration on board (if desired: badges/sections/filters)
- better date/time UX beyond due date only (time, reminders, natural language entry)
- stronger empty states, microinteractions, and hover behaviors
- better tag model if you want customizable per-tag color rather than hashed display colors
- more serious product-level features: saved views, WIP limits, command palette task actions, batch actions, subtask previews, recurring UX cleanup, etc.

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
