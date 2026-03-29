# Task Management & Kanban UI Research
**Research Date:** 2026-03-29  
**Purpose:** Design analysis for building a best-in-class task management app in React + Tailwind

---

## Table of Contents
1. [Notion](#1-notion)
2. [Linear](#2-linear)
3. [Jira](#3-jira)
4. [Todoist](#4-todoist)
5. [TickTick](#5-ticktick)
6. [Asana](#6-asana)
7. [Design Inspiration & Trends](#7-design-inspiration--trends-2024)
8. [Synthesis: Best Practices](#8-synthesis-best-practices--react--tailwind-implementation)

---

## 1. Notion

**Type:** All-in-one workspace with database-driven views  
**Tagline:** "The AI workspace that works for you"

### Views Available
- **List** — Simple vertical list of database pages
- **Board/Kanban** — Group by any property (status, assignee, priority, tag, relation)
- **Calendar** — Group by date property
- **Gallery** — Card-first, image-heavy view
- **Table** — Spreadsheet-like rows/columns
- **Timeline** — Gantt-style for date ranges
- **Chart** — Bar/pie charts of aggregated data (newer)

### Task Card Anatomy
Cards in board view show:
- **Page title** (always shown, bold, 14–15px)
- **Page icon/emoji** (optional, shown left of title)
- **Cover image** (optional header image, ~80px height in medium card mode)
- **Up to N visible properties** (configurable): assignee (avatar), due date, priority badge, tags/labels, select options, relation count
- **Card preview** toggle: can show first image or content text from page body
- Card sizes: **Small** (~60px tall), **Medium** (~100px), **Large** (~160px with image)

### Kanban Columns
- **Default columns:** "No Status", plus whatever Status property options exist (e.g., Not Started, In Progress, Done)
- Can group by: Status, Select, Multi-Select, Person, Relation
- Column header shows: group name + colored dot + item count + aggregate calculation (count, sum, avg, min, max, date range)
- Columns are **color-coded** (pastel backgrounds matching status color) — toggle-able
- Sub-groups: second property grouping within each column
- Hide/show individual columns
- Add new columns = add new property option values

### Filtering & Sorting
- **Filter:** Any database property — text contains/doesn't contain, date is before/after/on, number comparison, select/multi-select in/not in, person is/isn't, checkbox is/isn't
- **Saved filters:** Can save filter sets as views
- **Sort:** Any property, ascending/descending, multi-sort supported
- UI: "Filter" and "Sort" buttons in top-right toolbar, opens dropdown panel, filters shown as tags/chips that can be removed

### Drag-and-Drop
- Drag cards **between columns** (changes that property's value)
- Drag cards **within columns** (reorders position)
- Drag **columns** left/right to reorder
- No native multi-select drag (Notion limitation)

### Quick Actions (Without Opening)
- **Right-click card** → context menu: Open, Open in full page, Open in side peek, Duplicate, Move to, Copy link, Delete
- **Hover on card** → small ••• menu appears top-right
- No inline status change without right-click (must open card or use context menu)

### Task Detail View
- **3 modes:** Side peek (slide-in panel from right), Center peek (modal overlay), Full page
- **Fields shown:** Title (editable h1), page icon, page cover, all database properties (each as a row), plus full block editor body (notes, checklist, etc.)
- Comments section at bottom

### Visual Design
- **Background:** White (#ffffff) or Off-white (#f9f9f8) for page, columns have pastel tints
- **Card:** White background, very subtle border `1px solid rgba(55,53,47,0.09)`, `border-radius: 3px`, minimal shadow `0 1px 3px rgba(0,0,0,0.04)`
- **Typography:** System font stack, title 14px medium weight, properties 12px regular, muted gray (#787774) for secondary
- **Column header:** 14px, uppercase, letter-spaced, bold — or just bold title with count
- **Spacing:** Cards have ~8px padding, 8px gap between cards, 8px gap between columns; columns are 256px wide
- **Priority indicators:** Colored dots or badges (red=urgent, orange=high, yellow=medium, blue=low)

### Today / Focus View
- No dedicated "Today" view in Notion natively
- Must create a **filter view** for "Due date = today" — saveable as a named view
- Notion Calendar (separate app) has a Today view showing tasks with today's date

### Standout Features
- **Group by ANY property** — not just status. Group by assignee = each person gets a column. Unique power feature.
- **Sub-groups** — second-level grouping within columns
- **Column aggregations** — Sum, Avg, Count, etc. visible in column header
- **Linked database views** — same data, multiple filtered views across pages
- **Property visibility per view** — each board view can show different card properties
- Full **rich text body** inside every task (it's a page)
- AI integration (Notion AI) can generate tasks, summaries

---

## 2. Linear

**Type:** Purpose-built issue tracker / product development system  
**Tagline:** "The system for modern product development"  
**Design Philosophy:** Speed, keyboard-first, clean minimalism — "built for the people who build software"

### Views Available
- **List/Issue list** — Compact rows, very dense (primary view)
- **Board/Kanban** — Horizontal columns by status
- **Roadmap/Timeline** — Projects on a Gantt-like timeline
- **My Issues** — Personal task focus view
- **Active Cycles** — Sprint-like iteration view
- **Backlog** — Icebox for unprioritized issues
- **Triage** — Inbox for new/unreviewed issues

### Task Card Anatomy (Board view)
Linear board cards are **compact and information-dense**:
- **Issue identifier** (team prefix + number, e.g. "ENG-42") — top-left, monospace, muted
- **Title** — 13–14px, medium weight, truncated to 1–2 lines
- **Priority icon** — colored icon left of title (🔴 Urgent, 🟠 High, 🟡 Medium, 🔵 Low, ⬜ No priority)
- **Status icon** — circular icon (⭕ Todo, 🔵 In Progress, ✅ Done, etc.)
- **Assignee avatar** — 20px circle, bottom-right
- **Due date** — date chip if set
- **Label chips** — small colored pills (e.g., "Bug", "Feature")
- **Cycle/Project** indicator — small icon
- **Sub-issue count** — "2/5" sub-issues complete
- **Comment count** — 💬 icon with number if any

### Kanban Columns
- **Default columns:** Backlog, Todo, In Progress, In Review, Done, Cancelled
- Columns map to **workflow states** which are fully customizable per team
- State types: Unstarted, Started, Completed, Cancelled, Triage
- Column headers show: Status icon + name + issue count
- WIP limits: not natively enforced but visible
- No color-coding of columns (very minimal — just subtle dividers)
- Column width: ~280–320px fixed

### Filtering & Sorting
- **Filters:** Status, Priority, Assignee, Label, Project, Cycle, Milestone, Created by, Parent issue, Team, Due date, Completion date, Estimate
- **Filter UI:** "Filter" button opens popover with type selector, then value selector — each filter appears as a chip in the filter bar
- **Sort:** Priority, Status, Created, Updated, Due date, Title, Manual
- **Grouping:** Group by Status (default), Priority, Assignee, Label, Project, Cycle
- **View switching:** Keyboard shortcut to switch List↔Board (`V` then `B/L`)
- All settings persist per view, saveable

### Drag-and-Drop
- Drag cards between columns ✅
- Drag cards within columns to reorder ✅
- **Multi-select:** Hold `Shift`/`Cmd` to select multiple, then bulk-move ✅
- Drag-and-drop to change assignee by dropping onto person in sidebar

### Quick Actions (Without Opening)
- **Hover on card** → quick action buttons appear:
  - Change status (click status icon)
  - Change priority (click priority icon)
  - Assign (click assignee avatar)
- **Right-click** → full context menu
- **Keyboard shortcuts throughout:** `C` to create issue, `P` for priority, `A` for assignee, `D` for due date — all accessible from issue list
- `Cmd+K` → command palette for any action

### Task Detail View
- **Split-pane:** Issue detail opens in a **right-side panel** by default (not a modal)
- Left side stays as list/board, right side shows full issue
- Fields in detail panel (left sidebar of detail): Status, Priority, Assignee, Labels, Cycle, Project, Milestone, Due date, Estimate, Parent issue, Sub-issues, Relations (blocks/blocked by/duplicate of)
- **Description:** Full Markdown editor with slash commands
- **Comments:** Thread-style, supports Markdown, @mentions, file attachments, reactions
- **Activity log:** Full history of changes (who changed what, when)
- **Sub-issues:** Listed inline, can create new ones inline

### Visual Design (2024 Redesign — "More Cohesive, Timeless UI")
- **Dark mode first** (but excellent light mode too)
- **Background dark:** `#161618` (near-black, slightly warm)
- **Surface:** `#1e1e20` for sidebar, `#26262a` for panels  
- **Card background:** `#2a2a2e` with `1px solid rgba(255,255,255,0.06)` border
- **Text:** White `#f4f4f5` primary, `#8a8a9a` secondary/muted
- **Accent:** Purple `#5e6ad2` (Linear's brand, used for links, highlights, active states)
- **Priority colors:** Red `#ff6369` (urgent), Orange `#f96218` (high), Yellow `#f2c94c` (medium), Blue `#5e6ad2` (low)
- **Status colors:** Gray (backlog), Blue (in progress), Green (done), Red (cancelled)
- **Typography:** Inter (or similar sans-serif), 13px base for lists (very dense)
- **Spacing:** 4px base unit — cards have 10–12px padding, 4px between cards
- **Border radius:** `6px` on cards, `4px` on badges
- **Shadows:** Minimal — only on modals/popovers
- **Sidebar:** ~240px wide, left-aligned navigation
- **Icons:** Custom icon set, ~16px, monochrome with occasional color accent

### Today / Focus View
- **"My Issues"** — filtered view of all issues assigned to you, grouped by status
- **Active Cycles** — sprint view showing current iteration's issues
- **"You're up" indicators** — issues waiting on you (in review, awaiting your attention)
- No explicit "Today" date-based view, but filter by due date can be saved
- **Keyboard-first UX**: pressing `G` then `I` navigates to My Issues instantly

### Standout Features
- **Keyboard-everything:** Every action has a shortcut, command palette (`Cmd+K`) for anything else
- **Speed:** Near-instant response, offline support, syncs in background
- **Cycles (Sprints):** Built-in iteration tracking with progress %, cooldown periods
- **Linear Method:** Opinionated product development philosophy baked into the tool
- **Git integration:** Auto-link commits, PRs, branches to issues
- **Triage inbox:** Separate queue for new issues before they enter workflow
- **Issue relationship graph:** Blocks/blocked-by/duplicate tracking
- **Insights:** Automatic analytics — velocity, cycle time, burnup charts
- **Custom workflow states per team** with type classification
- **2024 redesign:** Reduced visual noise, inverted-L chrome, aligned navigation elements, multi-platform consistent (macOS/Windows/web)

---

## 3. Jira

**Type:** Enterprise project management / issue tracker  
**Tagline:** "Plan, track, and release great software"  
**Design Philosophy:** Power and flexibility > elegance

### Views Available
- **Board (Kanban)** — Columns representing workflow states
- **Backlog** — Prioritized list below sprint/active work
- **Sprint Board** — Active sprint in kanban layout
- **List/Table** — Spreadsheet-style issue list
- **Roadmap** — Timeline/Gantt view
- **Calendar** — Issues on a calendar grid
- **Summary** — Dashboard with stats

### Task Card Anatomy
Jira board cards ("issues") show:
- **Issue type icon** (Story 📖, Bug 🐛, Task ✅, Epic ⚡) — top-left, 16px
- **Issue key** (e.g., "PROJ-123") — muted text
- **Summary/Title** — 13–14px, wraps 2–3 lines
- **Assignee avatar** — 24px circle, bottom-right
- **Priority icon** — colored arrow/icon (Highest 🔴, High 🟠, Medium 🟡, Low 🔵, Lowest ⬜)
- **Story points/estimate** — gray badge, bottom-left
- **Status badge** — shown in backlog but not on board cards (position in column = status)
- **Epic link** — colored bar at top of card (epic's color)
- **Labels** — small chips if any
- **Flag** — 🚩 if issue is flagged/blocked
- **Due date** — if set
- **Child issue count** — "3/5" subtasks complete

### Kanban Columns
- **Default columns:** To Do | In Progress | Done
- Columns map to workflow statuses, fully customizable
- **WIP limits** — per column, enforced with visual warning (red column header when over limit)
- **Swimlanes** — horizontal rows within columns (group by: assignee, epic, priority, issue type, or custom JQL query)
- **Backlog vs Board** — issues in backlog don't appear on board until moved to sprint
- Column header: status name + issue count
- Column background: subtle gray, no color coding by default
- **Column width:** Auto-sizing based on viewport

### Filtering & Sorting
- **Quick filters:** Predefined buttons in header (Only My Issues, Recently Updated)
- **Advanced filtering:** JQL (Jira Query Language) — e.g., `project = PROJ AND status = "In Progress" AND assignee = currentUser()`
- **Label filters, Sprint filters, Epic filters** via dropdown chips
- **Board configuration:** Admin can define board filters at setup level
- Filters are more complex than competitors — JQL has high learning curve

### Drag-and-Drop
- Drag cards between columns ✅
- Drag within column to reorder (in backlog) ✅
- Multi-select: limited, mainly in backlog list view
- Drag cards from backlog to sprint ✅

### Quick Actions (Without Opening)
- **Hover on card** → small menu/icons appear
- **Right-click** → context menu with: Assign to me, Add flag, Send to backlog, Set priority
- Click assignee avatar → reassign popover
- Limited inline editing compared to Linear

### Task Detail View
- **Full-page or panel** depending on config
- In newer Jira: opens as **right-side drawer panel**
- Fields: Summary, Status (dropdown), Assignee, Reporter, Priority, Labels, Epic Link, Sprint, Story Points, Fix Version, Components, Due date, Linked issues
- **Description:** Rich text editor (Atlassian Editor, similar to Confluence)
- **Child issues:** Listed as table with checkboxes
- **Comment + Work log + History** tabs at bottom
- **Very form-heavy** layout — left side = metadata fields, right = description/comments

### Visual Design
- **Light mode primary** (dark mode available but less polished)
- **Background:** `#f4f5f7` (Jira's light gray)
- **Card:** White `#ffffff`, `border-radius: 3px`, `box-shadow: 0 1px 2px rgba(9,30,66,.25)`  
- **Text:** `#172b4d` (dark navy) primary, `#6b778c` secondary
- **Accent:** Blue `#0052cc` (Jira blue) for interactive elements
- **Epic colors:** Spectrum of purples, greens, blues — team-customizable
- **Typography:** `-apple-system, BlinkMacSystemFont, 'Segoe UI'` — system fonts, 14px base
- **Card height:** Variable, roughly 80–120px
- **Column width:** ~280px
- **Spacing:** 8px between cards, 16px padding within columns
- Design feels: **functional but heavy**, dated compared to Linear/Notion

### Today / Focus View
- **"Assigned to me" quick filter** on board
- **Personal dashboard** shows issues assigned to you across projects
- No dedicated "today" focus mode
- Atlassian Atlas (separate product) provides personal goal tracking

### Standout Features
- **WIP limits** — only major tool to enforce this at the column level
- **Swimlanes** — horizontal grouping is very powerful for team visibility
- **Workflow automation** — complex rule-based automation (transition triggers, field updates)
- **JQL** — extremely powerful query language for any filter imaginable
- **Reporting suite:** Burndown, velocity, cumulative flow diagram, sprint reports all built-in
- **Backlog management** — separate backlog section with ranking drag-to-prioritize
- **Issue types** — Stories, Bugs, Tasks, Epics, Sub-tasks all with different fields
- **Atlassian Marketplace** — 3,000+ plugins/integrations
- **Sprints** — first-class sprint management with start/end dates, sprint reports

---

## 4. Todoist

**Type:** Personal + team task management  
**Tagline:** "Organize your work and life"  
**Design Philosophy:** Clean, focused, minimal — "calm productivity"

### Views Available
- **Today** — Tasks due today across all projects
- **Upcoming/Schedule** — Week/month calendar drag-to-schedule view
- **Inbox** — Uncategorized task capture
- **Project list view** — Default vertical list per project
- **Board view** — Kanban per project (sections become columns)
- **Filters** — Custom filter saved views
- **Label views** — Group tasks by label across projects
- **Calendar view** (newer) — Tasks on calendar grid

### Task Card Anatomy (List view — primary)
Todoist is list-first, cards in board view:
- **Checkbox** — leftmost, circle checkbox (click to complete)
- **Priority dot** — colored vertical bar on left edge (🔴 P1, 🟠 P2, 🟡 P3, ⬜ P4)
- **Task name** — 14px, regular weight
- **Due date** — small colored chip (🔴 overdue, 🟡 today, gray = future)
- **Assignee avatar** — 20px circle if assigned
- **Labels** — small colored pills (e.g., "@home", "@work")
- **Comment count** — 💬 icon if comments exist
- **Sub-task indicator** — "▶ 2 sub-tasks" shown if any
- Board cards add a bit more padding, ~80px minimum height

### Kanban Columns
- Board view: **Sections** within a project become columns
- Default sections: User-defined (no pre-set defaults)
- Creating new sections = new columns on board view
- Column header: section name + task count
- No column colors by default (plain white/gray headers)
- Very minimal column styling

### Filtering & Sorting
- **Filters:** Due date (today, this week, no date, overdue), Priority (P1–P4), Labels, Projects, Assignee, Completion status
- **Todoist filter syntax:** Natural language `"(today | overdue) & #Work & p1"` — powerful boolean
- **Sort within project:** By due date, priority, assignee, name
- **Saved filter views** appear in sidebar as bookmarks
- Quick filter buttons: Today, This week, No date

### Drag-and-Drop
- Drag tasks within list to reorder ✅
- Drag tasks between sections/projects ✅ (board view: between columns)
- Drag tasks onto calendar in Upcoming view to schedule ✅
- Multi-select drag: limited (select multiple then bulk edit)

### Quick Actions (Without Opening)
- **Hover on task** → quick action icons appear:
  - Schedule (calendar icon) → date picker popover
  - Priority (flag icon) → P1/P2/P3/P4 picker
  - Assign (person icon)
  - Move to project
- **Right-click** → full context menu
- **Swipe on mobile** → complete, schedule, priority
- `Q` key → Quick Add modal with natural language parsing

### Task Detail View
- **Full side panel** (right side slide-in)
- Fields: Task name (editable), Description (plain text + basic formatting), Due date/time, Priority, Project, Section, Labels, Assignee, Reminders
- **Recurring due dates** inline (natural language: "every Monday", "every 3rd of month")
- **Sub-tasks** listed below with their own checkboxes
- **Comments** with file attachment support and voice notes
- **Activity log** at bottom

### Visual Design
- **Light mode primary** — clean whites and very light grays
- **Background:** `#fafafa` or `#ffffff`
- **Sidebar:** `#db4035` red (Todoist brand) or dark mode `#1f1f1f`
- **Cards:** White, `border-radius: 5px`, very light border `1px solid #f0f0f0` or no border (list items have bottom dividers)
- **Priority indicators:** Left border/bar: P1=`#db4035` red, P2=`#ff9a14` orange, P3=`#4073ff` blue, P4=`#666666` gray
- **Due date chips:** `#db4035` (overdue), `#059669` (today), `#4073ff` (this week), gray (future)
- **Typography:** System fonts, 14px body, 13px metadata
- **Spacing:** Very tight — list items 40–48px height, minimal padding
- **Icons:** Custom icon set, clean and minimal

### Today / Focus View ⭐ (Strong suit)
- **"Today" view** is first-class and prominent in sidebar
- Shows ALL tasks due today, across ALL projects, in one unified list
- Tasks sorted by project, then priority
- **"Todoist Zero"** — the satisfaction of clearing today's list (confetti animation)
- **Upcoming** view: week-by-week drag to reschedule
- **Priority-based sorting** lets you see P1s first
- **Focus mode** (newer): hides everything except current task

### Standout Features
- **Natural language input:** Type "Buy milk tomorrow at 5pm #Personal p1 @errands" → fully parsed
- **Recurring tasks:** Most sophisticated in class (every other weekend, last day of month, etc.)
- **Karma system:** Points for completing tasks, streaks, productivity graphs
- **80+ integrations:** Gmail, Slack, Google Calendar, Zapier, etc.
- **Quick Add** everywhere — global shortcut, widget, share extension
- **Filters with boolean logic** — power users can build complex views
- **Cross-project visibility** — Today/Upcoming span all projects
- Very strong **mobile experience** with widget support

---

## 5. TickTick

**Type:** Personal productivity — tasks, habits, calendar  
**Tagline:** "A to-do list and calendar to keep you organized"  
**Design Philosophy:** Feature-rich personal productivity with habit tracking integration

### Views Available
- **Today** — Tasks due today across all lists
- **Tomorrow** — Tomorrow's tasks
- **Inbox** — Default capture list
- **List view** — Vertical task list per project
- **Kanban view** — Board per project (columns = customizable stages)
- **Calendar view** — Month/week/day with tasks and events
- **Habit tracker** — Dedicated habit tracking with streaks/heatmaps
- **Timeline view** — Tasks on a Gantt-like timeline
- **Eisenhower Matrix** — Urgency/importance quadrant view (unique!)
- **Pomodoro timer** — Built-in focus timer per task

### Task Card Anatomy
- **Checkbox** — circle on left
- **Title** — 14px
- **Priority** — colored flag or none (0/low/medium/high)
- **Tags** — small colored chips
- **Due date** — colored date chip
- **Subtask count** — "2/5" format
- **Assignee** (in shared lists)
- **Repeat indicator** — 🔁 icon
- Board cards: slightly larger, ~80–100px, show title + metadata

### Kanban Columns
- **Default columns:** To Do | In Progress | Done
- Fully customizable — add, rename, reorder, delete columns
- Column color: user-assignable
- No WIP limits
- Column headers show count

### Filtering & Sorting
- **Filters:** Priority, Tag, Assignee, Due date, Creation date, List
- **Smart lists:** All, Today, Next 7 days, Flagged, Assigned to me
- **Sort:** Due date, Priority, Title, Created date, Modified date, Manual
- Tag-based filtering is strong feature

### Drag-and-Drop
- Reorder within list ✅
- Move between columns on board ✅
- Drag to calendar to schedule ✅

### Quick Actions (Without Opening)
- Swipe on mobile → complete, flag, schedule
- Hover → checkbox, flag, date, options icons
- Right-click → context menu

### Task Detail View
- Right-side slide-in panel
- Fields: Title, Notes (rich text), Due date + time, Priority, List, Tags, Subtasks, Assignees, Reminders, Repeat settings
- **Subtasks** inline within detail
- Comments (for shared tasks)
- **Pomodoro timer** startable from detail view
- Attachments support

### Visual Design
- **Blue-focused brand** — `#4772fa` (TickTick blue)
- **Light mode:** Clean whites, `#f9f9f9` backgrounds
- **Dark mode:** `#1c1c1e` backgrounds
- **Cards:** White background, `border-radius: 8px`, subtle shadow `0 1px 4px rgba(0,0,0,0.1)`
- **Typography:** System fonts, 14px body
- Feels slightly more consumer/mobile-friendly than Linear or Notion
- Calendar integration makes it feel more like a planner

### Today / Focus View ⭐
- **"Today" smart list** — all tasks due today
- **Tomorrow** smart list too
- **"Next 7 days"** with day-by-day breakdown
- **Pomodoro timer** — focus on one task with 25-min sessions
- **Eisenhower Matrix** — organizes by urgent/important quadrants (unique differentiator)
- **Habit tracker** shows streak progress daily

### Standout Features
- **Eisenhower Matrix view** — no other mainstream app has this built-in
- **Built-in Pomodoro timer** — deep focus mode per task
- **Habit tracking** — streaks, completion heatmaps, integrated with tasks
- **Calendar integration** — two-way sync, tasks shown on calendar
- **Timeline view** — Gantt-style for project planning
- **Smart Date parsing** — natural language like Todoist
- Excellent **Apple Watch / Wear OS** support
- **Offline-first** — works fully without internet

---

## 6. Asana

**Type:** Team project management  
**Tagline:** "Work without limits"  
**Design Philosophy:** Visual, team-centric, multi-view flexibility

### Views Available
- **List** — Default project view, rows with fields
- **Board/Kanban** — Sections as columns
- **Timeline** — Gantt-style with dependencies
- **Calendar** — Tasks on calendar
- **Workflow Builder** — Visual automation flow editor
- **Portfolio** — Cross-project dashboard
- **Goals** — OKR tracking
- **My Tasks** — Personal task focus view
- **Inbox** — Notifications and activity feed
- **Reporting** — Charts and dashboards

### Task Card Anatomy (Board view)
- **Task name** — 14px, bold if overdue
- **Assignee avatar** — 24px circle, top-right of card
- **Due date** — small chip, red if overdue
- **Subtask count** — "3 subtasks" text or icon with count
- **Tags/Custom fields** — visible if configured: dropdowns, numbers, text, dates
- **Priority** (if custom field set) — colored badge
- **Completion checkbox** — circle on left (click to mark done)
- **Comments indicator** — 💬 count if any
- Cards have more padding than Linear, more spacious feel

### Kanban Columns
- **Sections** become columns in board view
- Default sections depend on template used
- Common defaults: To Do | In Progress | Done (or template-specific)
- Can add/rename/reorder columns
- Columns can have custom colors
- Column headers: section name + task count
- **Task limit per column** not enforced natively

### Filtering & Sorting
- **Filters:** Assignee, Due date, Priority (if field), Section, Custom fields, Tags, Completion status, Collaborator, Date created
- **Filter UI:** Click "Filter" → chips appear in a filter bar → each chip has value selector
- **Sort:** Due date, Likes, Creation date, Alphabetical, Last modified, Assignee, Custom field
- **Advanced search** with saved searches
- Filters apply per project view

### Drag-and-Drop
- Drag between columns ✅
- Drag within column to reorder ✅
- Drag in Timeline to change dates ✅
- Multi-select: select multiple with checkboxes, then bulk edit

### Quick Actions (Without Opening)
- **Hover on task** → icons appear:
  - Due date (calendar icon)
  - Assignee
  - Like (👍)
  - More options (•••)
- **Click task name** → opens detail panel
- Quick complete by clicking circle checkbox

### Task Detail View
- **Right-side slide-over panel** (default) — main content stays visible
- Full-page option available via expand button
- Fields: Task name (editable h2), Assignee, Due date, Projects, Dependencies, Tags, Custom fields, Description (rich text), Subtasks (listed inline), Collaborators
- **Subtasks** can themselves have subtasks (nested)
- **Comments** thread below with @mentions, file attachments
- **Activity log** showing history of changes
- **Time tracking** integration available
- **Approval tasks** — a task type that requires sign-off

### Visual Design (from CSS design tokens extracted from site)
- **Background:** `#f6f8f9` (Asana light gray), white for panels
- **Cards:** White `#ffffff`, `border-radius: 3px`, `box-shadow: 0 3px 5px 0 rgba(36,50,66,0.2)` (notably heavier shadow than others)
- **Text:** `#222b37` (near-black navy), `#848f99` (medium gray secondary)
- **Accent:** Coral/orange `#f06a6a` (Asana brand) or teal `#14aaf5`
- **Priority colors:** (via custom field) — user-defined
- **Due date:** Green `#00bf9c` for good, Red `#ed4758` for overdue
- **Column header:** Light gray background, medium weight text
- **Typography:** System fonts, 14px body, 13px metadata  
- **Spacing:** 16px card padding, 8px between cards, 32px column padding
- **Card height:** ~72–100px minimum
- **Shadow system:** Multiple levels (10=small, 20=medium, 30=large, 40=ambient)
- Feels: **Polished but corporate**, warmer colors than Linear

### Today / Focus View ⭐
- **"My Tasks"** — personal task hub across all projects you're assigned to
- **"Today"**, **"Upcoming"**, **"Later"** sections for time-based sorting
- Drag tasks between sections to reschedule (moving to "Today" is intentional act)
- **"Do today" marking** — pin tasks to Today section explicitly
- Asana's My Tasks is genuinely useful for personal focus — you see all cross-project tasks

### Standout Features
- **Timeline with dependencies** — drag to create task dependencies, auto-reschedule when dates slip
- **Workflow Builder** — visual automation editor (if this then that, no-code)
- **Portfolio view** — executive-level cross-project status overview
- **Goals / OKRs** — link tasks to goals, track objective progress
- **Rules/Automations** — trigger-based (when task added to section X, assign to Y, set field Z)
- **Forms** — public intake forms that create tasks automatically
- **Template library** — rich project templates
- **Approvals** — formal sign-off task type
- Multi-homing: a task can live in multiple projects simultaneously

---

## 7. Design Inspiration & Trends 2024

### "Linear Design" Trend (dominant 2023–2025)
From LogRocket UX analysis:
- **Dark mode first** with very dark backgrounds (`#161618` territory)
- **Bold typography** for hierarchy, minimal decorative elements
- **Complex gradients** and glassmorphism used sparingly
- **High contrast** text on dark backgrounds
- **Monochrome color palette** with 1–2 accent colors only
- Sequential/linear information flow (top-to-bottom reading)
- **Flat but not flat** — subtle borders, no heavy shadows

### Key 2024 UI Trends for Task/Kanban
1. **Dense information displays** — pack more data at smaller sizes (Linear approach vs Trello's big cards)
2. **Keyboard-first design** — command palette (`Cmd+K`) as power-user feature
3. **Contextual side panels** — split view without leaving list context
4. **Micro-interactions** — drag feedback, hover states, smooth transitions
5. **Neutral backgrounds** — whites, off-whites, very light grays (not pure white)
6. **Colored status indicators** — icon-based with consistent color language
7. **Card compactness options** — let users choose density (compact/comfortable/spacious)
8. **Inline editing** — click to edit directly without opening a modal
9. **Real-time collaboration** — presence indicators, live updates
10. **AI integration** — auto-assign, auto-prioritize, generate tasks from notes

### What Dribbble/Behance Top Designs Show
- **Glass morphism cards** with backdrop-blur for modern depth
- **Gradient header bars** per column for visual differentiation
- **Avatar-first assignee display** (prominent, not small)
- **Progress bars on task cards** for subtask completion
- **Colored left border** per priority (very popular pattern)
- **Dark sidebar + light main content** split (Linear/VS Code paradigm)
- **Emoji status icons** in consumer-oriented apps
- **Smooth animated transitions** when moving cards between columns

---

## 8. Synthesis: Best Practices & React + Tailwind Implementation

### Card Design System

#### Priority Left Border Pattern (widely used, high signal)
```jsx
// tailwind classes
const priorityBorder = {
  urgent: 'border-l-4 border-l-red-500',
  high:   'border-l-4 border-l-orange-400',
  medium: 'border-l-4 border-l-yellow-400',
  low:    'border-l-4 border-l-blue-400',
  none:   'border-l-4 border-l-transparent',
}

<div className={`bg-white rounded-lg shadow-sm ${priorityBorder[priority]} p-3 hover:shadow-md transition-shadow`}>
```

#### Task Card Anatomy (recommended)
```jsx
<div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 p-3 
               hover:border-zinc-300 dark:hover:border-zinc-500 transition-all cursor-pointer
               shadow-sm hover:shadow-md group">
  {/* Top row: title */}
  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug mb-2 line-clamp-2">
    {task.title}
  </p>
  
  {/* Bottom row: metadata */}
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5">
      {/* Due date chip */}
      <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Dec 15</span>
      {/* Label chips */}
      <span className="text-xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Bug</span>
    </div>
    {/* Assignee */}
    <img className="w-5 h-5 rounded-full" src={assignee.avatar} />
  </div>
</div>
```

### Column Layout
```jsx
// Column container
<div className="flex gap-3 h-full overflow-x-auto pb-4">
  {columns.map(col => (
    <div className="flex-shrink-0 w-72 flex flex-col bg-zinc-50 dark:bg-zinc-900 rounded-xl">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {/* status dot */}
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{col.name}</h3>
          <span className="text-xs text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded-full">
            {col.tasks.length}
          </span>
        </div>
        <button className="opacity-0 group-hover:opacity-100 ...">+</button>
      </div>
      
      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {col.tasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
      
      {/* Add task */}
      <button className="mx-2 mb-2 text-sm text-zinc-400 hover:text-zinc-600 py-2 hover:bg-zinc-100 rounded-lg">
        + Add task
      </button>
    </div>
  ))}
</div>
```

### Priority Badge System (Linear-inspired)
```jsx
const PriorityIcon = ({ priority }) => {
  const config = {
    urgent: { icon: '🔴', label: 'Urgent', class: 'text-red-500' },
    high:   { icon: '🔶', label: 'High',   class: 'text-orange-500' },
    medium: { icon: '🟡', label: 'Medium', class: 'text-yellow-500' },
    low:    { icon: '🔵', label: 'Low',    class: 'text-blue-500' },
    none:   { icon: '⬜', label: 'None',   class: 'text-zinc-400' },
  }
  // Use SVG icons in production, not emoji
}
```

### Status Colors (recommended set)
```js
const STATUS_COLORS = {
  backlog:     { bg: '#f4f4f5', dot: '#a1a1aa', text: '#71717a' }, // zinc
  todo:        { bg: '#eff6ff', dot: '#60a5fa', text: '#3b82f6' }, // blue
  inProgress:  { bg: '#fff7ed', dot: '#fb923c', text: '#f97316' }, // orange
  inReview:    { bg: '#faf5ff', dot: '#c084fc', text: '#a855f7' }, // purple
  done:        { bg: '#f0fdf4', dot: '#4ade80', text: '#22c55e' }, // green
  cancelled:   { bg: '#fef2f2', dot: '#f87171', text: '#ef4444' }, // red
}
```

### Drag-and-Drop Implementation (react-beautiful-dnd or dnd-kit)
```jsx
// Use @dnd-kit/core (newer, better maintained than react-beautiful-dnd)
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Key UX notes:
// - Show drop placeholder card while dragging (ghost element)
// - Animate column highlight on hover during drag
// - Snap animation on drop (300ms ease-out)
// - Preserve scroll position after drop
```

### Quick Actions Pattern (Linear-style hover reveals)
```jsx
<div className="group relative">
  <TaskCard task={task} />
  
  {/* Quick actions - visible on hover */}
  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                  flex gap-1 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 p-1">
    <button onClick={e => { e.stopPropagation(); openStatusPicker() }} 
            className="p-1 hover:bg-zinc-100 rounded" title="Change status">
      <StatusIcon />
    </button>
    <button onClick={e => { e.stopPropagation(); openDatePicker() }}
            className="p-1 hover:bg-zinc-100 rounded" title="Set due date">
      <CalendarIcon />
    </button>
    <button onClick={e => { e.stopPropagation(); openAssigneePicker() }}
            className="p-1 hover:bg-zinc-100 rounded" title="Assign">
      <PersonIcon />
    </button>
  </div>
</div>
```

### Task Detail Panel (Slide-over)
```jsx
// Split-pane: board stays visible, detail slides in from right
<div className="flex h-full">
  <div className={`flex-1 transition-all ${selectedTask ? 'mr-[420px]' : ''}`}>
    <KanbanBoard />
  </div>
  
  {selectedTask && (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-white dark:bg-zinc-900 
                    border-l border-zinc-200 dark:border-zinc-700 shadow-2xl
                    animate-in slide-in-from-right duration-200">
      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  )}
</div>
```

### "Today" View Pattern (Todoist-inspired)
```jsx
// Pull all tasks with dueDate = today across all projects
const todayTasks = useMemo(() => 
  allTasks.filter(t => isToday(t.dueDate) && !t.completed)
           .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
  [allTasks]
);

// Zero state with celebration
{todayTasks.length === 0 && (
  <div className="text-center py-16">
    <div className="text-4xl mb-3">🎉</div>
    <p className="text-zinc-500">You're all caught up for today!</p>
  </div>
)}
```

### Filter Bar Pattern
```jsx
// Inline filter chips, dismissible
<div className="flex items-center gap-2 flex-wrap py-2">
  <button className="flex items-center gap-1 text-sm bg-zinc-100 hover:bg-zinc-200 
                     px-3 py-1.5 rounded-full transition-colors">
    <FilterIcon className="w-3.5 h-3.5" />
    Filter
  </button>
  
  {activeFilters.map(filter => (
    <span key={filter.id} className="flex items-center gap-1 text-sm 
                                      bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
      {filter.label}
      <button onClick={() => removeFilter(filter.id)} className="hover:text-blue-900">
        <XIcon className="w-3 h-3" />
      </button>
    </span>
  ))}
</div>
```

### Typography Scale (Linear-inspired)
```css
/* Compact, information-dense typography */
--text-xs:    11px;  /* metadata, counts, timestamps */
--text-sm:    13px;  /* card titles, list items (primary) */
--text-base:  14px;  /* body text, form inputs */
--text-md:    16px;  /* section headers, panel titles */
--text-lg:    20px;  /* page headers */
--text-xl:    24px;  /* modal titles */

/* Line heights */
--leading-tight:  1.3;  /* card titles */
--leading-normal: 1.5;  /* body text */

/* Font weights */
--weight-normal:   400;  /* body, metadata */
--weight-medium:   500;  /* labels, secondary headings */
--weight-semibold: 600;  /* card titles, column headers */
--weight-bold:     700;  /* page titles */
```

### Recommended Spacing System (4px base, Tailwind-aligned)
```
4px  (p-1)  — icon padding, tight badges
8px  (p-2)  — card inner padding (compact mode)
12px (p-3)  — card inner padding (default)
16px (p-4)  — panel padding
24px (p-6)  — section spacing
```

### Key UI Decisions Summary

| Feature | Recommendation | Inspiration |
|---------|---------------|-------------|
| Card density | 3 modes (compact/default/spacious) | Notion card sizes |
| Priority indicator | Colored left border + icon | Todoist + Linear |
| Status indicator | Colored dot in column header | Linear |
| Task detail | Right slide-in panel (not full page) | Linear, Asana |
| Filter UI | Inline chips, dismissible | Linear |
| Quick actions | Hover-reveal icon toolbar | Linear |
| Column headers | Name + colored dot + count | Linear |
| Group by | Any property (status, assignee, priority) | Notion |
| Today view | Cross-project, priority sorted | Todoist |
| DnD | @dnd-kit/core with smooth animations | Standard |
| Command palette | Cmd+K global shortcut | Linear |
| Dark mode | First-class, not afterthought | Linear |
| Color system | Semantic (red=urgent, green=done) | All apps |

### Color Palette Recommendation (for implementation)

```js
// Tailwind config additions
const taskColors = {
  // Status
  'status-backlog': '#a1a1aa',      // zinc-400
  'status-todo': '#60a5fa',         // blue-400
  'status-in-progress': '#fb923c',  // orange-400
  'status-in-review': '#c084fc',    // purple-400
  'status-done': '#4ade80',         // green-400
  'status-cancelled': '#f87171',    // red-400
  
  // Priority
  'priority-urgent': '#ef4444',     // red-500
  'priority-high': '#f97316',       // orange-500
  'priority-medium': '#eab308',     // yellow-500
  'priority-low': '#3b82f6',        // blue-500
  
  // Surfaces (dark mode)
  'surface-0': '#0f0f11',           // page background
  'surface-1': '#18181b',           // sidebar
  'surface-2': '#27272a',           // card background
  'surface-3': '#3f3f46',           // hover state
}
```

---

*Research compiled from: Notion Help Center, Linear design blog, Atlassian Jira docs, Todoist features page, TickTick product, Asana help center, LogRocket UX analysis, The Organized Notebook, Planyway blog.*
