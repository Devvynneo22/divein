# DiveIn Tasks Module — Complete Overhaul Spec

## Vision
Transform from a basic flat list into a **Linear + Notion hybrid** — fast, keyboard-driven, visually rich board with multiple views. The gold standard for personal task management.

## Architecture Overview

### Views (Tab Bar at top)
1. **Board** (default) — Kanban columns by status, drag-and-drop
2. **List** — Dense, sortable rows (Linear-inspired)  
3. **Today** — Cross-project focus view, priority-sorted
4. **Backlog** — Unscheduled/inbox tasks

### Data Model (existing — no changes needed)
The current Task type already supports: status, priority, tags, dueDate, startDate, projectId, parentId, milestoneId, estimatedMin, recurrence, sortOrder. This is sufficient.

### New Statuses (extend existing)
Keep current: `inbox` | `todo` | `in_progress` | `done` | `cancelled`
Add to type: `backlog` | `in_review`

### File Structure
```
src/modules/tasks/
├── TasksPage.tsx                  # Top-level: view switcher, toolbar, filter state
├── components/
│   ├── TaskBoard.tsx              # Kanban board view (NEW)
│   ├── TaskBoardColumn.tsx        # Single kanban column (NEW)
│   ├── TaskCard.tsx               # Board card — rich, compact (NEW, replaces TaskItem)
│   ├── TaskList.tsx               # List view — dense rows (NEW)
│   ├── TaskListRow.tsx            # Single list row (NEW)
│   ├── TaskTodayView.tsx          # Today focus view (NEW)
│   ├── TaskDetail.tsx             # Slide-in detail panel (REWRITE)
│   ├── TaskCreateModal.tsx        # Rich creation modal (NEW)
│   ├── TaskToolbar.tsx            # Filters, grouping, search, view toggle (NEW)
│   ├── TaskFilterChips.tsx        # Inline filter chip bar (NEW)
│   ├── TaskQuickActions.tsx       # Hover-reveal action buttons (NEW)
│   ├── PriorityIcon.tsx           # Priority SVG icons (NEW)
│   ├── StatusIcon.tsx             # Status dot/icon (NEW)
│   └── TaskToast.tsx              # Undo toast (extracted)
├── hooks/
│   └── useTasks.ts                # Existing — no changes
```

---

## Component Specs

### 1. TasksPage.tsx (REWRITE)
Top-level orchestrator. Manages:
- `activeView`: 'board' | 'list' | 'today' | 'backlog'
- `filters`: TaskFilter state
- `selectedTaskId`: for detail panel
- `groupBy`: 'status' | 'priority' | 'dueDate' | 'project'
- `sortBy`: 'priority' | 'dueDate' | 'createdAt' | 'title' | 'manual'

Layout:
```
┌─────────────────────────────────────────────┐
│ Page Header: "Tasks" + create button        │
│ ┌─────────────────────────────────────────┐ │
│ │ View Tabs: Board | List | Today | Backlog │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Toolbar: Filter | Group | Sort | Search  │ │
│ │ [Filter chips when active]               │ │
│ └─────────────────────────────────────────┘ │
│ ┌──────────────────────┬──────────────────┐ │
│ │                      │ Detail Panel     │ │
│ │   View Content       │ (slide-in,       │ │
│ │   (Board/List/etc)   │  420px wide)     │ │
│ │                      │                  │ │
│ └──────────────────────┴──────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2. TaskBoard.tsx (NEW — Kanban)
Horizontal scrollable board with columns.
- Uses @dnd-kit/core for drag-and-drop (already in deps via existing DnD)
- Actually use HTML5 DnD API (simpler, already used in current code)
- Columns determined by `groupBy` property (default: status)
- Each column: header with colored dot + name + count + "+" button
- Cards are TaskCard components
- Drag between columns changes the groupBy property value
- Drag within column reorders (sortOrder)

Column order for status groupBy:
`backlog` → `inbox` → `todo` → `in_progress` → `in_review` → `done` → `cancelled`

Column styling:
- Width: 280px
- Background: very subtle tint matching status color (use --color-bg-wash)
- 8px gap between columns
- Header: 12px gap from top, status dot (10px circle, status color), name (14px semibold), count badge

### 3. TaskCard.tsx (NEW — Board Card)
Rich, compact card for board view. Linear-inspired.

Card anatomy (top to bottom):
```
┌────────────────────────────────┐
│ [Priority color left border]   │
│                                │
│ ● Title text (14px, semibold)  │
│   truncated to 2 lines         │
│                                │
│ 📅 Mar 29  🏷️ work  📎 2/3   │
│                                │
│ ──── Quick actions on hover ── │
└────────────────────────────────┘
```

- Left border: 3px colored by priority (urgent=red, high=orange, medium=yellow, low=blue, none=transparent)
- Background: var(--color-bg-elevated)
- Border: 1px solid var(--color-border), rounded-xl (12px)
- Shadow: var(--shadow-sm), hover: var(--shadow-md)
- Padding: 12px 14px
- Title: 14px, font-weight 500, max 2 lines with ellipsis
- Metadata row: due date, tags (colored pills), subtask count
- Tags: small colored pills (8 preset colors to choose from)
- On hover: show quick action overlay (status toggle, priority, date, delete)
- On click: open detail panel
- Drag handle: entire card is draggable

### 4. TaskListRow.tsx (NEW — List Row)
Dense row for list view. Linear-inspired.

Row anatomy:
```
□ ● Title                        🏷️ tag  📅 Mar 29  ◆ P2  ▶
```

- Checkbox (status toggle): round, colored by status
- Priority icon: small colored diamond/dot
- Title: 14px, flex-1
- Tags: small pills
- Due date: muted text
- On hover: background highlight + quick actions appear
- On click: open detail panel
- Height: ~40px (compact), ~48px (default)

### 5. TaskTodayView.tsx (NEW)
Focus view showing tasks due today + overdue, grouped by priority.

Layout:
```
┌─────────────────────────────────┐
│ 🌤️ Good afternoon              │
│ Sunday, March 29 — 3 tasks due  │
│                                 │
│ ── OVERDUE (1) ──               │
│ [TaskCard - overdue task]       │
│                                 │
│ ── URGENT (1) ──                │
│ [TaskCard]                      │
│                                 │
│ ── HIGH (1) ──                  │
│ [TaskCard]                      │
│                                 │
│ ── ALL DONE! 🎉 ──             │
│ "You're caught up for today!"   │
└─────────────────────────────────┘
```

### 6. TaskDetail.tsx (REWRITE — Slide-in Panel)
420px wide panel that slides in from the right.

Layout:
```
┌──────────────────────────────────────┐
│ [Close X]                [⋯ More]   │
│                                      │
│ [Status dropdown] [Priority dropdown]│
│                                      │
│ Title (editable, text-2xl, bold)     │
│                                      │
│ ┌─ Properties ─────────────────────┐ │
│ │ Due date     📅 Mar 29, 2026    │ │
│ │ Start date   📅 Not set         │ │
│ │ Tags         🏷️ work, urgent   │ │
│ │ Project      📁 DiveIn App      │ │
│ │ Estimate     ⏱️ 30 min          │ │
│ │ Recurrence   🔄 None            │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Description (rich text / markdown)   │
│ ─────────────────────────────────── │
│                                      │
│ Subtasks (expandable)                │
│ □ Subtask 1                          │
│ □ Subtask 2                          │
│ + Add subtask                        │
│                                      │
│ ─────── Activity ──────────          │
│ Created Mar 28 at 2:30 PM            │
│ Last updated Mar 29 at 11:00 AM      │
└──────────────────────────────────────┘
```

### 7. TaskCreateModal.tsx (NEW)
Rich creation modal (not just quick-add input). Triggered by "+ New Task" button or Ctrl+N.

```
┌──────────────────────────────────────────┐
│ New Task                          [X]    │
│                                          │
│ Title ___________________________________│
│                                          │
│ Status [Inbox ▾]  Priority [None ▾]      │
│ Due date [___]    Tags [+ Add]           │
│ Project [None ▾]  Estimate [__ min]      │
│                                          │
│ Description (optional textarea)          │
│                                          │
│           [Cancel]  [Create Task]        │
└──────────────────────────────────────────┘
```

Also keep the quick-add input at top of board/list for fast entry.

### 8. TaskToolbar.tsx (NEW)
Horizontal toolbar below view tabs.

```
[🔍 Search...] [Filter ▾] [Group: Status ▾] [Sort: Manual ▾] [+ New Task]
```

When filters are active, show TaskFilterChips below.

### 9. StatusIcon.tsx + PriorityIcon.tsx (NEW)
Reusable icon components with proper colors.

Status colors (CSS variables to add to globals.css):
```
--color-status-backlog: #a1a1aa;
--color-status-inbox: #a1a1aa; 
--color-status-todo: #60a5fa;
--color-status-in-progress: #fb923c;
--color-status-in-review: #c084fc;
--color-status-done: #4ade80;
--color-status-cancelled: #f87171;
```

Priority border colors:
```
--color-priority-urgent: #ef4444;
--color-priority-high: #f97316;
--color-priority-medium: #eab308;
--color-priority-low: #3b82f6;
--color-priority-none: transparent;
```

Tag preset colors (8 colors):
```
Red, Orange, Yellow, Green, Blue, Purple, Pink, Gray
```

---

## Implementation Plan

### Phase 1: Foundation (Agent 1)
- Add status colors + priority colors + tag colors to globals.css
- Create StatusIcon.tsx, PriorityIcon.tsx
- Create TaskToast.tsx (extract from current)
- Update task type: add 'backlog' and 'in_review' to TaskStatus

### Phase 2: Board View (Agent 2)
- Create TaskCard.tsx with all the rich card features
- Create TaskBoardColumn.tsx with status header, count, add button
- Create TaskBoard.tsx with horizontal scroll, DnD between columns
- Create TaskQuickActions.tsx hover overlay

### Phase 3: List + Today + Toolbar (Agent 3)
- Create TaskListRow.tsx
- Create TaskList.tsx with sortable columns
- Create TaskTodayView.tsx with priority grouping + zero state
- Create TaskToolbar.tsx + TaskFilterChips.tsx

### Phase 4: Detail + Create + Page (Agent 4)
- Rewrite TaskDetail.tsx as slide-in panel
- Create TaskCreateModal.tsx
- Rewrite TasksPage.tsx as orchestrator with view tabs

---

## Visual Reference
- Card style: Linear-inspired (compact, left priority border, hover actions)
- Board: Notion-inspired (colored column headers, subtle column backgrounds)
- Detail panel: Linear-inspired (right slide-in, property rows)
- Today view: Todoist-inspired (greeting, priority sections, zero state)
- Toolbar: Linear-inspired (filter chips, inline controls)
