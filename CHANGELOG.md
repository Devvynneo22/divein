# DiveIn — Changelog

Session-by-session record of all development work. AI agents: **append to this file after every session.**

---

## Session 21 — Notes Features Trifecta + Sidebar Redesign + Tasks Polish (2026-03-30, SGT)

**Coding agent:** Claude Sonnet 4.6 (main + sub-agents)

### Objective
Comprehensive quality session: fix Notes search UI bug, redesign the main sidebar, then build 3 major new Notes features (Daily Notes, Templates, Cover Banners). Also addressed several Tasks module visual issues raised in visual QA.

---

### Tasks Module — Visual QA Fixes

#### `src/modules/tasks/components/TaskCard.tsx`
- Replaced invisible 3px left-border priority indicator with a **prominent priority badge pill** between title and status block (emoji 🔴🟠🟡🔵 + uppercase label URGENT/HIGH/MEDIUM/LOW)
- Added **3px colored top border** on the card keyed to priority color
- Removed `PriorityIcon` import (badge is now inline)
- Tag colors now respect `tagColors` from `taskSettingsStore` — custom colors persist globally

#### `src/modules/tasks/components/TaskBoardColumn.tsx`
- Restored **top accent color bar** (3px gradient), **gradient header background**, **left accent border strip** per column
- Restored distinct column visual identity — each status column is now visually differentiated
- `boxShadow: '0 2px 8px rgba(0,0,0,0.06)'` added for depth

#### `src/modules/tasks/components/TaskDetail.tsx`
- **TagPill** replaced with new version: visible **colored dot swatch** on left (click → opens native color picker), X button no longer blocked
- Tag color changes persist globally via `taskSettingsStore.setTagColor`
- **Cover Image** field upgraded: preview thumbnail with X remove button, `📁 Upload image` file input (stores as base64), URL paste field kept
- Added `useTaskSettingsStore` import + `tagColors`/`setTagColor` wired

#### `src/shared/types/task.ts`
- `UpdateTaskInput` extended with `coverImage?: string`

#### `src/shared/stores/taskSettingsStore.ts`
- Added `tagColors: Record<string, string>` — globally persisted tag→color map
- Added `setTagColor(tag, color)` and `removeTagColor(tag)` actions

---

### Main Sidebar Redesign

#### `src/app/Sidebar.tsx` — full rewrite
- **Emoji navigation** — each item now has its own emoji (🏠📝✅📅📁🎯⏱️🃏📊⚙️☀️🌙) replacing Lucide SVG icons
- **Tighter rows** — padding reduced (`py-1.5 px-2`), icon-text gap reduced (`gap-1.75`)
- **Font 14px → 13px** — refined, more Notion-like
- **Active state**: warm neutral (`rgba(0,0,0,0.06)` / `rgba(255,255,255,0.07)`) instead of accent blue highlight
- **Section headers** — lowercase (Workspace / Tools), lighter muted color
- **Active dot indicator** — small dot on right edge of active item
- Search bar tightened (smaller padding, focus ring border color)

#### `src/styles/globals.css`
- `--sidebar-width: 260px` → `240px`

---

### Notes Module — Search Bug Fix

#### `src/modules/notes/components/NoteSearchResults.tsx` — full rewrite
- `<mark>` highlight changed to inline element (was causing overflow/protrusion)
- Yellow highlight: subtle `rgba(234,179,8,0.28)` background, 2px border-radius, no padding bloat
- Result rows: single-line snippet (no multi-line overflow), truncated with ellipsis
- Result count header simplified to single muted line (no X button clutter)
- `HighlightedSnippet` component highlights both title and body snippet

#### `src/modules/notes/components/NotesSidebar.tsx`
- Search input: tighter padding, focus border accent, no double-border artifact
- Icon and input left-padding now in sync (no more icon/text overlap)

---

### Notes Module — New Features

#### FEATURE 1: Daily Notes
**`src/shared/lib/noteService.ts`**
- Added `getDailyNote(dateStr)` — finds existing daily note by `__daily__` + ISO date tag
- Added `createDailyNote(dateStr, formattedTitle)` — idempotent; returns existing note if already created today

**`src/modules/notes/hooks/useNotes.ts`**
- Added `useCreateOrOpenDailyNote()` mutation hook — generates today's date string and full formatted title, calls service

**`src/modules/notes/components/NotesSidebar.tsx`**
- "📅 Today's Note" button in bottom actions — one-click creates or opens today's note
- "Daily Notes" section auto-appears in sidebar showing last 5 daily notes with short date labels (Mon, Mar 30)
- Added `onShowTemplates` prop

#### FEATURE 2: Note Templates
**`src/modules/notes/components/TemplatePickerModal.tsx`** *(new file)*
- 6 templates: Blank, Meeting Notes, Weekly Review, Project Brief, Daily Journal, Reading Notes
- Each pre-fills title + full structured TipTap HTML content (headings, task lists, blockquotes)
- 2-column grid modal with emoji, name, description; Blank page uses dashed border
- Escape / backdrop click to close

**`src/modules/notes/NotesPage.tsx`**
- "New Page" now opens template picker instead of direct creation
- `handleCreateFromTemplate` creates note with template title + content + tags
- `onShowTemplates` wired from sidebar bottom "📋 Templates" button

#### FEATURE 3: Cover Image / Gradient Banners
**`src/modules/notes/components/NoteHeader.tsx`** — major update
- `onCoverChange` prop added
- Full-width `CoverBanner` component renders above note content (120px gradients, 220px images)
- Hover state reveals "Change cover" + "Remove" frosted-glass pill buttons
- `CoverPickerModal` with 12 gradient presets (Aurora/Sunset/Ocean/Forest/Dusk/Midnight/Peach/Cool/Warm/Steel/Emerald/Lavender), 8 solid color swatches, file upload (→ base64), URL input
- "🖼️ Add cover" button appears near page top when no cover set
- `coverColor` field now handles hex colors, CSS gradients, image URLs, and base64 data URLs

**`src/modules/notes/NotesPage.tsx`**
- `handleCoverChange` callback added, passed to `<NoteHeader>`

**`src/modules/notes/components/NoteEditor.tsx`**
- Content sync now calls `clearContent()` for empty/null content instead of `setContent('')` — fixes TipTap v3 artifacts when switching between notes

---

### Session 21 Commit History
```
e01aeaf feat(notes): daily notes, templates (6 types), cover image/gradient banners
c235927 fix(notes): clean up search results layout, fix highlight overflow, tighten search input
1152ce9 feat(sidebar): notion-inspired redesign — emoji nav, tighter rows, warm neutral active states
cad7291 feat(tasks): priority badges, tag color picker, column accent headers, image upload
```

---

## Session 19 — Phase 4.2: Visual Overhaul — Vibrant TaskCard & Column Redesign (2026-03-29, SGT)

**Coding agent:** Claude Sonnet 4.6 sub-agent

### Objective
Transform the Tasks Board from a functional-but-plain UI into a visually stunning, information-rich board inspired by Monday.com / Trello / Jira.

### Changes

#### `src/shared/types/task.ts`
- Added `coverImage?: string` — Unsplash image URL for rich card visuals
- Added `issueKey?: string` — sequential project key (e.g. `DIV-1040`)
- Added `assignees?: string[]` — array of avatar URLs (Pravatar)

#### `src/shared/lib/taskService.ts`
- Added `generateMockTasks()` function that seeds 10 rich mock tasks with:
  - 8 unique Unsplash cover images (tech/work/design themes)
  - Sequential `issueKey`s from `DIV-1040` to `DIV-1049`
  - Up to 3 overlapping Pravatar avatar URLs per task
  - Varied statuses, priorities, tags, and due dates (overdue/today/next week/null)
- `loadTasks()` now seeds mock data if storage is empty or if stored tasks lack `issueKey` (upgrade path for existing installs)
- `create()` initialises new tasks with `coverImage: undefined`, `issueKey: undefined`, `assignees: []`

#### `src/shared/stores/appSettingsStore.ts`
- Added `showCoverImages: boolean` (default `true`) to `AppSettings`
- Added `showIssueKeys: boolean` (default `true`) to `AppSettings`

#### `src/modules/tasks/components/TaskBoardColumn.tsx` — full overhaul
- **Header redesign:**
  - 3px solid accent color bar at the very top of the column (status-specific color)
  - Status emoji prefix before the column title (📋 📥 📌 ⏳ 🔍 ✅ 🚫)
  - Vibrant pill-shaped count badge with status-specific bg/text colors
  - `+` button (shows accent color on hover) and `···` more-options button on the right
- **Drag-over state** now uses the status accent color for border + shadow glow instead of generic indigo

#### `src/modules/tasks/components/TaskCard.tsx` — full overhaul
- **Cover image:** Edge-to-edge image (`110px` tall, `object-cover`) at the top of the card when `task.coverImage` exists and `showCoverImages` is enabled. Hides gracefully on `onError`.
- **Issue key:** Rendered in `10px font-weight:700 uppercase muted` text above tags when `showIssueKeys` is enabled.
- **Tags:** Completely replaced faint outline pills with **solid vibrant solid-color pills** — white text on opaque colored backgrounds. Named tags map to specific colors (iOS→purple, Mobile→blue, Development→green, Bug→red, etc.); unknown tags use a stable hash into a 10-color palette. All tags are `uppercase`, `font-weight: 800`, `letter-spacing: 0.06em`.
- **Execution Stage block:** A full-width (inline-flex) colored rounded rectangle below the title showing the status name in white uppercase text, using the status's specific solid color (blue for In Progress, purple for In Review, green for Done, etc.).
- **Assignee avatars:** Overlapping avatar row in the bottom-right corner — `22px` circles with `2px white border` and `−7px` negative margin for the overlap effect. Shows a `+N` overflow badge for >4 assignees.
- **Card structure:** `overflow: hidden` on the card itself ensures cover image is clipped to `border-radius: 12px`. Priority left border (3px solid) preserved. Improved shadow on hover.

### TypeScript
`tsc --noEmit` — **zero errors**.

---

## Session 18 — Phase 4 Batch 4: Saved Views, Swimlanes & Custom Workflow States (2026-03-29, SGT)

**Coding agent:** Claude Sonnet 4.6 sub-agent

### Changes

#### 8. Saved Custom Views
- `src/shared/stores/taskSettingsStore.ts` (new): Standalone Zustand store persisting to `localStorage` with two keys:
  - `divein-task-saved-views` — array of `SavedView` objects (`id`, `name`, `filters`, `groupBy?`, `sortBy?`).
  - `divein-task-custom-statuses` — array of `CustomStatus` objects (see feature 10 below).
- `TasksPage.tsx`:
  - Imports and reads `useTaskSettingsStore` for `savedViews`, `addSavedView`, `removeSavedView`.
  - Adds `showSaveViewInput` / `saveViewName` state.
  - Adds `applyView(viewId)` callback: looks up the saved view by ID, restores its `filters`, `groupBy`, `sortBy` into local state.
  - Adds `handleSaveView()` callback: calls `addSavedView` with the current filter/group/sort snapshot.
  - Renders saved views as inline tabs in the header alongside the built-in view tabs (Board / List / Today / Backlog). Each tab shows a 🔖 bookmark prefix. Hovering reveals an ✕ remove button.
  - Renders a **"Save View"** button (with `BookmarkPlus` icon) after the tabs. Clicking expands an inline name input; pressing Enter (or clicking "Save") commits the view.

#### 9. Swimlanes (Matrix Board Grouping)
- `TasksPage.tsx`:
  - Adds `swimlaneBy?: string` state (default `undefined`).
  - Renders a **"Swimlane"** select (with `Layers` icon) in the header bar next to the Board tab — visible only when `activeView === 'board'`. Options: None / By Priority / By Project.
  - Passes `swimlaneBy` down to `<TaskBoard>`.
- `TaskBoard.tsx` (overhauled):
  - Accepts new optional `swimlaneBy?: string` prop.
  - Reads `customStatuses` from `useTaskSettingsStore` to build column order and labels dynamically.
  - In **swimlane mode**: groups tasks into `SwimlaneRow[]` by the chosen dimension (priority → ordered 4→0; project → unique project IDs). Renders:
    - A sticky column-header row at the top (status dot + name for each visible status).
    - Per swimlane: a left-rail header (colored vertical bar, row label, task count) followed by a row of mini `TaskBoardColumn` cells (one per visible status), each containing only tasks matching that swimlane + status intersection.
  - In **standard mode**: unchanged scrollable horizontal board, but now uses `customStatuses` for column labels.
  - Adds `SwimlaneCell` internal component: thin wrapper around `TaskBoardColumn` with `hideHeader=true` and `compactMode=true`.
- `TaskBoardColumn.tsx`:
  - Added `hideHeader?: boolean` prop — when `true`, suppresses the column header div.
  - Added `compactMode?: boolean` prop — when `true`, sets column width to `220px` (vs default `296px`) and removes `maxHeight` constraint (swimlane cells grow with content).

#### 10. Custom Workflow States
- `src/shared/stores/taskSettingsStore.ts`:
  - Exports `CustomStatus` type: `{ id, name, state: 'unstarted'|'active'|'completed', color, isCore }`.
  - Exports `DEFAULT_CUSTOM_STATUSES` (7 entries mapping all `TaskStatus` values with sensible names and colors).
  - `useTaskSettingsStore` actions: `addCustomStatus`, `updateCustomStatus`, `removeCustomStatus` (blocks removal of `isCore` statuses), `resetStatuses`.
  - On init, merges persisted statuses with defaults to ensure all core statuses are always present.
- `src/modules/tasks/components/CustomStatusManager.tsx` (new): Modal component for editing workflow statuses.
  - Lists all statuses with color dot, name, state badge, and (for non-core) a Delete button.
  - Edit form (shown inline at bottom): color picker (`<input type="color">`), name input, state dropdown. Enter to save, Escape to cancel.
  - "+ Add Status" button in footer for creating new custom statuses.
  - "Reset to defaults" button with a two-step confirmation guard.
- `TaskBoard.tsx`:
  - Uses `customStatuses` from the store to build `statusLabels` (so renamed statuses appear on column headers).
- `TasksPage.tsx`:
  - Adds `showStatusManager` state.
  - Renders a **"Statuses"** button (with `Settings2` icon) in the header bar, visible only when `activeView === 'board'`.
  - Mounts `<CustomStatusManager>` as a modal when `showStatusManager === true`.

### Technical Notes
- `tsc --noEmit` passes with zero errors.
- The `TaskStatus` union type in `src/shared/types/task.ts` is left unchanged (string literals). Custom statuses with non-core IDs are stored in the settings store but not yet wired to the DB schema — this is intentional to avoid a data migration in this batch.
- Core statuses (`isCore: true`) cannot be deleted; only their display name, color, and workflow-state label can be edited.

---

## Session 17 — Phase 4 Batch 3: NLP Quick Add & Task Dependencies (2026-03-29, SGT)

**Coding agent:** Claude Sonnet 4.6 sub-agent

### Changes

#### 6. NLP Quick Add
- `src/modules/tasks/lib/nlpQuickAdd.ts` (new): Utility module that parses natural-language task strings. Uses:
  - `chrono-node` v2.9.0 to extract natural language dates (e.g. "tomorrow at 5pm", "next Friday").
  - Regex `/#(\w+)/g` to extract `#tags`.
  - Regex `/\b(P[1-4])\b/i` to extract priority flags (`P1`→Urgent, `P2`→High, `P3`→Medium, `P4`→Low).
  - Returns `{ title, dueDate, tags, priority, raw }` — the `title` has the parsed tokens stripped out.
- `TasksPage.tsx`:
  - Imports `parseQuickAdd`. The `handleQuickAdd` handler now parses the quick-add input on Enter and creates the task with the extracted `dueDate`, `tags`, and `priority` applied automatically.
  - Added live `nlpPreview` computed value (via `useMemo`) that shows color-coded chips (📅 date, #tag, ◆ priority) immediately below/beside the input as the user types. Chips appear only when tokens are detected; disappear when the input is empty.
  - Quick-add input placeholder updated to: `'Quick add: "Task tomorrow #tag P1" (↵)'`.
  - Input width increased from 200px to 260px to accommodate the hint text.

#### 7. Task Dependencies (Graph)
- `src/shared/types/task.ts`:
  - Added `blockedBy?: string[]` and `blocks?: string[]` to the `Task` interface (stores task IDs).
  - Added `blockedBy?: string[]` and `blocks?: string[]` to `UpdateTaskInput`.
- `src/shared/lib/taskService.ts`:
  - `create()`: new tasks get `blockedBy: []` and `blocks: []` initialized.
  - `update()`: merges `blockedBy`/`blocks` from input (falls back to existing values).
  - Recurring task copies also get `blockedBy: []` / `blocks: []`.
- `TaskDetail.tsx`:
  - Imports `useTasks` to load all tasks for the dependency picker.
  - Added `DependencySection` component — shows two sub-sections:
    - **Blocked by**: lists tasks that block this task. Active blockers shown with a red `Lock` icon and red pill styling. Done/cancelled blockers shown in muted style. "+ Add" button opens `TaskPickerPopover`.
    - **Blocks**: lists tasks this task blocks. Shown as amber/warning pills. "+ Add" button opens `TaskPickerPopover`.
  - `TaskPickerPopover`: searchable dropdown listing all root tasks (excluding self). Shows check-mark for already-selected tasks. Max 20 items, 180px scrollable list.
  - `DependencySection` is rendered between the properties section and description.
- `TaskCard.tsx`:
  - Added `isBlocked?: boolean` prop.
  - Added inline `LockIcon` SVG component.
  - When `isBlocked=true`, a small red lock icon appears before the task title with tooltip "Blocked by unfinished tasks".
- `TaskListRow.tsx`:
  - Added `isBlocked?: boolean` prop.
  - When `isBlocked=true`, a small red lock SVG icon appears before the task title span (with `title` attribute on a wrapper `<span>`).
- `TaskBoard.tsx` / `TaskBoardColumn.tsx`:
  - Added `blockedTaskIds?: Set<string>` prop threading.
  - `TaskBoardColumn` passes `isBlocked={blockedTaskIds?.has(task.id)}` to each `TaskCard`.
- `TaskList.tsx`:
  - Added `blockedTaskIds?: Set<string>` prop.
  - Passes `isBlocked={blockedTaskIds?.has(task.id)}` to each `TaskListRow` (both grouped and flat renders).
- `TasksPage.tsx`:
  - Loads `allTasksUnfiltered` via a second `useTasks()` call (no filter arg).
  - Computes `blockedTaskIds: Set<string>` via `useMemo` — a task is in the set if any of its `blockedBy` IDs reference a task whose status is neither `done` nor `cancelled`.
  - `handleStatusChange` intercepts moves to `done` for blocked tasks: shows a warning toast ("⚠️ This task has unfinished blockers — complete them first.") while still allowing the move (soft warning, not hard block).
  - Passes `blockedTaskIds` to `TaskBoard` and `TaskList`.

#### TypeScript
- `tsc --noEmit` passes with zero errors.

---

## Session 16 — Phase 4 Batch 2: Multi-Select & Batch FAB, Contextual Cmd+K Palette (2026-03-29, SGT)

**Coding agent:** Claude Sonnet 4.6 sub-agent

### Changes

#### 4. Multi-Select & Batch Actions
- `TasksPage.tsx`: Added `selectedTaskIds: string[]` state. Added `handleToggleSelect` which activates when Shift/Cmd/Ctrl is held on click, adding/removing tasks from the multi-selection set. Single-click without modifiers still opens the detail panel as before.
- `TaskList.tsx`: Extended `TaskListProps` with `selectedTaskIds`, `onToggleSelect`, and `onHoverTask`. Passes these to each `TaskListRow`.
- `TaskListRow.tsx`: Extended props with `isMultiSelected`, new `onSelect(e: MouseEvent)` signature, `onMouseEnter`, `onMouseLeave`. Multi-selected rows get `var(--color-accent-muted)` background and accent left-border.
- `TaskBoard.tsx` / `TaskBoardColumn.tsx` / `TaskCard.tsx`: Same prop threading — all accept `selectedTaskIds`, `onToggleSelect`, `onHoverTask`, `isMultiSelected`. Cards with `isMultiSelected=true` get accent outline + `var(--color-accent-soft)` background.
- `TaskBatchFAB.tsx` (new): Floating Action Bar component rendered at `position: fixed; bottom: 28px; left: 50%`. Shows `X tasks selected`, with popover buttons for **Set Status**, **Set Priority**, **Set Due Date**, and **Delete**. Animates in with a spring (`fab-rise` keyframe). Closes on outside click or Escape. Due date sub-menu has a date input with Apply/Clear buttons.
- Batch operations in `TasksPage.tsx`: `handleBatchSetStatus`, `handleBatchSetPriority`, `handleBatchSetDueDate`, `handleBatchDelete` — all iterate over `selectedTaskIds`, call `taskService` directly, then invalidate the React Query `tasks` cache.

#### 5. Contextual Cmd+K Command Palette
- `TaskCommandPalette.tsx` (new): Full-featured command palette using the `cmdk` package (`<Command>` component). Opens centered at 30% viewport height with backdrop blur overlay. Contains a breadcrumb header, task context preview (title + status icon), `<Command.Input>` search field, and sub-pages for:
  - **Root**: Set Status…, Set Priority…, Set Due Date…, Delete.
  - **Status sub-page**: All 7 statuses with `StatusIcon` and "Current" badge.
  - **Priority sub-page**: All 5 priorities with `PriorityIcon` and "Current" badge.
  - **Due Date sub-page**: Date input + Apply/Clear buttons.
  - Keyboard: `↑↓` navigate, `↵` select, `⌫` (backspace on empty input) goes back to root, `Esc` closes.
- `TasksPage.tsx`: Added `commandPaletteTaskId` state and `hoveredTaskId` state. The global `keydown` handler catches `Cmd+K` / `Ctrl+K` (not inside inputs) and opens the palette for the `selectedTaskId ?? hoveredTaskId`. Updates are applied via `useUpdateTask` mutation. Delete goes through `handleDelete` (with undo toast).

#### TypeScript
- `tsc --noEmit` passes with zero errors.

---

## Session 15 — Phase 4 Batch 1: Display Density, WIP Limits, Subtask Progress Bar (2026-03-29, SGT)

**Coding agent:** Claude Sonnet 4.6 sub-agent

### Changes

#### 1. Display Density Controls
- Added `taskDensity: 'compact' | 'default' | 'spacious'` to `AppSettings` in `src/shared/stores/appSettingsStore.ts` (default: `'default'`).
- `TaskCard.tsx`: Reads density from store; adjusts card padding (`8px 10px` / `12px 14px` / `18px 18px`) and font sizes for title and metadata accordingly.
- `TaskListRow.tsx`: Reads density from store; adjusts row height (`34px` / `44px` / `56px`) and font sizes for title, badges, and due date.
- `TaskBoardColumn.tsx`: Reads density from store; adjusts card gap and column padding based on density.
- `TaskToolbar.tsx`: Added a **Density** dropdown (Compact / Default / Spacious) next to Sort. Writes directly to `appSettingsStore` so the setting persists in localStorage.

#### 2. Column WIP Limits
- `TaskBoardColumn.tsx`: Soft WIP limit hardcoded at `3` tasks per column (`WIP_LIMIT = 3`).
- When `tasks.length > WIP_LIMIT`, the column header gradient switches to a reddish tint (`var(--color-danger-soft)`), the column label text turns danger-red, a ⚠️ icon appears next to the label (with tooltip), and the task count badge highlights in red. The bottom border of the header also changes to danger-red.
- All transitions are CSS-animated (0.2s ease) for a polished feel.

#### 3. Interactive Subtask Progress Bar
- `TaskCard.tsx`: Replaced plain `📎 2/3` text with a count + a small inline progress bar.
- Progress bar: `40px wide`, `4px tall`, `rounded-full`, background uses `var(--color-bg-tertiary)`.
- Inner fill: `var(--color-accent)` in progress, switches to `var(--color-success)` when all subtasks complete. Width animated with `transition: width 0.3s ease`.

#### TypeScript
- `tsc --noEmit` passes with zero errors.

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
