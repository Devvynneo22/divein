# Nexus — Local-First Productivity Super-App

> **Status:** Phase 1 MVP — In Progress  
> **Last worked on:** 2026-03-28 11:30 SGT  
> **Owner:** Devvyn (Data Scientist at DBS Bank, Singapore)

---

## What Is This?

Nexus is a desktop-first, local-first productivity super-app that aims to replace Notion + Todoist + Google Calendar + Anki + Excel + Obsidian — all in one interconnected application. Your data lives on your machine. Cloud is optional.

## Quick Start

```bash
cd C:\Users\immer\OneDrive\Desktop\nexus
npm install --legacy-peer-deps
npx vite --host
# Open http://localhost:5173
```

**Currently runs as a web app** (no Electron wired yet). All data is in-memory — refreshing the page clears data. This is by design: build/test UI first, wire persistence later.

---

## Project Documentation Map

| File | Purpose |
|------|---------|
| **README.md** (this file) | Project overview, quick start, documentation index |
| **IMPLEMENTATION-STATUS.md** | 📋 **The audit/logging file.** Every feature's status, known issues, architecture decisions, and what was done in each session. **Read this first when starting a new session.** |
| **productivity-app-plan.md** | 📐 **The master plan.** Full design document (v2.0, ~80KB): product vision, feature specs, tech stack rationale, system architecture, database schema, UI/UX philosophy, scalability roadmap, risk analysis, AI integration strategy. **The source of truth for what to build.** |
| **CHANGELOG.md** | 📝 **Session-by-session changelog.** What was done, by whom, when, and key decisions made. |

### For AI Agents / Next Session Workers

**Start every session by reading:**
1. `IMPLEMENTATION-STATUS.md` — what's done, what's broken, what's next
2. `CHANGELOG.md` — recent session history
3. `productivity-app-plan.md` — only if you need to understand a feature's full spec

**After every session, update:**
1. `IMPLEMENTATION-STATUS.md` — mark features as ✅/🔨/📋/⚠️
2. `CHANGELOG.md` — append a new session entry

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop framework | Electron (planned, not wired yet) | Everything in TypeScript, no Rust needed |
| Frontend | React 19 + TypeScript (strict) | Largest ecosystem, proven at scale |
| UI components | Tailwind CSS 4 + lucide-react icons | Utility-first, beautiful defaults |
| Rich text editor | TipTap 2 (ProseMirror) | Industry standard block editor |
| State management | Zustand + TanStack Query | Simple local state + async cache |
| Database | SQLite (better-sqlite3) via Drizzle ORM | Local-first, portable, type-safe |
| Calendar | FullCalendar | Mature, month/week/day views |
| Tables | TanStack Table (planned) | Virtualized, sortable, filterable |
| Build | Vite 6 | Fast HMR, modern bundling |

## Architecture

```
DataService abstraction
  ├── In-memory (current) — for web-only development
  └── Electron IPC (future) — swap without changing any UI code
       └── better-sqlite3 + Drizzle ORM
            └── nexus.db (SQLite file)
```

Every module follows the same pattern:
1. **Types** (`shared/types/`) — TypeScript interfaces
2. **Service** (`shared/lib/`) — data operations (in-memory now, IPC later)
3. **Hooks** (`modules/*/hooks/`) — TanStack Query wrappers
4. **Components** (`modules/*/components/`) — React UI
5. **Page** (`modules/*/Page.tsx`) — route-level component

---

## Modules

| Module | Status | Route |
|--------|--------|-------|
| Dashboard | ✅ Basic | `/dashboard` |
| Tasks | ✅ Full CRUD | `/tasks` |
| Notes | ✅ Full CRUD + TipTap | `/notes` |
| Calendar | ✅ Full CRUD + FullCalendar | `/calendar` |
| Habits | 📋 Placeholder | `/habits` |
| Timer | 📋 Placeholder | `/timer` |
| Flashcards | 📋 Placeholder | `/flashcards` |
| Tables | 📋 Placeholder | `/tables` |
| Projects | 📋 Placeholder | `/projects` |
| Settings | 📋 Placeholder | `/settings` |

---

## Project Location

`C:\Users\immer\OneDrive\Desktop\nexus\`

OneDrive syncs this to Devvyn's other machines.
