# ⚡ DiveIn — Productivity Super-App

> Local-first, offline-capable productivity app built with React 19 + TypeScript + Vite

## Status

Phase 3 complete. All 9 modules fully functional. Phase 4 (Electron/distribution) next.

## Quick Start

```bash
npm install --legacy-peer-deps
npm run dev
# → http://localhost:5173
```

## Modules

| Module | Highlights |
|--------|-----------|
| **Dashboard** | Wired to all services, 5 stat cards, quick capture, dynamic greeting |
| **Tasks** | Full CRUD, subtasks, recurring tasks, drag reorder, keyboard shortcuts (n/j/k/1-4/d) |
| **Notes** | TipTap rich text, hierarchical pages, wiki-links + backlinks, slash commands, export to Markdown/PDF |
| **Calendar** | FullCalendar (month/week/day), recurring events with exceptions, tasks on calendar |
| **Habits** | Boolean + measurable tracking, streak counter, 12-week GitHub-style heatmap |
| **Timer** | Stopwatch + Pomodoro, audio notifications, task linking, live status bar timer |
| **Flashcards** | SM-2 spaced repetition, study sessions with 3D card flip, create from notes |
| **Tables** | TanStack Table grid, 8 column types, formula columns, board/kanban view, CSV import/export |
| **Projects** | Organizational layer over tasks/notes/time, milestones, kanban board |

Plus: **Command Palette** (Ctrl+K, global search), **Settings** (theme, shortcuts, pomodoro config), **Keyboard Shortcuts** (`?` cheatsheet, customizable).

## Tech Stack

React 19, TypeScript (strict), Vite, Tailwind CSS 4, TanStack Query + Table, TipTap 2, FullCalendar, Zustand, date-fns, cmdk, lucide-react, highlight.js, lowlight

## Data Persistence

All data persists via localStorage (12+ keys). SQLite via Electron planned for Phase 4.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette (navigation + global search) |
| `Ctrl+Shift+N` | Quick-add task |
| `?` | Shortcut cheatsheet |
| `j` / `k` | Navigate task list |
| `n` | New task |
| `1`–`4` | Set task priority |
| `d` | Mark task done |
| All shortcuts are customizable in Settings. |

## Project Structure

```
src/
├── app/              # App shell, layout, sidebar, command palette, providers
├── modules/
│   ├── calendar/     # FullCalendar integration
│   ├── dashboard/    # Home page with aggregated stats
│   ├── flashcards/   # SM-2 spaced repetition
│   ├── habits/       # Habit tracker + heatmap
│   ├── notes/        # TipTap editor, tree sidebar, wiki-links
│   ├── projects/     # Project management + kanban
│   ├── settings/     # App configuration
│   ├── tables/       # Spreadsheet + formula engine
│   ├── tasks/        # Task manager + subtasks
│   └── timer/        # Stopwatch + pomodoro
├── shared/
│   ├── components/   # Reusable UI (toast, toggle, etc.)
│   ├── hooks/        # Shared React hooks
│   ├── lib/          # Data services (localStorage-backed)
│   ├── stores/       # Zustand stores (timer, settings)
│   └── types/        # TypeScript interfaces
└── styles/           # Global CSS + Tailwind theme
```

Each module follows: **Types** → **Service** → **Hooks** (TanStack Query) → **Components** → **Page**

## Development

```bash
npm run dev           # Vite dev server (web)
npm run dev:full      # Vite + Electron (Electron is scaffolded but not wired. Use `npm run dev` for web-only development.)
npx tsc --noEmit --incremental false   # Type check
```

## Documentation

- **IMPLEMENTATION-STATUS.md** — Feature tracker (what's done, what's planned)
- **CHANGELOG.md** — Session-by-session history
- **productivity-app-plan.md** — Master design document (~80KB)
