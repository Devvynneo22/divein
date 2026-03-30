# 📋 Handoff Message for Next Session

**Project:** DiveIn — local-first productivity super-app  
**Location:** `C:\Users\immer\OneDrive\Desktop\divein\`  
**Branch:** Develop  
**Date:** 2026-03-30 10:50 SGT

---

## Start Here

Read these files in order:
1. **`IMPLEMENTATION-STATUS.md`** — what's done, what's planned
2. **`CHANGELOG.md`** — session history (Session 21 is latest)
3. **`TASKS-OVERHAUL-SPEC.md`** — Tasks module architecture/spec
4. **`TASKS-UI-RESEARCH.md`** — market research (Linear, Notion, Jira, Todoist, TickTick, Asana)
5. **`UI-DESIGN-GUIDE.md`** — design system rules

---

## Current State

| Aspect | Status |
|--------|--------|
| **TypeScript** | ✅ Zero errors (`npx tsc --noEmit`) |
| **Git** | Clean working tree after `e01aeaf` |
| **Theme System** | ✅ Light / Dark / System |
| **Tasks Module** | ✅ Major overhaul + refinement pass complete |

### Latest Commits on `main`
```bash
e01aeaf feat(notes): daily notes, templates (6 types), cover image/gradient banners
c235927 fix(notes): clean up search results layout, fix highlight overflow, tighten search input
1152ce9 feat(sidebar): notion-inspired redesign — emoji nav, tighter rows, warm neutral active states
cad7291 feat(tasks): priority badges, tag color picker, column accent headers, image upload
a030955 Merge branch 'main' of https://github.com/Devvynneo22/divein
```

### Run it
```bash
cd C:\Users\immer\OneDrive\Desktop\divein
npm run dev
# if 5173 is occupied:
npx vite --port 5174
```

---

## What Was Done in Session 21 (latest)

### Tasks — Visual QA Polish
- Priority now shows as a **badge pill** (🔴🟠🟡🔵 + label) between title and status block, plus 3px colored top border on the card
- **Tag color picker** — click the colored dot on any tag in detail panel to change its color globally (persisted in `taskSettingsStore`)
- **Cover image upload** — file upload button (base64) + URL input + preview thumbnail with remove button
- **Column accent headers restored** — top gradient bar, gradient header bg, left accent border, box-shadow depth

### Sidebar — Notion-inspired Redesign
- Emoji navigation replacing Lucide icons throughout
- Tighter rows (13px font, `py-1.5` padding, 7px icon-text gap)
- Warm neutral active state (no more accent blue highlight)
- Sidebar width 260px → 240px

### Notes — Search Fix
- `NoteSearchResults` rewritten: inline `<mark>` highlight (no overflow), single-line snippets, cleaner count header

### Notes — 3 New Features
- **Daily Notes**: "📅 Today's Note" button, idempotent create (tagged `__daily__` + date), Daily Notes sidebar section (last 5)
- **Templates**: 6 pre-built templates (Blank/Meeting Notes/Weekly Review/Project Brief/Daily Journal/Reading Notes), template picker modal on New Page
- **Cover Banners**: full-width gradient/color/image banners per note, 12 gradient presets, file upload, URL paste, hover change/remove controls

## What Was Done in Session 15

### Bugs Fixed
1. **Group/Sort toolbar was not wired** — created `taskViewUtils.ts`, now drives actual rendering in List/Backlog views
2. **Tag hex-color bug** — old detail tag picker saved raw hex strings as tag names; added `sanitizeTag()` in both Detail and CreateModal
3. **In-column drag reorder missing** — board only supported cross-column moves; now supports reordering within same column via fractional sortOrder

### UX Improvements
4. **Quick due-date buttons** — Today / Tomorrow / Next week / Clear in task detail panel
5. **Today chip** — tasks due today show a visible TODAY badge in list rows
6. **Board visual polish** — wider columns (296px), proper borders, gradient headers, better depth

### Audit Fixes (post-session audit)
7. Fixed stale closure risk in `handleReorderWithinColumn` (was referencing `tasksByStatus` from render scope instead of filtering fresh from `tasks`)
8. Fixed project grouping `::` separator corruption risk (replaced string-split approach with proper Map value objects)
9. Tightened `sanitizeTag` regex to catch 3/4/6/8-char hex variants, not just 6-char

---

## Important User Preferences / Instructions

### Hard rules
- **Do not code directly unless explicitly necessary.** Be the brain/planner/manager.
- **All coding by sub-agents using Claude Sonnet 4.6** (`anthropic/claude-sonnet-4-6`). Opus is too expensive.
- **Quality bar: top 1% product quality** — Linear / Notion / Jira polish level.

### Development loop
1. Research → 2. Spec → 3. Parallel coding → 4. Audit → 5. Refine → 6. User review with screenshots → 7. Repeat

### Tech notes
- `npm install --legacy-peer-deps` required due to peer dep conflicts
- Dev server was on port 5174 last session (5173 occupied)
- localStorage keys still use `nexus-*` prefix for backward compat

---

## Known Issues / Debt

### Tasks-specific
1. **Existing hex-string tags in localStorage** — if user already has corrupted tags from old sessions, they'll persist in data. A migration/cleanup pass on taskService load would fix this but wasn't done.
2. **Board grouping is status-only** — toolbar Group dropdown works for List/Backlog but Board view always groups by status. Extending to priority/project grouping on board would require column redesign.
3. **Sort doesn't visibly affect Board** — Board cards within a column follow sortOrder. The Sort dropdown changes sort for List/Backlog/Today but board card order is manual (drag-based). This is intentional behavior but could confuse users.
4. **TaskList header sort arrows are decorative** — list column headers have click handlers that are no-ops now since sorting moved to parent toolbar. Either remove the arrows or wire them as secondary sort overrides.

### Broader product gaps for best-in-class
- Custom label/status colors (user-configurable)
- Board density options (compact/comfortable/spacious)
- Multi-property board grouping
- Natural language date entry
- Batch actions / multi-select
- WIP limits
- Saved views / custom filters
- Stronger card anatomy (more info density, assignee, progress)
- Better empty states and microinteractions
- Command palette task-specific actions

---

## Files Modified in Session 15

### Created
- `src/modules/tasks/components/taskViewUtils.ts`

### Modified
- `src/modules/tasks/TasksPage.tsx`
- `src/modules/tasks/components/TaskBoard.tsx`
- `src/modules/tasks/components/TaskBoardColumn.tsx`
- `src/modules/tasks/components/TaskCard.tsx`
- `src/modules/tasks/components/TaskCreateModal.tsx`
- `src/modules/tasks/components/TaskDetail.tsx`
- `src/modules/tasks/components/TaskList.tsx`
- `src/modules/tasks/components/TaskListRow.tsx`
- `src/modules/tasks/components/TaskToolbar.tsx`
- `CHANGELOG.md`
- `IMPLEMENTATION-STATUS.md`

### Do NOT modify (per UI-DESIGN-GUIDE.md)
- `src/styles/globals.css`
- `src/app/Sidebar.tsx`
- `src/app/Layout.tsx`
- `src/app/StatusBar.tsx`
- `src/app/App.tsx`
- `src/modules/dashboard/DashboardPage.tsx`
- `src/shared/stores/appSettingsStore.ts`
- Any files in `src/shared/lib/`, `src/shared/types/`, `src/shared/stores/`

---

## Recommended Next Session Plan

### Option A: Continue Tasks polish (if Devvyn wants more depth)
1. Open the app, test all 4 views (Board / List / Today / Backlog)
2. Test: group by priority, sort by due date, filter by status, create tags, drag within column
3. Take screenshots, identify remaining quality gaps
4. Spawn 2-4 Sonnet agents for targeted card design / density / interaction improvements

### Option B: Move to other modules
1. Apply similar research→spec→build→audit loop to another module
2. Good candidates: Notes polish, Dashboard redesign, or start Phase 4 (Electron)

### Manual Test Checklist for Session 15 Changes

| Test | Expected |
|------|----------|
| Change Sort to "Priority" in toolbar | List/Backlog views re-sort by priority (urgent first) |
| Change Sort to "Due Date" | List/Backlog views sort by nearest due date first |
| Change Group to "Priority" | List/Backlog show section headers like "Urgent · 2" |
| Change Group to "Due Date" | List/Backlog show Overdue / Today / Upcoming / No Due Date sections |
| Add tag in detail panel by typing name + Enter | Tag appears as colored pill with the name |
| Try to add tag that's a hex color like "ef4444" | Should be silently rejected, nothing added |
| Drag a task card up/down within the same board column | Card should reorder and persist position on refresh |
| Drag a task card to a different board column | Should change status (existing behavior, still works) |
| Click "Today" button in detail panel due date | Due date should set to today's date |
| Click "Tomorrow" / "Next week" | Due date should set accordingly |
| Click "Clear" when a due date is set | Due date should be removed |
| View list with a task due today | Should show "Today" text + purple TODAY chip |
| Board columns | Should have visible borders, slight shadow, gradient header |
