# Global Unified Search — Implementation Complete

**Date:** 2026-03-30  
**File modified:** `src/app/CommandPalette.tsx`  
**TypeScript compile:** ✅ Zero errors (`tsc --noEmit --skipLibCheck`)

---

## What Was Built

Upgraded the existing Ctrl+K command palette into a full **Global Unified Search** — a single `CommandPalette.tsx` that searches all DiveIn content client-side.

---

## Architecture

### Data Access
All data is fetched via existing hooks at component mount (always-on so results are instant):
- `useTasks()` — all tasks
- `useNotes()` — all notes (trashed/archived filtered out)
- `useProjects()` — all projects
- `useDecks()` — all flashcard decks (searching deck names/descriptions)
- `useHabits()` — all habits (archived filtered out)

Filtering is **100% client-side** — no new service calls.

### Search Behavior
- **150ms debounce** on the input (`query` → `debouncedQuery`)
- **Case-insensitive substring match** via `text.toLowerCase().includes(query.toLowerCase())`
- **Empty query**: shows Recent Tasks (last 5 non-done/non-cancelled sorted by `updatedAt`) + Recent Notes (last 5 non-trashed/non-archived)
- **Non-empty query**: searches all 5 content groups simultaneously, up to 5 results per group
- **Highlight**: matched substring wrapped in `<mark>` with `rgba(251,191,36,0.35)` bg

### Result Groups (in order)
1. 🧭 **Navigation** — all nav commands (filtered when query present)
2. ✨ **Create** — quick-create shortcuts (filtered when query present)
3. ✅ **Tasks** — status dot + priority bar + due date meta + "Task" pill
4. 📝 **Notes** — note icon (or FileText fallback) + parent folder path + updated date + "Note" pill
5. 📁 **Projects** — project icon (or FolderKanban fallback) + status label + "Project" pill *(search only)*
6. 🃏 **Flashcards** — deck name/description + "Deck" pill *(search only)*
7. 🔄 **Habits** — habit icon + name + "Habit" pill *(search only)*

### Keyboard Navigation
- **↑↓** — move through all items across groups (cmdk `loop` mode)
- **Tab** — jump to the first item of the next group (custom `onKeyDown` handler)
- **Enter** — open selected result
- **Esc** — close palette (cmdk default)

### Navigation on Select
Uses `useNavigate()` from react-router-dom with `state` for deep-linking:
- Task → `/tasks` with `state: { selectedTaskId: task.id }`
- Note → `/notes` with `state: { selectedNoteId: note.id }`
- Project → `/projects` with `state: { selectedProjectId: project.id }`
- Deck → `/flashcards` (deck-level, no state needed)
- Habit → `/habits`
- Commands → their respective routes

### Recent Searches
- Stored in `localStorage` under key `divein-recent-searches`
- Max 5 entries, deduplicated, most-recent first
- Shown as clickable chips when query is empty (with a clock icon prefix)
- Saved on every confirmed selection when query is non-empty
- Clear button (✕) on the input to reset query

---

## Style Compliance
- All colors via CSS vars (`--color-accent`, `--color-text-muted`, etc.)
- No Tailwind color classes (`bg-*`, `text-*`)
- Tailwind used only for layout (`flex`, `gap`, `px-*`, `rounded-*`, `overflow-*`)
- Hover handled by cmdk's `data-[selected=true]` selector with `--color-accent-soft`
- `TypePill` uses `color-mix()` for the tinted background (same pattern as original)

---

## What Was Preserved
- All original navigation commands (`Go to Dashboard`, `Go to Tasks`, etc.)
- All original Create shortcuts (`New Task`, `New Note`, etc.)
- Ctrl+K toggle
- `Command` (cmdk) library — no new dependencies added
- Same backdrop/dialog/footer shell structure

---

## Notes for Follow-Up (optional)
- **NotesPage** and **TasksPage** could read `location.state.selectedNoteId` / `selectedTaskId` to auto-open the item — currently they navigate to the page without further deep-link handling.
- **Flashcard cards** are not individually searched (only deck names) because `useCards(deckId)` is per-deck. A future `useAllCards()` or server-side search endpoint would unlock full card-front search.
