# DiveIn — Comprehensive Improvement Roadmap v2
> Authored: 2026-03-30 | Based on full codebase audit + competitive research
> Standard: Top 1% product quality — Linear, Notion, Cron, Things 3, Superhuman

---

## Research Sources & Competitive Analysis

### What was studied:
- **Linear** — keyboard-first project management, issue anatomy, command palette depth, cycle/sprint system, roadmap views
- **Notion** — block editor richness, database views, linked databases, gallery/timeline views, AI assistant integration
- **Things 3** — task capture philosophy, areas vs projects, logbook, magic plus button, today/upcoming/anytime views
- **Cron** — calendar density, scheduling intelligence, availability blocks, next-meeting countdown
- **Superhuman** — email triage UX, split inbox, keyboard-everything philosophy, AI triage
- **Anki** — mature SRS: mature/young/new card distinction, deck options, stats (forecast chart, review heatmap)
- **Toggl Track** — time intelligence: project profitability, team dashboards, timeline view
- **Obsidian** — graph view, canvas/whiteboard, plugin ecosystem, local-first philosophy
- **Habitica** — gamification: XP, streaks, parties, daily challenges
- **Streaks (iOS)** — simplest possible habit UX, 12-habit wheel, perfect visual clarity
- **Readwise** — spaced repetition for highlights, review queue, source organization
- **Bear** — note tagging system, hashtag-based organization, focus mode quality
- **Craft** — block nesting, card stacks, document sharing, daily notes quality

---

## TIER 1 — Critical / High Impact (Build Next)

### T1-1: Global Search Overhaul
**Problem:** Search exists but is siloed — notes search doesn't find tasks, tasks search doesn't find notes.
**Benchmark:** Linear (Ctrl+K searches everything), Notion (search across all pages instantly)

**Implementation:**
- Unified `searchService.ts` already exists — extend it to search ALL entity types
- Results grouped by type: Tasks | Notes | Projects | Events | Habits | Cards
- Each result shows type icon, title, breadcrumb context, last updated
- Keyboard navigation (↑↓ to move, Tab to switch groups, Enter to open)
- Recent searches history (last 10, persisted in localStorage)
- "Search as you type" with 150ms debounce
- Shortcut: Ctrl+K already works — just power it up

**Files:** `src/app/CommandPalette.tsx`, `src/shared/lib/searchService.ts`

---

### T1-2: Tasks — Natural Language Date Entry
**Problem:** Date picker is a calendar modal. Typing "tomorrow" or "next Friday" requires clicking around.
**Benchmark:** Things 3 (type "tomorrow"), Todoist (natural language everywhere)

**Implementation:**
- `chrono-node` is already in package.json — it just needs to be wired
- In the due date field: detect text input, parse with chrono-node, show parsed preview ("Friday, Apr 3")
- Trigger: type in any date field, see live preview, press Enter to confirm
- Supported phrases: "today", "tomorrow", "next monday", "in 3 days", "apr 5", "end of week"
- Works in: TaskCreateModal, TaskDetail, quick capture

**Files:** `src/modules/tasks/components/TaskCreateModal.tsx`, `TaskDetail.tsx`

---

### T1-3: Tasks — Batch Operations (Multi-select)
**Problem:** Can only act on one task at a time. Power users need to move 10 tasks at once.
**Benchmark:** Linear (shift+click to multi-select, bulk actions bar), Asana (multi-select + bulk edit)

**Implementation:**
- `TaskBatchFAB.tsx` already exists (!) — wire it up properly
- Shift+click selects a range, Ctrl/Cmd+click toggles individual
- Selection count badge in toolbar
- Floating action bar appears at bottom when items selected: "Move to project | Change status | Set priority | Add tag | Delete"
- All actions applied to entire selection atomically
- Keyboard: Ctrl+A selects all visible tasks

**Files:** `src/modules/tasks/TasksPage.tsx`, `TaskBatchFAB.tsx`, `TaskList.tsx`

---

### T1-4: Calendar — Event Intelligence
**Problem:** Calendar is functional but dumb — no time blocking, no smart scheduling, no availability.
**Benchmark:** Cron (next meeting countdown, scheduling links), Fantastical (natural language event creation)

**Implementation:**
- **Natural language event creation**: click empty slot → type "Meeting with John 2pm-3pm" → chrono-node parses → creates event
- **"Next event" countdown**: show in Dashboard and status bar "📅 Team standup in 23 min"
- **Time blocking**: right-click on calendar → "Block time" → creates a "deep work" / "focus" block (special event type, shown differently — hatched pattern)
- **Event duration indicator**: in week/day view, show event duration label inside the event block
- **Drag to create**: click and drag on empty time slots to create new event with that duration

**Files:** `src/modules/calendar/CalendarPage.tsx`

---

### T1-5: Projects — Timeline / Gantt View
**Problem:** Projects only have Kanban + Overview. No time-based view for planning.
**Benchmark:** Linear (roadmap view), Asana (timeline), Notion (timeline database view)

**Implementation:**
- New tab in Project: "📅 Timeline" alongside Overview/Tasks/Board/Notes/Activity
- Simple SVG-based Gantt: tasks on Y axis, dates on X axis (week/month zoom)
- Task bars: colored by status, width = duration (start→due date)
- Milestone diamonds on the timeline
- Drag task bar to reschedule (updates dueDate)
- Zoom: Week | Month | Quarter buttons
- Tasks without dates shown in a "Unscheduled" column on the left

**Files:** New `src/modules/projects/components/ProjectTimeline.tsx`, update `ProjectsPage.tsx`

---

### T1-6: Notes — Word Count, Reading Time & Document Stats
**Problem:** `wordCount` field exists on Note but is never shown to the user.
**Benchmark:** Bear (shows word count + reading time inline), iA Writer (document statistics)

**Implementation:**
- In note header area: show "412 words · 2 min read" in muted text
- Reading time = wordCount / 200 (average WPM)
- Live update as you type (already tracked in contentText)
- Click the stat → expands to: Words | Characters | Paragraphs | Headings | Links

**Files:** `src/modules/notes/components/NoteHeader.tsx`

---

### T1-7: Flashcards — Statistics & Forecast Dashboard
**Problem:** No deck-level analytics. User can't see their retention rate or forecast.
**Benchmark:** Anki (mature/young/new breakdown, forecast chart, review history heatmap)

**Implementation:**
- New "📊 Stats" tab inside each deck view
- **Today's forecast**: bar chart showing reviews due per day for next 14 days (compute from `nextReview` dates in cards)
- **Retention rate**: (good+easy reviews) / total reviews from `card_reviews` data
- **Card maturity breakdown**: donut chart — New | Learning | Young (interval <21d) | Mature (interval ≥21d)
- **Study heatmap**: last 12 weeks, GitHub-style, colored by cards reviewed per day
- **Average ease factor**: current EF distribution histogram
- All computed from existing `cards` data — no new service calls needed

**Files:** New `src/modules/flashcards/components/DeckStats.tsx`, update `FlashcardsPage.tsx`

---

### T1-8: Dashboard — Productivity Score & Weekly Review
**Problem:** Dashboard shows today's data but has no weekly summary or productivity scoring.
**Benchmark:** Superhuman (inbox zero tracking), Streaks (completion streaks), RescueTime (productivity score)

**Implementation:**
- **Weekly score card**: shown on Dashboard, computed from: tasks completed, habits maintained, time logged, reviews done
  - Formula: `(tasksCompleted * 10 + habitCompletions * 5 + hoursLogged * 8 + cardsReviewed * 3) / maxPossible * 100`
  - Show as a colored ring: 0-40% red, 40-70% orange, 70-90% blue, 90-100% green
- **"This week" summary strip**: Tue Mar 25–Mon Mar 31 | 12 tasks ✓ | 4/5 habits avg | 8.5h logged
- **Streak summary**: show longest active streak across all habits
- **Overdue alert**: if >3 tasks overdue, show a red banner "3 overdue tasks need attention"

**Files:** `src/modules/dashboard/DashboardPage.tsx`

---

### T1-9: Keyboard Shortcuts — App-Wide Completeness
**Problem:** Shortcuts exist for Tasks but other modules are keyboard-dead.
**Benchmark:** Linear (every action has a shortcut, `?` shows all), Superhuman (keyboard-everything)

**Implementation:**
- **Notes**: `N` = new note, `E` = edit/focus editor, `Ctrl+P` = search (done), `/` = slash menu, `Ctrl+Shift+F` = zen mode (done)
- **Habits**: `N` = new habit, `C` = check in selected habit, `E` = edit
- **Timer**: `Space` = start/stop, `R` = reset, `M` = switch mode, `Ctrl+L` = log manual entry
- **Flashcards**: `N` = new deck, `S` = study selected deck
- **Projects**: `N` = new project, `E` = edit selected
- **Global**: `G then D` = go to Dashboard, `G then T` = go to Tasks, `G then N` = go to Notes, etc. (two-key navigation like Vim/Gmail)
- Update shortcut cheatsheet (`?`) to show all new shortcuts

**Files:** `src/shared/lib/shortcutService.ts`, all module pages

---

### T1-10: Settings — Appearance Customization
**Problem:** Settings page has theme toggle but no real personalization.
**Benchmark:** Notion (custom fonts, page width), Linear (custom accent color), Bear (theme gallery)

**Implementation:**
- **Custom accent color**: color picker → updates `--color-accent` CSS var globally → persisted in settings
- **Font size**: Small / Medium (default) / Large → adjusts base font size (14px/15px/16px)
- **Sidebar width**: slider 200px–320px
- **Page width**: Compact / Normal / Wide — affects content max-width
- **Reduce motion**: toggle that disables all CSS transitions for users who prefer less animation
- **Dense mode**: reduces padding everywhere by 20% for more information density

**Files:** `src/modules/settings/SettingsPage.tsx`, `src/styles/globals.css`

---

## TIER 2 — High Value / Medium Effort

### T2-1: Tasks — Saved Views & Custom Filters
**Problem:** Every session starts fresh. Power users need to save "High priority engineering tasks due this week."
**Benchmark:** Linear (saved views), Notion (saved filter/sort combos)

**Implementation:**
- Save current filter state as a named view (name + icon)
- Saved views appear as quick-access pills below the toolbar
- Built-in smart views: "Overdue", "Due Today", "No Due Date", "High Priority"
- Stored in localStorage: `{ id, name, icon, filters: TaskFilter, sort: SortOption }`

---

### T2-2: Notes — Graph View
**Problem:** Wiki-links exist but backlinks are just a list. No visual map of knowledge connections.
**Benchmark:** Obsidian (full interactive graph), Roam Research (graph view)

**Implementation:**
- New view: "🕸️ Graph" toggle in Notes toolbar
- Render using `<canvas>` or simple SVG: nodes = notes, edges = wiki-links
- Force-directed layout: nodes repel, edges attract (simple physics loop, no d3 needed)
- Node size = number of backlinks
- Node color = note's cover color or accent
- Click node → opens note
- Filter: show only connected notes, hide orphans toggle

---

### T2-3: Tables — Gallery View & Calendar View
**Problem:** Tables only have Grid + Board views. Missing Gallery (card view) and Calendar (date view).
**Benchmark:** Notion (gallery, calendar, timeline, list views on same database)

**Implementation:**
- **Gallery view**: renders rows as image cards (if image column exists) or text cards
- **Calendar view**: if table has a Date column, render rows on a calendar by that date
- Both use the existing `table_rows` data, just different rendering components
- View switcher: Grid | Board | Gallery | Calendar tabs at top of table

---

### T2-4: Habits — Notes on Check-in
**Problem:** `HabitEntry.note` field exists but there's no UI to add notes when checking in.
**Benchmark:** Streaks (add a note/photo to any check-in), Daylio (mood + note log)

**Implementation:**
- After check-in: show a small "Add note" inline expansion below the habit item
- One-line textarea, auto-closes after 3 seconds of inactivity
- Shown in HabitStats → history view (entry log with dates + notes)
- Also support: check-in value override for measurable habits (long-press or right-click → "Change value")

---

### T2-5: Timer — Project Time Reports
**Problem:** Timer tracks time but has no reporting. No way to see "I spent 12h on Project X this month."
**Benchmark:** Toggl Track (weekly reports, project breakdown, export), Harvest (invoice-ready reports)

**Implementation:**
- New "📊 Reports" tab in Timer page
- Date range picker: Today | This week | This month | Custom
- Bar chart: hours per day in range
- Pie chart: breakdown by project (% of total time)
- Task breakdown: list of tasks with time spent
- Export to CSV button

---

### T2-6: Cross-Module — Activity Feed
**Problem:** No history of what happened. Can't see "yesterday I completed 5 tasks and reviewed 20 cards."
**Benchmark:** GitHub activity feed, Linear activity, Notion page history

**Implementation:**
- New sidebar section or Dashboard widget: "🕐 Recent Activity"
- Shows last 20 actions across all modules in reverse chronological order
- Items: "✅ Completed 'Write API docs'", "📝 Created note 'Meeting notes Mar 30'", "🃏 Reviewed 15 cards", "🔄 Completed habit 'Morning run'"
- Each item clickable → jumps to the entity
- Stored in a lightweight `activityLog` in localStorage (cap at 500 entries)

---

### T2-7: Notes — Tag Editing in Note Header
**Problem:** Tags can be set via templates but not edited on existing notes.
**Benchmark:** Notion (inline tag editing), Bear (hashtag as first-class content)

**Implementation:**
- In NoteHeader, add a tag editor row below the title
- Shows existing tags as removable pills
- Click `+ Add tag` → inline input with autocomplete from existing tags
- Tags saved via `updateNote({ tags })` on each change
- Visual: compact pills with colored dots, `×` to remove

---

### T2-8: Flashcards — CSV Import & Note-to-Card Creation
**Problem:** Creating cards one-by-one is tedious. Import and auto-generation are missing.
**Benchmark:** Anki (CSV import, cloze deletion), Readwise (auto-creates cards from highlights)

**Implementation:**
- **CSV import**: Upload CSV with Front,Back columns → preview table → import all (bulk create)
  - Already partially done in CardList — make it more prominent
- **Note → Flashcard**: In NoteEditor bubble menu, "Create Flashcard" creates a card with selected text as Front
  - `CreateFlashcardModal.tsx` already exists → just needs to be properly wired
- **Cloze deletion**: In card creation, support `{{c1::answer}}` syntax — shows blank on front, reveals on back

---

### T2-9: Projects — README / Description Rich Editor
**Problem:** Project description is a single plain-text field. No rich context possible.
**Benchmark:** GitHub (README.md per project), Linear (project description with formatting)

**Implementation:**
- In ProjectOverview, replace the plain description text with an inline TipTap editor
- Click to edit, auto-saves on blur
- Supports: headings, bullet lists, bold/italic, links, code blocks
- Shows a placeholder "Add a project README…" when empty
- Saves to `project.description` (extend to allow longer text)

---

### T2-10: Global — Notification Center
**Problem:** No app-level notifications. Events are about to start, habits are due, tasks are overdue — all silent.
**Benchmark:** Linear (in-app notification bell), Things 3 (gentle reminder system)

**Implementation:**
- Bell icon (🔔) in the top-right of the app shell
- Dot badge when unread notifications exist
- Notification types: Task overdue, Habit not checked by 8PM, Pomodoro phase complete, Calendar event in 15min
- In-app notification panel (not OS notifications — those need Electron)
- Each notification: icon + message + timestamp + action button ("View task", "Check in", "Dismiss")
- Stored in Zustand store, persisted to localStorage

---

## TIER 3 — Premium / Differentiators

### T3-1: AI Writing Assistant in Notes
**Problem:** Notes editor has no intelligence. Can't summarize, continue, or rewrite.
**Benchmark:** Notion AI, Craft AI, Obsidian AI plugins

**Implementation:**
- `/ai` slash command in TipTap → opens AI command palette
- Commands: "Continue writing", "Summarize selection", "Rewrite clearer", "Extract action items", "Generate flashcards from this"
- Uses user-configured API key (OpenAI/Anthropic) from Settings → AI tab
- Shows streaming response inline with a ghost cursor
- Can be dismissed with Escape if result is unwanted
- Architecture: `src/shared/lib/aiService.ts` interface → provider implementations

---

### T3-2: Tasks — Issue Tracker Mode
**Problem:** `issueKey` field exists (e.g. "DIV-1040") but isn't rendered or assigned automatically.
**Benchmark:** Linear (issue numbers, cycles, roadmap), Jira (epic/story/task hierarchy)

**Implementation:**
- Auto-assign sequential issue keys per project: "PRJ-001", "PRJ-002"
- Display issue key as a small badge on task cards and in list rows
- Copy issue key on click (for pasting in code commits, Slack, etc.)
- **Cycles / Sprints**: Add a "Cycles" tab to projects — define 2-week sprints, assign tasks to cycles, see cycle burn-down
- **Epic → Story → Subtask** hierarchy: current system has parentId (one level). Extend to show epics as collapsed groups in list view

---

### T3-3: Habits — Gamification Layer
**Problem:** Habits are functional but not motivating enough for long-term use.
**Benchmark:** Habitica (XP + levels), Streaks (visual rewards), Forest (focus trees)

**Implementation:**
- **XP system**: complete habits = earn XP. Level up every 1000 XP. Show level badge in header.
- **Achievement badges**: "7-day streak 🔥", "Perfect week 💎", "100 check-ins 🏆" — shown in a gallery
- **Streak milestones**: at 7, 30, 100, 365 days — special celebration animation (confetti using CSS keyframes, no library)
- **Weekly challenge**: auto-generated "This week: complete all habits 5/7 days" — shown as a card
- All stored in localStorage — no server needed

---

### T3-4: Calendar — Availability & Time Blocking
**Problem:** Calendar shows events but doesn't help you protect focus time.
**Benchmark:** Cron (focus time, scheduling pages), Reclaim.ai (auto-scheduling)

**Implementation:**
- **Focus blocks**: Create recurring "🎯 Deep Work" blocks that protect time
- **Availability view**: toggle that shows free/busy slots for a day (green = free, pattern = busy)
- **"Find time" helper**: given duration + deadline, suggests 3 optimal slots based on existing calendar density
- **Meeting buffer**: setting that adds 5/10/15 min padding after events automatically

---

### T3-5: Tables — Relation Columns & Linked Records
**Problem:** Tables are isolated. Can't reference a Task or Project from a Table row.
**Benchmark:** Notion (relation + rollup columns), Airtable (linked records, lookups)

**Implementation:**
- New column type: `relation` — links to another table's rows (or to tasks, or to projects)
- Renders as a multi-select of linked record titles
- Rollup column: compute SUM/COUNT/AVG across linked records
- This enables: "Expense tracker table" linked to "Projects table", showing total spend per project

---

### T3-6: Notes — Collaborative-Ready Structure
**Problem:** Notes are single-user. No sharing, no comments, no version history.
**Benchmark:** Notion (sharing, comments), Craft (document sharing links)

**Implementation (Phase A — local only):**
- **Version history**: save snapshots every 30 mins of a note's content (store in localStorage, keep last 20)
- UI: "🕐 History" button in note header → shows timeline of versions → click to preview → "Restore" button
- **Comments**: inline comment support in TipTap (highlight text → right-click → "Add comment")
- **Export to PDF/Markdown**: already partially exists — polish it, add "Copy as Markdown" option

---

### T3-7: Smart Daily Briefing
**Problem:** No morning context. User opens the app cold every day.
**Benchmark:** Superhuman (AI triage), Cron (morning digest), Reclaim (daily plan)

**Implementation:**
- On app open, if it's a new day: show a modal "☀️ Good morning, Devvyn — here's your day"
- Content:
  - Tasks due today (count)
  - Calendar events today (list)
  - Habits to complete
  - Flashcard review count
  - Yesterday: X tasks completed, X habits maintained
  - Motivational line based on stats
- Dismissable. "Don't show today" checkbox.
- Can also be triggered from Dashboard's hero area

---

### T3-8: Offline-First Sync Readiness (localStorage → SQLite prep)
**Problem:** All data in localStorage. 5MB limit. No real backup. One browser clear = data loss.
**Benchmark:** Obsidian (local files), Bear (iCloud sync), Notion (cloud database)

**This is Phase 4 but the prep work belongs in Phase 3B:**
- Audit all service files — ensure every operation goes through the service layer (not direct localStorage access scattered in components)
- Add a `db.ts` abstraction layer that today calls localStorage, but tomorrow calls Electron IPC
- Write migration script: `migrateLocalStorageToSQLite()` — reads all localStorage keys → inserts into SQLite tables
- Export everything to a single JSON backup file (Settings → Data → "Export all data")
- Import from JSON backup (Settings → Data → "Import backup")

---

## TIER 4 — Polish & Micro-interactions

### T4-1: Skeleton Loading States
Every data-fetching component currently shows a spinner or blank. Replace with:
- Task list: skeleton rows (animated pulse, correct height/width)
- Project cards: skeleton cards with gradient shimmer
- Deck cards: skeleton cards
- Note list: skeleton tree items
- Dashboard stat cards: skeleton numbers

### T4-2: Toast Notification System
Currently only Tasks have toasts. Roll out to all modules:
- "Habit checked in ✓" (green, 2s)
- "Note saved" (subtle, 1.5s)  
- "Card reviewed — next in 3 days"
- "Project created ✓"
- "Deck imported: 24 cards"
- Position: bottom-right, stack up to 3

### T4-3: Drag and Drop — Everywhere
- **Notes sidebar**: drag to reorder notes within same level
- **Habits**: drag to reorder habits
- **Project cards**: drag to reorder on the projects page
- **Table rows**: drag to reorder (already has sortOrder)

### T4-4: Empty States — All Modules
Audit every module for missing/weak empty states:
- Calendar with no events: illustration + "Create your first event"
- Tables with no tables: illustration + template suggestions
- Projects with no projects: hero illustration + "Create project" + template picker
- Habits with no habits: show 3 suggested starter habits with one-click creation

### T4-5: Micro-animations
- Task complete: checkbox fills with checkmark + task row fades/slides out
- Habit check-in: circle fills with color + brief scale-up celebration
- Card flip: improve the 3D flip easing curve
- Project card: hover state is smooth (currently snappy)
- Sidebar active item: smooth underline slide (like Linear)

### T4-6: Accessibility
- All interactive elements have `aria-label`
- Color is never the only indicator (always use text or icon too)
- Focus ring visible on all interactive elements (currently hidden on some)
- Keyboard tab order makes sense in all modals

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Global search overhaul | 🔴 Critical | Medium | **Build now** |
| Natural language dates | 🔴 Critical | Low | **Build now** |
| Batch task operations | 🔴 Critical | Low (TaskBatchFAB exists) | **Build now** |
| Flashcard stats/forecast | 🟠 High | Medium | Next sprint |
| Timeline/Gantt view | 🟠 High | High | Next sprint |
| Saved task views | 🟠 High | Low | Next sprint |
| Timer reports | 🟠 High | Medium | Next sprint |
| Note tag editing | 🟠 High | Low | Next sprint |
| Calendar intelligence | 🟠 High | Medium | Next sprint |
| Keyboard shortcut completeness | 🟠 High | Low | Next sprint |
| Settings customization | 🟡 Medium | Medium | After |
| Activity feed | 🟡 Medium | Medium | After |
| Notes graph view | 🟡 Medium | High | After |
| Habits gamification | 🟡 Medium | Medium | After |
| AI writing assistant | 🟢 High long-term | High | Future |
| Issue tracker mode | 🟢 Medium | High | Future |
| SQLite migration | 🔴 Critical (stability) | Very High | Phase 4 |

---

## Recommended Sprint Plan

### Sprint 1 (Tonight / Next session)
1. Global search overhaul (wire searchService to all entities)
2. Natural language dates (chrono-node already installed)
3. Batch task operations (TaskBatchFAB.tsx already exists)
4. Note tag editing in NoteHeader
5. Word count + reading time in note header

### Sprint 2
1. Flashcard stats & forecast dashboard
2. Timer project reports tab
3. Saved task views
4. Calendar natural language creation + next-event countdown
5. Skeleton loading states across all modules

### Sprint 3
1. Projects Timeline/Gantt view
2. Notes graph view
3. Habits gamification (XP + badges)
4. Activity feed widget on Dashboard
5. Keyboard shortcut completeness pass

### Sprint 4 (Phase 4 prep)
1. Settings customization (accent color, font size, density)
2. Notes version history
3. localStorage → SQLite abstraction layer
4. Export all data (JSON backup)
5. Packaging + installer
