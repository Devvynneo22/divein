# Nexus — Productivity Super-App: Technical Design Document

> **Author:** Work Claw for Devvyn  
> **Date:** 2026-03-28  
> **Status:** Draft v2.0 (complete redesign from v1)  
> **Change log:** v2.0 — Switched from Tauri to Electron after identifying critical DB layer issues and developer experience concerns in v1. Full architecture redesign.

---

## Table of Contents

1. [Product Vision & Competitive Landscape](#1-product-vision--competitive-landscape)
2. [Feature Breakdown & Module Design](#2-feature-breakdown--module-design)
3. [Tech Stack Recommendation](#3-tech-stack-recommendation)
4. [System Architecture](#4-system-architecture)
5. [Database Design](#5-database-design)
6. [UI/UX Philosophy](#6-uiux-philosophy)
7. [Scalability & Deployment Strategy](#7-scalability--deployment-strategy)
8. [Phased Build Roadmap](#8-phased-build-roadmap)
9. [Risk Analysis](#9-risk-analysis)
10. [Future AI Integration Strategy](#10-future-ai-integration-strategy)
11. [Appendix: Setup & Commands](#11-appendix-setup--commands)

---

## 1. Product Vision & Competitive Landscape

### 1.1 Vision Statement

A unified, local-first desktop productivity app that replaces the fragmented toolchain of Notion + Todoist + Google Calendar + Anki + Excel + Obsidian. One app, one data store, everything interconnected.

**Working name:** "Nexus" — everything connects through it.

**Core principle:** Your data lives on your machine. Cloud is optional, not required. The app works fully offline, always.

### 1.2 Competitive Analysis

| App | What It Does Well | Where It Falls Short |
|-----|-------------------|----------------------|
| **Notion** | Flexible blocks, databases, great UX for docs | Slow startup, cloud-dependent, no offline-first, no spaced repetition, weak calendar, can't use without internet |
| **Obsidian** | Local-first, markdown, plugin ecosystem, very fast | No built-in task management, no calendar, no spaced repetition, plugin quality is inconsistent, steep learning curve |
| **Todoist** | Clean task management, natural language input, cross-platform | No notes, no calendar (integration only), no knowledge base, no local data ownership |
| **Anki** | Gold-standard spaced repetition (SM-2), free | Ugly UI from the 2000s, zero integration with anything, painful card creation |
| **Linear** | Beautiful project management, keyboard-first, fast | Developer-focused, no personal productivity features, cloud-only |
| **TickTick** | Tasks + calendar + Pomodoro + habits in one app | Closed source, cloud-only, limited note-taking, no flashcards, no spreadsheet data tracking |
| **Google Calendar** | Ubiquitous, reliable, great integrations | Standalone service, no task depth, cloud-only, Google owns your data |
| **Coda/Airtable** | Powerful structured data, formulas, views | Cloud-only, expensive for personal use, not a general productivity tool |

### 1.3 The Gap We Fill

No single app combines ALL of the following:
- **Local-first** — your data, your machine, works offline
- **Desktop-native** — fast startup, not a slow web wrapper
- **All-in-one** — tasks, notes, calendar, habits, flashcards, data tracking, time management
- **Interconnected** — modules talk to each other (tasks show on calendar, notes link to flashcards)
- **Extensible** — designed for future AI integration, cloud sync, and multi-user

**TickTick comes closest** in feature breadth but fails on: local data ownership, knowledge base depth, flashcards, spreadsheet/data tracking, and extensibility.

### 1.4 Target User

- **Primary:** Solo knowledge worker who wants one app instead of six
- **Phase 1:** Personal use (you)
- **Phase 2+:** Could scale to teams, SaaS — architecture supports it but we don't build for it yet

---

## 2. Feature Breakdown & Module Design

### 2.1 Module Overview

The app has **9 modules**. Each is a self-contained feature area with its own UI, data, and logic. They communicate through a shared event system, not direct imports.

```
┌─────────────────────────────────────────────────────────┐
│                      DASHBOARD                           │
│  "Today" view — your daily command center                │
│  Pulls from: Tasks, Calendar, Habits, Flashcards, Timer │
└──────┬──────────┬──────────┬──────────┬─────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼──────────┐
  │ TASKS  │◄►│CALENDAR│◄►│HABITS │ │  FLASHCARDS  │
  └───┬────┘ └────────┘ └───┬───┘ └──────┬───────┘
      │                      │            │
  ┌───▼──────┐         ┌────▼───┐   ┌────▼───┐
  │ PROJECTS │◄───────►│ NOTES  │◄──┤ TABLES │
  └───┬──────┘         └────────┘   └────────┘
      │
  ┌───▼──────┐
  │  TIMER   │
  └──────────┘
```

### 2.2 Module Details

---

#### MODULE 1: Dashboard (Home)

**Purpose:** Your daily command center. The first thing you see when you open the app.

**Features:**
- **Today panel:** Tasks due today + overdue, sorted by priority
- **Calendar strip:** Today's events in a timeline
- **Habit checklist:** Today's habits with one-click check-in
- **Review count:** Flashcards due for review today (badge count)
- **Active timer:** Shows running Pomodoro/timer if active
- **Quick capture bar:** Type and press Enter to create a task instantly (like Todoist's quick-add)
- **Weekly overview:** Mini heatmap/summary of the past 7 days
- **Customizable widgets:** User can rearrange/hide dashboard sections

**Key principle:** This is NOT a separate module to build — it's a **read-only aggregation view** pulling from other modules. This makes it lightweight to build and always up-to-date.

---

#### MODULE 2: Task Manager

**Purpose:** Capture, organize, and complete work.

**Core features:**
- Create/edit/delete tasks
- Title, description (rich text), priority (P1-P4), tags, due date, start date
- Subtasks (unlimited nesting)
- Task status: Inbox → Todo → In Progress → Done / Cancelled
- Recurring tasks (daily, weekly, monthly, custom)
- Task dependencies ("blocked by" another task)

**Views:**
- **Inbox:** Unsorted capture (triage later)
- **List view:** Filtered, sorted, grouped (by project, date, priority, tag)
- **Board view:** Kanban columns (drag between statuses)
- **Saved filters:** e.g., "High priority due this week" — save and reuse

**Power features:**
- Global hotkey for quick-add (works even when app is minimized)
- Keyboard-driven: arrow keys to navigate, Enter to edit, shortcuts for priority/status
- Batch operations: select multiple tasks, bulk update status/priority/tags
- Markdown in task descriptions

---

#### MODULE 3: Notes & Knowledge Base

**Purpose:** Think, write, and build a personal knowledge graph.

**Core features:**
- Rich text editor (block-based, like Notion)
  - Headings (H1-H3), paragraphs, bullet/numbered lists, checklists
  - Code blocks with syntax highlighting
  - Tables (inline)
  - Images (paste, drag-and-drop, or file picker)
  - Callouts/admonitions (info, warning, tip)
  - Toggle blocks (collapsible sections)
  - Dividers
  - Block-level drag reorder
- Markdown shortcuts (type `# ` for heading, `- ` for bullet, etc.)
- Slash commands (`/heading`, `/code`, `/image`, `/table`, `/todo`)

**Organization:**
- Folder hierarchy (nested folders)
- Tags (flat, cross-cutting)
- Pin important notes to top
- Recent notes list
- Full-text search (instant, searches title + content)

**Knowledge graph:**
- `[[wiki-links]]` — type `[[` to search and link to another note
- Backlinks panel — "These notes link to this one"
- Future: graph visualization

**Interoperability:**
- Embed a task list in a note (live, synced)
- Embed a table/database view in a note
- Create a task from selected text (highlight → right-click → "Create task")
- Create a flashcard from selected text (highlight → right-click → "Create flashcard")
- Export to Markdown (.md) or PDF

---

#### MODULE 4: Calendar

**Purpose:** Time-based view of events, tasks, and habits.

**Core features:**
- **Month view:** Overview with event/task dots
- **Week view:** Detailed hourly grid
- **Day view:** Full hourly detail
- Create events: title, start/end time, all-day toggle, location, description, color
- Recurring events (daily, weekly, monthly, yearly, custom)
- Reminders (notification X minutes before)
- Drag-and-drop to reschedule events
- Color coding by category/project

**Integration:**
- Tasks with due dates appear on calendar (as colored markers)
- Habit schedules visible on calendar
- Time entries visible on calendar (show how time was actually spent)

**Future:**
- CalDAV sync with Google Calendar, Outlook
- .ics import/export

**Implementation note:** Use a proven calendar library (FullCalendar or Schedule-X) rather than building calendar UI from scratch. Calendar rendering is notoriously complex — month boundaries, timezone handling, recurring event expansion, drag-and-drop on grids. Don't reinvent this.

---

#### MODULE 5: Habit Tracker

**Purpose:** Build consistency through daily tracking.

**Core features:**
- Define habits with:
  - Name, icon, color
  - Frequency: daily, X times per week, specific days (Mon/Wed/Fri)
  - Type: boolean (did/didn't) or measurable (ran 5km, read 30 min)
  - Target value and unit (for measurable habits)
- One-click check-in from Dashboard or Habits page
- Habit groups (e.g., "Morning Routine", "Fitness", "Learning")

**Stats & motivation:**
- Current streak (consecutive days/weeks)
- Longest streak
- Completion rate (last 7/30/90 days)
- Heatmap calendar (GitHub contribution-style)
- Trend charts

**Notes on entries:**
- Add a note to any check-in ("ran 5km in 28 min, felt good")
- View history of notes per habit

---

#### MODULE 6: Time Tracker & Pomodoro

**Purpose:** Know where your time goes. Stay focused.

**Core features:**
- Start/stop timer on any task (or standalone)
- Manual time entry (for retroactive logging)
- Pomodoro mode:
  - Configurable intervals (default 25 min work / 5 min break / 15 min long break)
  - Auto-start next interval (configurable)
  - Visual and audio notification on interval end
  - Pomodoro count per task/day

**Reporting:**
- Daily time summary (how many hours tracked, breakdown by project/tag)
- Weekly bar chart (hours per day)
- Per-task time totals (estimated vs actual)
- Exportable time reports (CSV)

**UX:**
- Timer is always visible in the status bar (bottom of app)
- Click status bar timer to expand/collapse detail
- Idle detection: if no mouse/keyboard for X minutes, ask "Were you still working?"

---

#### MODULE 7: Flashcards & Spaced Repetition

**Purpose:** Remember what you learn using proven memory science.

**Core features:**
- Create decks (groups of cards)
- Create cards with front (question) and back (answer)
- Rich content on cards: markdown, images, code blocks, LaTeX/math
- Tags on cards (for cross-referencing)

**Study system (SM-2 algorithm):**
- Spaced repetition scheduling: cards appear for review at optimal intervals
- Review quality: Again (0) / Hard (3) / Good (4) / Easy (5)
- New cards per day limit (configurable)
- Review session: focused mode showing one card at a time

**Integration with Notes:**
- Select text in a note → "Create flashcard" → pre-fills front with context, back blank
- Card stores reference to source note
- Click source link on card → jumps to the note

**Stats:**
- Cards due today (shown on Dashboard)
- Reviews per day chart
- Retention rate
- Forecast (how many reviews expected this week)

**Import/Export:**
- Import from CSV (front, back columns)
- Export to CSV
- Future: Anki .apkg import (complex format, defer to later)

---

#### MODULE 8: Tables & Structured Data

**Purpose:** Track anything structured — like a personal database / lightweight spreadsheet.

**Core features:**
- Create named tables
- Define columns with types:
  - Text, Number, Date, Checkbox
  - Select (dropdown, single), Multi-select (tags)
  - URL, Email
  - Relation (link to another table's rows)
  - Formula (computed from other columns): SUM, AVG, COUNT, IF, CONCAT
- Add/edit/delete rows
- Inline editing (click a cell to edit)

**Views of the same table:**
- **Table view:** Spreadsheet grid (default)
- **Board view:** Kanban by a Select column
- **Calendar view:** By a Date column
- **Gallery view:** Cards with an image column (future)

**Power features:**
- Sort by any column (multi-column sort)
- Filter rows (column conditions, combinable)
- Group by a column
- Column resizing, reordering
- CSV import/export
- Templates: Expense tracker, Reading list, Inventory, CRM contacts, etc.

**Implementation note:** Use TanStack Table for the grid rendering. It handles virtualization (important for large datasets), sorting, filtering, and column resizing. The column type system and formula engine are custom logic on top.

---

#### MODULE 9: Project Management

**Purpose:** Organize larger efforts that span multiple tasks, notes, and timelines.

**Core features:**
- Create projects with: name, description, color, icon, status (active/archived)
- A project is a **container** that groups:
  - Tasks (assigned to this project)
  - Notes (linked to this project)
  - Tables (scoped to this project)
  - Time entries (logged against this project)
- Milestones: named checkpoints with due dates and linked tasks

**Views:**
- **Project dashboard:** Progress overview, task breakdown, time spent
- **Kanban board:** Tasks in this project on a board
- **Timeline:** Simple Gantt-style view of tasks with dates (stretch goal, not MVP)

**Key design:** Projects don't have their own "data" — they're an organizational layer on top of Tasks, Notes, and Tables. A task can exist without a project (in Inbox). A note can exist without a project (in personal notes). Projects just add structure when you need it.

---

### 2.3 Module Interconnection Map

This is the real value — how everything connects:

| From | To | Connection |
|------|----|------------|
| Task | Calendar | Tasks with due dates appear on calendar |
| Task | Project | Tasks can belong to a project |
| Task | Timer | Start a timer on any task; time logged against task |
| Task | Notes | Create task from note text; reference tasks in notes |
| Note | Flashcard | Create flashcard from note text; card links back to source note |
| Note | Table | Embed table views inside notes |
| Note | Project | Notes can be linked to a project |
| Habit | Calendar | Habit schedule visible on calendar |
| Habit | Dashboard | Today's habits shown as checklist |
| Flashcard | Dashboard | Due card count shown on dashboard |
| Timer | Dashboard | Active timer shown in status bar |
| Timer | Task | Time entries linked to tasks |
| Timer | Project | Time entries linked to projects |
| Event | Calendar | Events are the primary calendar content |
| Table | Project | Tables can be scoped to a project |
| Everything | Dashboard | Dashboard aggregates from all modules |

### 2.4 Global Features (Cross-Cutting)

These aren't modules — they're app-level features that work everywhere:

- **Command Palette (`Ctrl+K`):** Search anything, navigate anywhere, execute any action. Like Spotlight/Raycast/VS Code's command palette.
- **Global Quick-Add (`Ctrl+Shift+N`):** Creates a new task from anywhere, even when the app is minimized.
- **Tags:** Shared tag system across tasks, notes, cards, and table rows.
- **Full-Text Search:** Searches across all content types (tasks, notes, events, cards).
- **Keyboard Shortcuts:** Every action has a shortcut. Discoverable via `?` key.
- **Undo/Redo:** Global undo for the last N actions (across modules).
- **Theme:** Dark mode (default) + Light mode.
- **Settings:** All configurable preferences in one place.
- **Auto-backup:** Automatic database backup on app start and on schedule.

---

## 3. Tech Stack Recommendation

### 3.1 The Big Decision: Why Electron, Not Tauri

**v1 of this plan recommended Tauri 2. v2 reverses that decision.** Here's why:

#### The Problem with Tauri for This Project

Tauri's architecture splits your app into two worlds:
1. **Frontend:** Web technologies (HTML/CSS/JS) running in a WebView
2. **Backend:** Rust code handling system access and heavy lifting

This means:
- **Database access lives in Rust.** Node.js packages like `better-sqlite3` and Drizzle ORM cannot run in the WebView. You either write all DB logic in Rust (learning a new, complex language) or use Tauri's SQL plugin (limited, less mature).
- **Every DB query crosses an IPC boundary.** Frontend calls Rust via `invoke()`, Rust queries the DB, sends results back. This adds latency, complexity, and debugging difficulty.
- **Debugging is split.** Frontend bugs = Chrome DevTools. Backend bugs = Rust debugging. Two different toolchains.
- **Ecosystem mismatch.** The JavaScript/npm ecosystem is enormous. With Tauri, you can only use npm packages that run in a browser context. With Electron, you can use everything (including native Node.js modules).

For a data scientist who isn't a deep engineer: **Rust is an unnecessary barrier.** Even "thin" Rust code requires understanding ownership, borrowing, lifetimes, and async patterns that are fundamentally different from JavaScript/Python.

#### Why Electron Is the Right Choice

| Factor | Electron | Tauri |
|--------|----------|-------|
| Language (all layers) | JavaScript/TypeScript only | TypeScript (frontend) + Rust (backend) |
| Database access | Direct — `better-sqlite3` in Node.js, full Drizzle ORM | Indirect — through IPC or limited plugins |
| npm ecosystem | 100% compatible (any package) | ~60% (browser-compatible packages only) |
| Debugging | One toolchain (Chrome DevTools + Node inspector) | Two toolchains (DevTools + Rust debugger) |
| Learning curve | Low — it's all JavaScript | Medium-High — must learn some Rust |
| Bundle size | ~150-300MB | ~5-15MB |
| Memory usage | ~150-300MB | ~50-100MB |
| Production examples | VS Code, Obsidian, Notion, Slack, Discord, Linear, Figma | Few major production apps |
| Maturity | 10+ years, battle-tested | Tauri 2 released 2024, younger ecosystem |
| Mobile path | None (separate app needed) | Built-in iOS/Android (Tauri 2) |
| Auto-updater | Mature (`electron-updater`) | Available but less mature |

**The trade-offs we accept:**
- **Larger bundle (300MB):** For a desktop app you install once and auto-update, this is irrelevant. Obsidian and VS Code are Electron apps and nobody cares about their bundle size.
- **Higher memory (200-300MB):** Your laptop has 16-32GB RAM. A productivity app using 300MB is fine. Chrome tabs use more.
- **No built-in mobile:** Mobile is Phase 5 (month 15+). By then, we'll have a web app (Phase 3) that works on mobile browsers, or we build a native mobile app sharing the API layer.

**What we gain:**
- **Everything is JavaScript/TypeScript.** One language, one mental model.
- **`better-sqlite3` just works.** It runs in Node.js, which Electron gives us.
- **Drizzle ORM just works.** Type-safe queries, migrations, schema definitions — all in TypeScript.
- **Any npm package works.** No "does this run in a browser?" questions.
- **Proven at scale.** The most complex desktop apps in the world run on Electron.

### 3.2 Complete Tech Stack

```
┌──────────────────────────────────────────────────────────┐
│                      ELECTRON 33+                         │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              RENDERER PROCESS (UI)                   │ │
│  │                                                      │ │
│  │  React 19 + TypeScript (strict)                     │ │
│  │  shadcn/ui + Radix UI + Tailwind CSS 4              │ │
│  │  TipTap 2 (rich text editor, ProseMirror-based)     │ │
│  │  Zustand (local state per module)                   │ │
│  │  TanStack Query (async state, cache)                │ │
│  │  TanStack Table (table/grid rendering)              │ │
│  │  FullCalendar or Schedule-X (calendar views)        │ │
│  │  dnd-kit (drag and drop)                            │ │
│  │  Recharts (charts/stats/heatmaps)                   │ │
│  │  cmdk (command palette)                             │ │
│  │  Vite (bundling, HMR)                               │ │
│  │                                                      │ │
│  └───────────────────┬──────────────────────────────────┘ │
│                      │ IPC (contextBridge)                 │
│  ┌───────────────────▼──────────────────────────────────┐ │
│  │              MAIN PROCESS (Node.js)                   │ │
│  │                                                       │ │
│  │  better-sqlite3 (SQLite database, synchronous)       │ │
│  │  Drizzle ORM (type-safe queries, migrations)         │ │
│  │  FlexSearch (full-text search index)                 │ │
│  │  electron-updater (auto-updates)                     │ │
│  │  electron-store (user preferences)                   │ │
│  │  Node.js fs/path (file system, backups, exports)     │ │
│  │  Window management, tray, global shortcuts           │ │
│  │                                                       │ │
│  └───────────────────┬──────────────────────────────────┘ │
│                      │                                     │
│  ┌───────────────────▼──────────────────────────────────┐ │
│  │              DATA LAYER                               │ │
│  │                                                       │ │
│  │  SQLite database file (~/.nexus/nexus.db)            │ │
│  │  Auto-backup copies (~/.nexus/backups/)              │ │
│  │  Drizzle migrations (~/.nexus/migrations/)           │ │
│  │  FlexSearch index (in-memory, rebuilt on start)      │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Stack Decisions Explained

#### React 19 + TypeScript ✅
- React 19's compiler = automatic memoization = less manual performance tuning
- Ecosystem is unmatched: every component library, every tutorial, every Stack Overflow answer
- TypeScript in strict mode catches bugs at compile time and provides autocomplete

#### shadcn/ui + Radix UI + Tailwind CSS 4 ✅
- **shadcn/ui**: Copies component source into your codebase. You own it, customize freely. No dependency lock-in.
- **Radix UI** (underneath shadcn): Accessible, well-tested headless primitives (modals, dropdowns, tooltips, etc.)
- **Tailwind CSS 4**: Utility-first CSS. Fast iteration. Consistent design tokens. Small output via purging.
- Why not MUI/Ant Design? Heavy, hard to customize deeply, apps all look the same.

#### TipTap 2 (Rich Text Editor) ✅
- Built on ProseMirror — the engine behind Notion, Confluence, and many block editors
- Block-based, extensible, supports collaborative editing
- Markdown shortcuts, slash commands, custom node types
- Stores content as structured JSON (queryable, transformable)
- Active development, large community, excellent docs
- **This is the most complex UI component in the app.** TipTap handles the hard parts.

#### better-sqlite3 + Drizzle ORM ✅
- **better-sqlite3**: Synchronous SQLite access in Node.js. No callback hell. Fast (C++ binding).
- **Drizzle ORM**: Type-safe queries matching your TypeScript types. Supports both SQLite and PostgreSQL with the same schema definitions (critical for future cloud migration).
- **Why synchronous SQLite?** For a local desktop app, synchronous DB calls simplify everything. No async state issues. Call `db.query()`, get results immediately. Electron's main process handles this fine.

#### Zustand + TanStack Query ✅
- **Zustand**: Lightweight state management. One store per module. No Redux boilerplate.
- **TanStack Query**: Handles the async data layer — caching IPC results, invalidation, optimistic updates. Even though our DB is local, data still crosses the IPC bridge (main → renderer), so TanStack Query is the right abstraction.

#### FullCalendar ✅
- Most mature calendar library in the ecosystem
- Month, week, day, list views out of the box
- Drag-and-drop rescheduling
- Recurring event support
- React wrapper (`@fullcalendar/react`)
- Free for open-source use (MIT licensed core plugins)
- Alternative: Schedule-X if we want lighter weight

#### cmdk (Command Palette) ✅
- The library behind Vercel's `Ctrl+K` and Linear's command palette
- Fast, accessible, composable
- Tiny footprint

#### electron-vite (Build Tooling) ✅
- Modern Electron scaffolding with Vite for both main and renderer processes
- Fast HMR (Hot Module Replacement) in development
- Proper process isolation (main, preload, renderer)
- TypeScript-first configuration

### 3.4 Libraries Not Included (and Why)

| Library | Why Not |
|---------|---------|
| Redux / MobX | Overkill. Zustand is simpler and sufficient. |
| Prisma | Heavier than Drizzle, slower queries, more abstractions. Drizzle is closer to SQL. |
| Moment.js | Deprecated. Using `date-fns` (tree-shakeable, modern). |
| Slate.js (editor) | Less mature than TipTap/ProseMirror for block editing. |
| Sequelize/TypeORM | Heavier, less type-safe than Drizzle. |
| Material UI | Heavy, opinionated, hard to make look unique. |
| Next.js | Server-side rendering framework — irrelevant for a desktop app. |
| tRPC | Useful for web API, but for Electron IPC we use Electron's built-in contextBridge. Could add later for web version. |

---

## 4. System Architecture

### 4.1 Architecture Principles

1. **Local-first:** Data on disk. Works offline. Always.
2. **Single language:** Everything in TypeScript. No Rust, no Go, no context-switching.
3. **Module isolation:** Features are self-contained. They communicate via events, not direct imports.
4. **Abstracted data access:** All DB/IPC calls go through a `DataService` abstraction. This enables future web extraction (swap IPC for REST).
5. **Progressive disclosure:** Users see simplicity. Complexity is available but not forced.
6. **Undo-friendly:** State changes are logged for undo/redo support.

### 4.2 Electron Process Model

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│      RENDERER PROCESS       │     │       MAIN PROCESS           │
│      (Chromium window)      │     │       (Node.js)              │
│                             │     │                              │
│  React app                  │     │  Database (better-sqlite3)   │
│  UI components              │ IPC │  Drizzle ORM                 │
│  State (Zustand)            │◄───►│  File system operations      │
│  User interactions          │     │  Search index (FlexSearch)   │
│                             │     │  Auto-backup service         │
│  Calls: window.api.tasks.*  │     │  Window management           │
│  Never touches DB directly  │     │  Tray icon                   │
│                             │     │  Global shortcuts             │
│                             │     │  Auto-updater                │
└─────────────────────────────┘     └──────────────────────────────┘
```

**Security:** Renderer never has direct Node.js access. All system/DB calls go through a typed `preload.ts` bridge (Electron's `contextBridge`). This follows Electron security best practices.

### 4.3 Project Structure

```
nexus/
├── electron/                        # Electron main process
│   ├── main.ts                      # App entry, window creation, lifecycle
│   ├── preload.ts                   # contextBridge — exposes typed API to renderer
│   ├── db/
│   │   ├── connection.ts            # SQLite connection setup (better-sqlite3)
│   │   ├── migrations.ts            # Run Drizzle migrations on app start
│   │   └── backup.ts               # Auto-backup logic
│   ├── handlers/                    # IPC request handlers (one per module)
│   │   ├── tasks.handler.ts
│   │   ├── notes.handler.ts
│   │   ├── calendar.handler.ts
│   │   ├── habits.handler.ts
│   │   ├── flashcards.handler.ts
│   │   ├── tables.handler.ts
│   │   ├── timer.handler.ts
│   │   ├── projects.handler.ts
│   │   ├── search.handler.ts
│   │   └── settings.handler.ts
│   ├── services/                    # Business logic (Node.js side)
│   │   ├── search.service.ts        # FlexSearch indexing
│   │   ├── export.service.ts        # CSV/JSON/PDF export
│   │   ├── import.service.ts        # CSV/Anki import
│   │   └── notifications.service.ts # System notifications, reminders
│   └── utils/
│       ├── logger.ts                # Structured logging to file
│       └── paths.ts                 # App data directory resolution
│
├── src/                             # React renderer process
│   ├── main.tsx                     # React entry point
│   ├── app/
│   │   ├── App.tsx                  # Root component
│   │   ├── Router.tsx               # Route definitions
│   │   ├── Layout.tsx               # Shell: sidebar + main + detail panel
│   │   ├── CommandPalette.tsx       # Ctrl+K command palette (cmdk)
│   │   ├── StatusBar.tsx            # Bottom bar: timer, shortcuts
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       ├── QueryProvider.tsx     # TanStack Query client
│   │       └── EventBusProvider.tsx
│   │
│   ├── modules/                     # Feature modules
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── TodayTasks.tsx
│   │   │   ├── TodayCalendar.tsx
│   │   │   ├── TodayHabits.tsx
│   │   │   ├── ReviewBadge.tsx
│   │   │   └── QuickCapture.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── TasksPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── TaskItem.tsx
│   │   │   │   ├── TaskDetail.tsx
│   │   │   │   ├── TaskBoard.tsx    # Kanban view
│   │   │   │   ├── TaskForm.tsx
│   │   │   │   └── TaskFilters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTasks.ts      # TanStack Query hooks
│   │   │   │   └── useTaskMutations.ts
│   │   │   ├── stores/
│   │   │   │   └── taskViewStore.ts # View preferences (Zustand)
│   │   │   └── types.ts
│   │   │
│   │   ├── notes/
│   │   │   ├── NotesPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── NoteEditor.tsx   # TipTap editor wrapper
│   │   │   │   ├── NoteSidebar.tsx  # Folder tree
│   │   │   │   ├── NoteList.tsx
│   │   │   │   ├── BacklinksPanel.tsx
│   │   │   │   └── SlashMenu.tsx    # Slash command menu
│   │   │   ├── extensions/          # TipTap custom extensions
│   │   │   │   ├── WikiLink.ts
│   │   │   │   ├── TaskEmbed.ts
│   │   │   │   └── TableEmbed.ts
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── calendar/
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx  # FullCalendar wrapper
│   │   │   │   ├── EventForm.tsx
│   │   │   │   └── EventDetail.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── habits/
│   │   │   ├── HabitsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── HabitList.tsx
│   │   │   │   ├── HabitCheckIn.tsx
│   │   │   │   ├── HabitHeatmap.tsx
│   │   │   │   ├── HabitStats.tsx
│   │   │   │   └── HabitForm.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── timer/
│   │   │   ├── TimerWidget.tsx      # Status bar widget
│   │   │   ├── components/
│   │   │   │   ├── PomodoroTimer.tsx
│   │   │   │   ├── TimeLog.tsx
│   │   │   │   └── TimeReport.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── flashcards/
│   │   │   ├── FlashcardsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── DeckList.tsx
│   │   │   │   ├── CardEditor.tsx
│   │   │   │   ├── ReviewSession.tsx # Study mode
│   │   │   │   ├── ReviewStats.tsx
│   │   │   │   └── CardDetail.tsx
│   │   │   ├── lib/
│   │   │   │   └── sm2.ts           # SM-2 algorithm implementation
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── tables/
│   │   │   ├── TablesPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── DataGrid.tsx     # TanStack Table wrapper
│   │   │   │   ├── ColumnEditor.tsx
│   │   │   │   ├── CellRenderer.tsx # Per-type cell rendering
│   │   │   │   ├── FormulaEngine.tsx
│   │   │   │   ├── TableFilters.tsx
│   │   │   │   └── TableForm.tsx
│   │   │   ├── lib/
│   │   │   │   └── formulas.ts      # Formula parser and evaluator
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProjectList.tsx
│   │   │   │   ├── ProjectDashboard.tsx
│   │   │   │   └── MilestoneTracker.tsx
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   │
│   │   └── settings/
│   │       ├── SettingsPage.tsx
│   │       └── sections/
│   │           ├── GeneralSettings.tsx
│   │           ├── AppearanceSettings.tsx
│   │           ├── PomodoroSettings.tsx
│   │           ├── BackupSettings.tsx
│   │           └── ShortcutSettings.tsx
│   │
│   ├── shared/                      # Shared across all modules
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components live here
│   │   │   ├── TagPicker.tsx
│   │   │   ├── PriorityBadge.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   ├── useKeyboardShortcut.ts
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── lib/
│   │   │   ├── api.ts              # Typed wrapper around window.api (the IPC bridge)
│   │   │   ├── eventBus.ts         # Cross-module event system
│   │   │   ├── dates.ts            # date-fns helpers
│   │   │   └── constants.ts
│   │   └── types/
│   │       ├── database.ts         # Shared DB entity types
│   │       ├── events.ts           # Event bus type definitions
│   │       └── api.ts              # IPC API type definitions
│   │
│   └── styles/
│       └── globals.css             # Tailwind base + custom CSS variables
│
├── drizzle/                         # Database schema & migrations
│   ├── schema/
│   │   ├── index.ts                # Re-exports all schemas
│   │   ├── tasks.ts
│   │   ├── notes.ts
│   │   ├── calendar.ts
│   │   ├── habits.ts
│   │   ├── flashcards.ts
│   │   ├── tables.ts
│   │   ├── projects.ts
│   │   ├── timer.ts
│   │   ├── tags.ts
│   │   ├── settings.ts
│   │   └── relations.ts           # Cross-table relations
│   └── migrations/                 # Auto-generated by Drizzle Kit
│
├── resources/                      # App icons, assets
│   └── icon.png
│
├── tests/
│   ├── unit/                       # Vitest unit tests
│   └── e2e/                        # Playwright E2E tests
│
├── .github/
│   └── workflows/
│       └── build.yml              # CI: build + release for Win/Mac/Linux
│
├── package.json
├── tsconfig.json
├── tsconfig.node.json              # For electron/ main process
├── tailwind.config.ts
├── vite.config.ts                  # Via electron-vite
├── drizzle.config.ts
├── electron-builder.yml            # Build/package configuration
└── README.md
```

### 4.4 IPC Architecture (The Critical Bridge)

The IPC layer is the most important architectural decision after the framework choice. It determines how maintainable and extractable the app is.

```
RENDERER                           MAIN PROCESS
────────                           ────────────
                                   
Component                          
  │                                
  ▼                                
Hook (useTasks)                    
  │                                
  ▼                                
api.tasks.create(data)             
  │                                
  ▼                                
window.api.tasks.create(data)      ──► ipcMain.handle('tasks:create')
  (preload.ts contextBridge)             │
                                         ▼
                                    tasks.handler.ts
                                         │
                                         ▼
                                    Drizzle ORM query
                                         │
                                         ▼
                                    SQLite (better-sqlite3)
                                         │
                                    ◄────┘
  ◄─── returns result ────────────
  │
  ▼
TanStack Query cache update
  │
  ▼
React re-render
```

#### preload.ts (The Typed Bridge)

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Every IPC channel is explicitly defined and typed
const api = {
  tasks: {
    list: (filter?: TaskFilter) => ipcRenderer.invoke('tasks:list', filter),
    create: (data: CreateTaskInput) => ipcRenderer.invoke('tasks:create', data),
    update: (id: string, data: UpdateTaskInput) => ipcRenderer.invoke('tasks:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('tasks:delete', id),
    reorder: (id: string, newOrder: number) => ipcRenderer.invoke('tasks:reorder', id, newOrder),
  },
  notes: {
    list: (filter?: NoteFilter) => ipcRenderer.invoke('notes:list', filter),
    get: (id: string) => ipcRenderer.invoke('notes:get', id),
    create: (data: CreateNoteInput) => ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: UpdateNoteInput) => ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    search: (query: string) => ipcRenderer.invoke('notes:search', query),
  },
  // ... same pattern for all modules
  app: {
    backup: () => ipcRenderer.invoke('app:backup'),
    getVersion: () => ipcRenderer.invoke('app:version'),
    onGlobalShortcut: (callback: (action: string) => void) => {
      ipcRenderer.on('global-shortcut', (_, action) => callback(action));
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
```

#### DataService Abstraction (Future-Proofing for Web)

```typescript
// src/shared/lib/api.ts

// This interface is what all modules import.
// Desktop: calls window.api (Electron IPC)
// Web (future): calls REST API endpoints
export interface TaskService {
  list(filter?: TaskFilter): Promise<Task[]>;
  create(data: CreateTaskInput): Promise<Task>;
  update(id: string, data: UpdateTaskInput): Promise<Task>;
  delete(id: string): Promise<void>;
}

// Desktop implementation
export const taskService: TaskService = {
  list: (filter) => window.api.tasks.list(filter),
  create: (data) => window.api.tasks.create(data),
  update: (id, data) => window.api.tasks.update(id, data),
  delete: (id) => window.api.tasks.delete(id),
};

// Future web implementation (swap in when building web app)
// export const taskService: TaskService = {
//   list: (filter) => fetch('/api/tasks', { ... }).then(r => r.json()),
//   ...
// };
```

**Why this matters:** When you build the web app (Phase 3), you swap ONE file per module. The entire React UI, all components, all hooks — unchanged.

### 4.5 Event Bus (Cross-Module Communication)

Modules never import each other directly. They communicate through typed events:

```typescript
// src/shared/lib/eventBus.ts
type EventMap = {
  // Task events
  'task:created':    { task: Task };
  'task:updated':    { task: Task };
  'task:completed':  { taskId: string; projectId?: string };
  'task:deleted':    { taskId: string };
  
  // Note events
  'note:created':    { note: Note };
  'note:updated':    { noteId: string };
  
  // Calendar events
  'event:created':   { event: CalendarEvent };
  'event:updated':   { event: CalendarEvent };
  
  // Habit events
  'habit:checked':   { habitId: string; date: string; value: number };
  
  // Timer events
  'timer:started':   { taskId?: string };
  'timer:stopped':   { taskId?: string; duration: number };
  'timer:pomodoro-complete': { count: number };
  
  // Flashcard events
  'card:reviewed':   { cardId: string; quality: number; nextReview: string };
  
  // Global
  'search:execute':  { query: string };
  'navigate':        { path: string };
};

class EventBus {
  private listeners = new Map<string, Set<Function>>();
  
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void) { ... }
  off<K extends keyof EventMap>(event: K, handler: Function) { ... }
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) { ... }
}

export const eventBus = new EventBus();
```

**Example:** When a task is completed, the calendar module hears about it and updates its view. The project module recalculates progress. The dashboard refreshes. None of them import each other.

### 4.6 Error Handling & Logging

```typescript
// electron/utils/logger.ts
// Logs to: ~/.nexus/logs/nexus-YYYY-MM-DD.log
// Rotation: keep last 7 days

// React side:
// src/shared/components/ErrorBoundary.tsx
// Catches render errors, shows "Something went wrong" with "Reload" button
// Logs error to main process for file logging

// IPC error handling:
// All ipcMain.handle() wrap in try/catch
// Errors are serialized and sent back to renderer with error codes
// TanStack Query's onError handles display (toast notification)
```

### 4.7 Auto-Backup System

```
On app start:
  1. Check ~/.nexus/backups/
  2. Copy nexus.db → backups/nexus-YYYY-MM-DD-HHmmss.db
  3. Delete backups older than 30 days
  4. Keep at most 50 backup files

On schedule (every 4 hours while app is running):
  Same backup logic

Before any migration:
  Force backup with label: backups/nexus-pre-migration-vX.Y.db
```

Data lives at: `~/.nexus/` (cross-platform via Electron's `app.getPath('userData')`)
- `~/.nexus/nexus.db` — main database
- `~/.nexus/backups/` — auto-backups
- `~/.nexus/logs/` — log files
- `~/.nexus/exports/` — user-initiated exports

---

## 5. Database Design

### 5.1 Schema Overview

The schema is unchanged from v1 — it was already solid. Key points:

- **TEXT primary keys** (UUIDs) — critical for offline creation and future sync
- **ISO 8601 TEXT dates** — portable between SQLite and PostgreSQL
- **JSON columns** for flexible data (tags, recurrence rules, table row data)
- **Fractional indexing** (REAL sort_order) for drag-and-drop reordering
- **FTS5** for full-text search on notes
- **Foreign keys with ON DELETE CASCADE/SET NULL** — data integrity without orphaned rows

### 5.2 Complete Schema

```sql
-- ======================== CORE ========================

-- Settings (key-value store for app preferences)
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL  -- JSON-encoded
);

-- Tags (shared across all modules)
CREATE TABLE tags (
    id    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name  TEXT NOT NULL UNIQUE,
    color TEXT
);

-- Schema version (for migration tracking)
CREATE TABLE schema_version (
    version     INTEGER NOT NULL,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

-- ======================== PROJECTS ========================

CREATE TABLE projects (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT,
    icon        TEXT,
    status      TEXT NOT NULL DEFAULT 'active',  -- active, archived
    sort_order  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE milestones (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    due_date    TEXT,
    status      TEXT NOT NULL DEFAULT 'open',  -- open, completed
    sort_order  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ======================== TASKS ========================

CREATE TABLE tasks (
    id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title         TEXT NOT NULL,
    description   TEXT,                              -- Markdown or plain text
    status        TEXT NOT NULL DEFAULT 'inbox',     -- inbox, todo, in_progress, done, cancelled
    priority      INTEGER NOT NULL DEFAULT 0,        -- 0=none, 1=low, 2=medium, 3=high, 4=urgent
    project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
    milestone_id  TEXT REFERENCES milestones(id) ON DELETE SET NULL,
    parent_id     TEXT REFERENCES tasks(id) ON DELETE CASCADE,  -- subtask
    due_date      TEXT,                              -- ISO 8601 date
    start_date    TEXT,
    completed_at  TEXT,
    recurrence    TEXT,                              -- JSON: { "type": "daily", "interval": 1, ... }
    sort_order    REAL NOT NULL DEFAULT 0,
    tags          TEXT NOT NULL DEFAULT '[]',        -- JSON array: ["work", "urgent"]
    estimated_min INTEGER,                           -- estimated minutes
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Task dependencies
CREATE TABLE task_dependencies (
    task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_id)
);

-- ======================== NOTES ========================

CREATE TABLE note_folders (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    parent_id   TEXT REFERENCES note_folders(id) ON DELETE CASCADE,
    sort_order  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notes (
    id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title        TEXT NOT NULL,
    content      TEXT,                               -- TipTap JSON document
    content_text TEXT,                               -- Plain text extraction (for search)
    folder_id    TEXT REFERENCES note_folders(id) ON DELETE SET NULL,
    project_id   TEXT REFERENCES projects(id) ON DELETE SET NULL,
    is_pinned    INTEGER NOT NULL DEFAULT 0,
    is_archived  INTEGER NOT NULL DEFAULT 0,
    tags         TEXT NOT NULL DEFAULT '[]',          -- JSON array
    word_count   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notes_folder ON notes(folder_id);
CREATE INDEX idx_notes_project ON notes(project_id);

-- Bi-directional links between notes
CREATE TABLE note_links (
    source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    PRIMARY KEY (source_id, target_id)
);

CREATE INDEX idx_note_links_target ON note_links(target_id);

-- Full-text search (SQLite FTS5)
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title,
    content_text,
    content=notes,
    content_rowid=rowid,
    tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER notes_fts_insert AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, title, content_text) VALUES (new.rowid, new.title, new.content_text);
END;
CREATE TRIGGER notes_fts_delete AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_text) VALUES ('delete', old.rowid, old.title, old.content_text);
END;
CREATE TRIGGER notes_fts_update AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, title, content_text) VALUES ('delete', old.rowid, old.title, old.content_text);
    INSERT INTO notes_fts(rowid, title, content_text) VALUES (new.rowid, new.title, new.content_text);
END;

-- Attachments (images, files embedded in notes)
CREATE TABLE attachments (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size_bytes  INTEGER NOT NULL,
    storage_path TEXT NOT NULL,   -- Relative path under ~/.nexus/attachments/
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ======================== CALENDAR ========================

CREATE TABLE events (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title       TEXT NOT NULL,
    description TEXT,
    start_time  TEXT NOT NULL,   -- ISO 8601 datetime
    end_time    TEXT,            -- ISO 8601 datetime
    all_day     INTEGER NOT NULL DEFAULT 0,
    location    TEXT,
    color       TEXT,
    category    TEXT,            -- user-defined category
    recurrence  TEXT,            -- JSON: iCalendar RRULE-like
    reminders   TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ "minutes_before": 15, "type": "notification" }]
    project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_time ON events(start_time, end_time);

-- Recurring event exceptions (modified/deleted occurrences)
CREATE TABLE event_exceptions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    event_id        TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    original_date   TEXT NOT NULL,  -- The date this exception replaces
    is_deleted      INTEGER NOT NULL DEFAULT 0,  -- 1 = this occurrence is cancelled
    -- Override fields (NULL = use parent event's value)
    title           TEXT,
    start_time      TEXT,
    end_time        TEXT,
    description     TEXT,
    location        TEXT
);

-- ======================== HABITS ========================

CREATE TABLE habits (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT,
    icon        TEXT,
    frequency   TEXT NOT NULL,   -- JSON: { "type": "daily" } | { "type": "weekly", "days": [1,3,5] } | { "type": "x_per_week", "count": 3 }
    group_name  TEXT,            -- e.g., "Morning Routine", "Fitness"
    target      REAL NOT NULL DEFAULT 1,  -- target per check-in (1 for boolean)
    unit        TEXT,            -- e.g., "times", "minutes", "km", "pages"
    is_archived INTEGER NOT NULL DEFAULT 0,
    sort_order  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE habit_entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,   -- YYYY-MM-DD
    value       REAL NOT NULL DEFAULT 1,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_entries ON habit_entries(habit_id, date);

-- ======================== FLASHCARDS ========================

CREATE TABLE decks (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    description TEXT,
    color       TEXT,
    new_cards_per_day INTEGER NOT NULL DEFAULT 20,
    tags        TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cards (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    deck_id         TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front           TEXT NOT NULL,    -- Markdown/rich text
    back            TEXT NOT NULL,
    source_note_id  TEXT REFERENCES notes(id) ON DELETE SET NULL,
    tags            TEXT NOT NULL DEFAULT '[]',
    -- SM-2 algorithm state
    interval_days   REAL NOT NULL DEFAULT 0,
    repetitions     INTEGER NOT NULL DEFAULT 0,
    ease_factor     REAL NOT NULL DEFAULT 2.5,
    next_review     TEXT NOT NULL DEFAULT (date('now')),
    last_reviewed   TEXT,
    -- Status
    status          TEXT NOT NULL DEFAULT 'new',  -- new, learning, review, suspended
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_review ON cards(next_review, status);
CREATE INDEX idx_cards_source ON cards(source_note_id) WHERE source_note_id IS NOT NULL;

CREATE TABLE card_reviews (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    quality     INTEGER NOT NULL,  -- 0-5 (SM-2 quality rating)
    interval_days REAL NOT NULL,   -- interval assigned after this review
    ease_factor REAL NOT NULL,     -- ease factor after this review
    reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_card_reviews_card ON card_reviews(card_id);

-- ======================== TIME TRACKING ========================

CREATE TABLE time_entries (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    task_id     TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
    description TEXT,
    start_time  TEXT NOT NULL,
    end_time    TEXT,
    duration_sec INTEGER,         -- seconds (calculated when stopped, or manual)
    is_pomodoro INTEGER NOT NULL DEFAULT 0,
    is_running  INTEGER NOT NULL DEFAULT 0,  -- 1 if timer is currently active
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_time_task ON time_entries(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_time_start ON time_entries(start_time);
CREATE INDEX idx_time_running ON time_entries(is_running) WHERE is_running = 1;

-- ======================== TABLES (Structured Data) ========================

CREATE TABLE table_defs (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name        TEXT NOT NULL,
    description TEXT,
    project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
    icon        TEXT,
    -- Column definitions: JSON array
    -- [{ "id": "col_abc", "name": "Name", "type": "text", "width": 200, "options": {} }, ...]
    -- Types: text, number, date, checkbox, select, multi_select, url, email, relation, formula
    columns     TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE table_rows (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_id    TEXT NOT NULL REFERENCES table_defs(id) ON DELETE CASCADE,
    -- Cell values: JSON object keyed by column ID
    -- { "col_abc": "John", "col_def": 42, "col_ghi": "2026-01-15" }
    data        TEXT NOT NULL DEFAULT '{}',
    sort_order  REAL NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_table_rows ON table_rows(table_id);

-- ======================== ACTIVITY LOG (Undo/Sync) ========================

CREATE TABLE activity_log (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_type TEXT NOT NULL,    -- 'task', 'note', 'event', 'habit', etc.
    entity_id   TEXT NOT NULL,
    action      TEXT NOT NULL,    -- 'create', 'update', 'delete'
    old_data    TEXT,             -- JSON snapshot before change (for undo)
    new_data    TEXT,             -- JSON snapshot after change
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_activity_log_time ON activity_log(created_at);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Prune activity log: keep last 1000 entries (done by app on startup)
```

### 5.3 Schema Improvements Over v1

| Change | Why |
|--------|-----|
| Added `schema_version` table | Track migrations, enable auto-upgrade on app start |
| Added `content_text` to notes | Separate plain text extraction for FTS (don't search JSON structure) |
| Added FTS triggers | Keep search index in sync automatically |
| Added `attachments` table | Notes need image/file storage |
| Added `event_exceptions` table | Recurring events need exception handling (modify one instance) |
| Added `task_dependencies` as separate table | Cleaner than a JSON column, queryable |
| Added `card_reviews` with interval/ease snapshot | Needed for proper review stats and algorithm debugging |
| Added `activity_log` table | Enables undo/redo and future sync conflict resolution |
| Added `is_running` to time_entries | Track which timer is active without separate state |
| Added `new_cards_per_day` to decks | SM-2 needs this to throttle new card introduction |
| Added `word_count` to notes | Dashboard stats without re-parsing content |
| Added `status` to cards | Distinguish new/learning/review/suspended cards (Anki model) |
| Added partial indexes | SQLite partial indexes = faster queries on common filters |

### 5.4 Drizzle Schema (TypeScript)

```typescript
// drizzle/schema/tasks.ts
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { projects } from './projects';
import { milestones } from './projects';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('inbox'),
  priority: integer('priority').notNull().default(0),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  milestoneId: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  parentId: text('parent_id').references((): any => tasks.id, { onDelete: 'cascade' }),
  dueDate: text('due_date'),
  startDate: text('start_date'),
  completedAt: text('completed_at'),
  recurrence: text('recurrence'),           // JSON string
  sortOrder: real('sort_order').notNull().default(0),
  tags: text('tags').notNull().default('[]'), // JSON string
  estimatedMin: integer('estimated_min'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  statusIdx: index('idx_tasks_status').on(table.status),
  projectIdx: index('idx_tasks_project').on(table.projectId),
  parentIdx: index('idx_tasks_parent').on(table.parentId),
}));
```

**Migration strategy:**
1. On app start, check `schema_version` table
2. If behind, backup DB, then run pending Drizzle migrations sequentially
3. Update `schema_version` with each applied migration
4. If migration fails, restore from backup and alert user

---

## 6. UI/UX Philosophy

### 6.1 Design Principles

1. **Speed is the product.** Local data = no loading spinners. Everything renders instantly. Optimistic updates on every mutation.
2. **Keyboard-first.** Every action has a shortcut. Tab, Enter, arrow keys navigate everywhere. Mouse is optional for power users.
3. **Progressive complexity.** New users see a clean, simple interface. Features reveal themselves as needed. Don't show 8 modules on day one.
4. **Spatial consistency.** Sidebar left. Content center. Detail panel right. Users always know where they are.
5. **Dark mode default.** Light mode available. Theme follows system preference by default, overridable.
6. **Dense but not cluttered.** Productivity users want information density. But every pixel should earn its place.

### 6.2 App Shell Layout

```
┌────────┬───────────────────────────────────┬─────────────┐
│        │    Breadcrumb / View Switcher      │   Search    │
│  N     ├───────────────────────────────────┼─────────────┤
│  A     │                                    │             │
│  V     │                                    │   DETAIL    │
│        │                                    │   PANEL     │
│  S     │        MAIN CONTENT AREA           │             │
│  I     │                                    │  (shows     │
│  D     │    (changes per module/view)       │   context   │
│  E     │                                    │   for       │
│  B     │                                    │   selected  │
│  A     │                                    │   item)     │
│  R     │                                    │             │
│        │                                    │  [toggle]   │
├────────┴───────────────────────────────────┴─────────────┤
│  ⏱ Timer: 12:34 on "Write API docs"  │  🍅 2/4  │  ⌨ ?  │
└──────────────────────────────────────────────────────────┘
```

**Sidebar navigation:**
```
🏠 Dashboard        (always visible)
──────────
📋 Tasks
📝 Notes
📅 Calendar
──────────         (separator: "enabled modules")
✅ Habits
⏱ Timer
🃏 Flashcards
📊 Tables
📁 Projects
──────────
⚙ Settings
```

**Module visibility:** On first run, only Dashboard, Tasks, Notes, and Calendar are visible in the sidebar. User can enable other modules in Settings → Modules. This prevents overwhelm.

### 6.3 Key UX Patterns

**Command Palette (`Ctrl+K`):**
- Fuzzy search across: navigation targets, tasks, notes, events, commands
- Commands: "Create task", "New note", "Start timer", "Toggle dark mode", "Open settings"
- Recently used items appear first
- Library: `cmdk`

**Quick Capture (`Ctrl+Shift+N`):**
- Works even when app is minimized (Electron global shortcut)
- Small floating window appears
- Type text, press Enter → creates task in Inbox
- Press `Ctrl+Enter` → creates note instead
- Closes automatically after creation

**Inline editing:**
- Click any text field to edit in-place
- No modal dialogs for simple edits
- Press `Escape` to cancel, `Enter` to save (or `Tab` to move to next field)

**Drag and drop:**
- Reorder tasks in list view
- Move tasks between kanban columns
- Drag task to a date on calendar to set due date
- Drag to reorder sidebar favorites
- Library: `dnd-kit`

**Toasts for feedback:**
- "Task created ✓" with undo button
- "Note deleted" with undo button (soft delete + undo window)
- Non-blocking, bottom-right corner, auto-dismiss after 5s

---

## 7. Scalability & Deployment Strategy

### Phase 1: Local Desktop App (Months 1-4)

**What:**
- App runs 100% locally
- Data in SQLite file (`~/.nexus/nexus.db`)
- No internet required

**Distribution:**
- Build with `electron-builder` → `.exe`/`.msi` (Windows), `.dmg` (macOS), `.AppImage` (Linux)
- Host releases on GitHub Releases
- Auto-update via `electron-updater` (checks GitHub for new releases)

**Multi-machine sync (simple):**
- Store `~/.nexus/` folder inside OneDrive/Dropbox/Google Drive
- SQLite file syncs between machines via cloud storage
- ⚠️ Don't open on two machines simultaneously (SQLite isn't designed for concurrent access across network drives)
- This is a stopgap — real sync comes in Phase 2

### Phase 2: Cloud Sync (Months 5-8)

**Architecture: Local-first with CRDT sync**

```
Machine A (Electron)          Cloud Relay          Machine B (Electron)
┌──────────────┐             ┌──────────┐         ┌──────────────┐
│ SQLite (local)│────push────►│  Sync    │◄──push──│ SQLite (local)│
│              │◄───pull──────│  Server  │──pull──►│              │
└──────────────┘             └──────────┘         └──────────────┘
```

- Each machine has a full local copy (offline-first preserved)
- Changes are tracked as operations (not full row snapshots)
- Sync uses CRDTs (Conflict-free Replicated Data Types) — no conflicts possible
- Library options: `yjs`, `automerge`, or `cr-sqlite` (CRDTs directly in SQLite)
- **`cr-sqlite`** is the best fit here: it's a SQLite extension that adds CRDT merge capabilities to regular SQL tables. No app-level CRDT logic needed.

**Sync relay server:**
- Lightweight Node.js or Rust server
- Deploy on Railway, Fly.io, or Render (cheap, $5-10/month)
- Only relays encrypted change packets — doesn't store or decrypt data
- Auth: simple token-based (personal use) → OAuth later for multi-user

### Phase 3: Web App (Months 8-12)

**The payoff of the DataService abstraction:**

1. Take the entire `src/` directory (React app)
2. Create a new web project (Vite + React, no Electron)
3. Swap `DataService` implementations from Electron IPC → REST API calls
4. Deploy frontend to Vercel/Netlify
5. Deploy API backend to Railway/Fly.io

**Backend API:**
- Node.js + Hono or Fastify (lightweight, fast)
- PostgreSQL (via Drizzle — same schema, change imports)
- Auth: Supabase Auth or Lucia Auth

**Code reuse: ~80%** — all UI components, hooks, and module logic stay identical.

### Phase 4: Multi-User / SaaS (Month 12+)

- Add teams: shared projects, role-based permissions
- PostgreSQL with row-level security (RLS) for multi-tenancy
- Billing: Stripe
- Landing page, documentation, onboarding

### Phase 5: Mobile (Month 15+)

Options at that point:
1. **PWA**: The web app (Phase 3) can be installed as a PWA on mobile. Limited native features but zero additional code.
2. **React Native**: Share ~60% of logic (hooks, state, types). Rebuild UI components for native.
3. **Capacitor**: Wrap the web app in a native shell. Quick but less polished.

Recommendation: Start with PWA, evaluate if native features are needed.

---

## 8. Phased Build Roadmap

### Phase 0: Foundation (Week 1-2)

**Goal:** Working app shell with navigation, theming, and database.

- [x] Initialize project (Vite + React + TypeScript — adapted from plan's electron-vite)
- [x] Configure: TypeScript strict, Tailwind CSS 4 (shadcn/ui replaced with custom components)
- [x] Set up Drizzle ORM + better-sqlite3 schemas (not wired yet — localStorage bridge in use)
- [x] Create database schema (all tables from Section 5)
- [x] Build IPC layer: preload.ts + typed handlers (skeleton, not wired)
- [x] App shell: sidebar navigation, routing (React Router), theme toggle
- [ ] Auto-backup service (backup DB on start) — deferred to Phase 4
- [ ] Logging service (structured file logging) — deferred to Phase 4
- [x] Error boundary (React) — top-level + per-module
- [x] Status bar (bottom of app, live timer display)

**Deliverable:** App launches, navigates between empty module pages, DB is created and migrated, backups work.

### Phase 1: MVP — Daily Driver (Weeks 3-8) ✅

Build the 4 modules you'll use every day:

**1a. Dashboard (Week 3)** ✅
- [x] Today's tasks (wired to all services)
- [x] Quick capture bar (creates tasks with today's due date)
- [x] Today's calendar events
- [x] Simple, clean layout with 5 stat cards
- [x] This is the app's home page from day one

**1b. Task Manager (Weeks 3-5)** ✅
- [x] Full CRUD: create, read, update, delete tasks
- [x] Task properties: title, description, priority (P1-P4), due date, tags, status
- [x] Subtasks (one level deep)
- [x] Inbox view (unsorted tasks)
- [x] List view with sorting and filtering (status, priority, tag)
- [x] Keyboard shortcuts: `N` new task, `Enter` edit, `1-4` set priority, `D` set done, `j/k` navigate
- [x] Global quick-add hotkey (`Ctrl+Shift+N`)
- [x] Drag to reorder (HTML5 DnD — switched from dnd-kit to native HTML5 drag for simplicity)
- [x] Undo on delete (toast with 5s auto-dismiss)

**1c. Notes (Weeks 5-7)** ✅
- [x] TipTap editor with core blocks: headings, paragraphs, lists, code blocks, images, callouts, dividers
- [x] Markdown shortcuts (`# `, `- `, `> `, etc.)
- [x] Slash commands (`/heading`, `/code`, `/list`, `/image`)
- [x] Hierarchical tree sidebar (infinite depth, not flat folders)
- [x] Search across all pages with breadcrumb context
- [x] Full-text search (in-memory via global search, not FTS5 — SQLite not wired yet)
- [x] `[[wiki-links]]` with auto-complete
- [x] Backlinks panel
- [x] Auto-save (500ms debounce)

**1d. Calendar (Weeks 7-8)** ✅
- [x] FullCalendar integration: month, week, day views
- [x] Create/edit/delete events
- [x] Event properties: title, time, all-day, color, description
- [x] Tasks with due dates shown as markers on calendar
- [x] Drag to reschedule events
- [x] Click date to create event

**MVP Deliverable:** A genuinely usable daily productivity app. Tasks + Notes + Calendar + Dashboard. You can start using this as your real tool.

### Phase 2: Productivity Features (Weeks 9-14) ✅

**2a. Habit Tracker (Weeks 9-10)** ✅
- [x] Create habits with frequency rules
- [x] Daily check-in (boolean or numeric/measurable)
- [x] Streak counter (current + longest)
- [x] Heatmap calendar (12-week GitHub-style contribution graph)
- [x] Habit group labels with autocomplete
- [x] Habits shown on Dashboard

**2b. Timer & Pomodoro (Weeks 10-11)** ✅
- [x] Start/stop timer (standalone or on a task)
- [x] Pomodoro mode with configurable intervals
- [x] Timer in status bar (always visible)
- [x] Audio notification on interval complete (Web Audio API)
- [x] Daily time summary
- [x] Time logged against tasks (searchable task selector)

**2c. Project Management (Weeks 11-12)** ✅
- [x] Create projects (name, color, emoji icon)
- [x] Assign tasks to projects
- [x] Assign notes to projects
- [x] Project dashboard: task progress, time spent
- [x] Kanban board view (5 status columns, drag to change status)
- [x] Milestones (CRUD, progress bars, due date countdown)

**2d. Command Palette + Shortcuts (Weeks 13-14)** ✅
- [x] `Ctrl+K` command palette (cmdk)
- [x] Global search across all 7 content types
- [x] Navigate to any page
- [x] Create any item
- [x] Keyboard shortcut cheatsheet (`?` key)
- [x] Customizable shortcuts (Settings, shortcutService registry)

### Phase 3: Advanced Features (Weeks 15-20) ✅

**3a. Flashcards & Spaced Repetition (Weeks 15-17)** ✅
- [x] Create decks and cards
- [x] SM-2 algorithm implementation (pure function)
- [x] Review session mode (card-by-card with CSS 3D flip, quality rating)
- [ ] New cards per day limit — deferred
- [x] Create card from note text (bubble menu + toolbar → Create flashcard)
- [ ] Cards link back to source notes — deferred
- [ ] Stats: retention rate, reviews per day, forecast — deferred
- [ ] Due cards shown on Dashboard — deferred
- [ ] CSV import/export for flashcards — deferred

**3b. Tables & Structured Data (Weeks 17-19)** ✅
- [x] Create tables with typed columns
- [x] TanStack Table for grid rendering
- [x] Column types: text, number, date, checkbox, select, multi-select, url, email
- [x] Inline cell editing
- [x] Sort, filter (type-aware, multi-filter AND logic)
- [x] Formula columns (SUM, AVG, COUNT, MIN, MAX, IF, arithmetic)
- [x] CSV import/export (RFC 4180, column mapping, preview)
- [x] Multiple views: table (default), board/kanban (by select column)

**3c. Integration & Polish (Weeks 19-20)** ✅
- [x] Cross-module linking: notes ↔ tasks, notes ↔ projects
- [ ] Embed table views inside notes (TipTap custom block) — deferred
- [x] Recurring tasks and events (daily/weekly/monthly/yearly, exceptions, auto-create)
- [ ] Calendar event reminders (system notifications) — deferred (needs Electron)
- [x] Export: notes to Markdown/PDF, tables to CSV
- [x] Import: CSV to tables
- [x] Settings page: all configurable options
- [ ] Auto-updater (electron-updater with GitHub Releases) — deferred to Phase 4

### Phase 4: Distribution & Sync (Weeks 21-26)

- GitHub Actions CI/CD: build for Windows, macOS, Linux on every release tag
- GitHub Releases hosting
- Auto-update flow
- Cloud sync R&D: evaluate cr-sqlite or yjs
- Basic sync implementation (optional, behind a feature flag)
- README, docs, onboarding experience

### Implementation Notes

**dnd-kit → HTML5 DnD:** The plan specified `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop. During implementation, native HTML5 Drag and Drop was used instead for simplicity and zero-dependency overhead. The dnd-kit packages were never imported and have been removed from dependencies.

### Deferred Features

The following features were consciously skipped or deferred during Phases 1–3:

| Feature | Reason |
|---------|--------|
| Task dependencies (blocked-by relationships) | Complexity; not needed for personal use |
| Batch operations on tasks (multi-select actions) | Low priority for solo user |
| Unlimited subtask nesting | One-level deep is sufficient; deeper nesting adds UI complexity |
| Idle detection for timer | Needs Electron APIs (not available in web-only mode) |
| Calendar event reminders (system notifications) | Needs Electron Notification API |
| Flashcard CSV import/export | Deferred to Phase 4 |
| Flashcard stats (retention rate, forecast) | Deferred to Phase 4 |
| New cards per day limit | Deferred — simple to add later |
| Embed table views inside notes | TipTap custom node complexity; deferred |
| FTS5 full-text search | Using in-memory search via global search; SQLite FTS5 deferred to Phase 4 |
| shadcn/ui component library | Custom Tailwind components used instead |

### Time Estimates

| Phase | Scope | Full-time | Part-time (~15h/wk) |
|-------|-------|-----------|---------------------|
| **Phase 0** | Foundation | 2 weeks | 2-3 weeks |
| **Phase 1** | MVP (Dashboard + Tasks + Notes + Calendar) | 6 weeks | 9-10 weeks |
| **Phase 2** | Habits + Timer + Projects + Command Palette | 6 weeks | 9-10 weeks |
| **Phase 3** | Flashcards + Tables + Integration | 6 weeks | 9-10 weeks |
| **Phase 4** | Distribution + Sync | 6 weeks | 8-10 weeks |
| **Total** | | **~26 weeks** | **~38-43 weeks** |

**Key insight:** After Phase 1 (~10 weeks part-time), you have a usable app. Everything after is additive value. You could use it as your daily tool from that point forward.

---

## 9. Risk Analysis

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **TipTap editor complexity** | High | High | Start with basic blocks only. Add custom extensions incrementally. TipTap's docs and examples are excellent. Don't try to match Notion's editor on day one. |
| **Electron memory usage** | Medium | Low | Acceptable for a productivity app (~200-300MB). Optimize later if needed (lazy load modules, virtualize lists). |
| **Scope creep** | High | High | **Discipline.** Phase 1 MVP first. Don't start Phase 2 features until Phase 1 is complete and usable. |
| **Calendar complexity** | Medium | Medium | Use FullCalendar library. Don't build calendar UI from scratch. Recurring events are complex — implement simple recurrence first (daily/weekly), complex later. |
| **SQLite file corruption** | Low | Critical | Auto-backup on start + every 4 hours. WAL mode (Write-Ahead Logging) for crash safety. Test backup restore flow. |
| **Data migration between versions** | Medium | High | Schema versioning + auto-migration + pre-migration backup. Test migrations on copy of real data. |
| **Performance with 10K+ notes** | Low | Medium | Virtualized lists (TanStack Virtual), pagination, FTS5 for search (not full scan). SQLite handles millions of rows — this is a non-issue if queries are indexed. |
| **Cross-platform differences** | Low | Low | Electron + Chromium = consistent rendering. Test on Windows + macOS periodically. |

### Decisions That Are Hard to Reverse

| Decision | Reversibility | Confidence |
|----------|--------------|------------|
| Electron as framework | Hard to switch to Tauri later (different process model) | ✅ High — right for this developer and this project |
| React as UI framework | Hard — all components would need rewriting | ✅ High — largest ecosystem, proven at scale |
| SQLite as local DB | Easy — Drizzle abstracts the dialect | ✅ High — SQLite is the only sensible choice for local-first |
| TipTap as rich text editor | Medium — content is JSON, could transform to another format | ✅ High — industry standard, ProseMirror-based |
| UUID text IDs | Easy — just a convention | ✅ High — essential for future sync |
| Module-based architecture | Easy to restructure folders | ✅ High — standard pattern |

### What Could Kill the Project

1. **Trying to build everything at once.** The #1 risk. Mitigation: strict phase discipline.
2. **Spending too long on the note editor.** Rich text editing is a rabbit hole. Mitigation: use TipTap's built-in features. Don't build custom blocks until Phase 3.
3. **Never reaching "usable."** Mitigation: Phase 1 MVP is designed to be genuinely useful on its own. Use it yourself. If it's not better than your current tools, something's wrong.

---

## 10. Future AI Integration Strategy

The architecture supports AI integration cleanly when you're ready:

### Integration Points

| Feature | AI Role | Implementation |
|---------|---------|----------------|
| Smart task creation | Parse natural language: "Meet John tomorrow 3pm about Q2" → creates event + task | LLM API call on quick-capture input |
| Note summarization | Summarize long notes, extract key points | Select text → "Summarize" context menu |
| Flashcard generation | Generate Q&A pairs from note content | Select text → "Generate flashcards" → review & edit suggestions |
| Smart search | Semantic search beyond keyword matching | Embeddings stored in `sqlite-vec` (SQLite vector extension) |
| Habit insights | Analyze patterns, suggest optimizations | Weekly digest based on habit data |
| Task prioritization | Suggest priorities based on due dates, context, past behavior | Sidebar suggestion panel |
| Writing assistance | Continue writing, fix grammar, rephrase | TipTap extension: AI writing block |

### Architecture

```typescript
// src/shared/lib/ai.ts
interface AIProvider {
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
}

// Adapters:
class OpenAIProvider implements AIProvider { ... }
class AnthropicProvider implements AIProvider { ... }
class OllamaProvider implements AIProvider { ... }  // Local LLM

// User configures their provider in Settings
// All AI features call through this abstraction — provider-agnostic
```

**Key design choices:**
- AI is **always optional** — every feature works without it
- AI is **pluggable** — user chooses their provider (OpenAI, Anthropic, local Ollama)
- AI suggestions are **editable** — never auto-applied, always shown for review
- **No data sent to cloud without explicit consent** — local-first means AI must ask before sending content to an API

---

## 11. Appendix: Setup & Commands

### Prerequisites

1. **Node.js 22+** ✅ (you have this)
2. **Git** (for version control)
3. **No Rust needed** (unlike Tauri)

### Project Creation

```bash
# Create the project
npm create electron-vite@latest nexus -- --template react-ts
cd nexus

# Install core dependencies
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3

# UI
npm install @radix-ui/react-icons
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init

# State management
npm install zustand @tanstack/react-query

# Rich text editor
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm
npm install @tiptap/extension-placeholder @tiptap/extension-link
npm install @tiptap/extension-code-block-lowlight @tiptap/extension-image

# Calendar
npm install @fullcalendar/core @fullcalendar/react
npm install @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Tables
npm install @tanstack/react-table @tanstack/react-virtual

# Utilities
npm install date-fns dnd-kit cmdk recharts
npm install -D @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Search
npm install flexsearch

# Electron extras
npm install electron-updater electron-store

# Testing
npm install -D vitest @testing-library/react playwright

# Run in development
npm run dev
```

### Development Workflow

```bash
# Start dev server (opens Electron window with hot reload)
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Package for distribution
npm run package      # Creates installer for current platform
npm run package:all  # Creates installers for all platforms (CI)
```

### Key Files to Create First (Phase 0)

1. `electron/db/connection.ts` — SQLite connection
2. `electron/db/migrations.ts` — Auto-migration runner
3. `electron/preload.ts` — Typed IPC bridge
4. `drizzle/schema/*.ts` — All table schemas
5. `src/app/Layout.tsx` — App shell with sidebar
6. `src/app/Router.tsx` — Route definitions

---

## Summary

| Aspect | Decision |
|--------|----------|
| **Framework** | Electron (everything in TypeScript, no Rust) |
| **Frontend** | React 19 + shadcn/ui + Tailwind CSS 4 |
| **Database** | SQLite (better-sqlite3) locally → PostgreSQL cloud (same Drizzle schema) |
| **Rich text** | TipTap 2 (ProseMirror-based) |
| **State** | Zustand (local) + TanStack Query (async/cache) |
| **Calendar** | FullCalendar |
| **Tables** | TanStack Table |
| **Search** | SQLite FTS5 + FlexSearch |
| **Build** | electron-vite + Vite |
| **Distribution** | electron-builder + GitHub Releases + auto-update |

**Why this stack:** One language (TypeScript), massive ecosystem, proven at scale (Obsidian, VS Code), no learning curve friction, every npm package available, clean migration path to web and cloud.

**Build order:** Foundation → Tasks + Notes + Calendar + Dashboard (MVP) → Habits + Timer + Projects → Flashcards + Tables → Sync + Distribution

**MVP in ~10 weeks part-time.** Full app in ~40 weeks. Start using it as your daily tool after Phase 1.

---

*This is a living document. Update as decisions are made and the project evolves.*
