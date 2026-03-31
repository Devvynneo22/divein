# Toast Notification System — Implementation Complete

## What was built

### 1. `src/shared/stores/toastStore.ts`
Global Zustand toast store with:
- `Toast` interface: `id`, `type`, `message`, `action?`, `duration?`
- `add()`: generates UUID, enforces max 4 toasts (drops oldest), auto-removes via setTimeout
- `success()`, `error()`, `info()`, `warning()`: convenience wrappers
- `toast` object: non-hook convenience export (usable outside React components) — `toast.success(msg)` etc.

### 2. `src/shared/components/ToastContainer.tsx`
Global toast renderer as a React portal mounted to `document.body`:
- Fixed bottom-right: `position: fixed, bottom: 24px, right: 24px, zIndex: 9999`
- Toasts stack vertically, newest on top (`flexDirection: 'column-reverse'`)
- Each toast:
  - Left accent border by type: success=green, error=red, info=accent, warning=orange
  - Icons: ✅ ❌ ℹ️ ⚠️
  - Background: `--color-bg-elevated`, border: `--color-border`, shadow: `--shadow-popup`
  - Optional action button (e.g. Undo)
  - × dismiss button (fades in on hover)
  - Width: 320px
  - Enter animation: slide from right + fade in (cubic-bezier spring)
  - Exit animation: slide out right + fade out (200ms)
  - Progress bar at bottom: CSS `@keyframes toast-progress` shrinks from 100%→0 over duration
  - Hover pauses progress bar (`animationPlayState: 'paused'`)
- Injects `@keyframes toast-progress` style tag once into `document.head`

### 3. `src/app/Layout.tsx`
- Imported `<ToastContainer />` and rendered inside Layout, outside all scroll areas — true global overlay

### 4. Module wiring

**Habits** (`HabitsPage.tsx` + `HabitItem.tsx`):
- `handleBooleanToggle` (check-in success) → `toast.success('Habit checked in ✓')`
- `handleSave` create path → `toast.success('Habit created')`
- `handleDelete` → `toast.success('Habit deleted')`

**Projects** (`ProjectsPage.tsx`):
- `handleSave` create path → `toast.success('Project created ✓')`
- `handleSave` update path → `toast.success('Changes saved')`
- `onArchive` → `toast.info('Project archived')`

**Flashcards** (`FlashcardsPage.tsx` + `CardList.tsx`):
- `handleCreateDeck` → `toast.success('Deck created ✓')`
- `handleImport` → `toast.success('Imported N cards')`

**Notes** (`NotesPage.tsx`):
- `handleCreateFromTemplate` → `toast.info('Note created')`
- `handleCreateChild` → `toast.info('Note created')`
- `handleTrash` → `toast.warning('Moved to trash', { label: 'Undo', onClick: () => restoreNote.mutate(id) })`
  - Added `useRestoreNote` import to support the undo action

## TypeScript
`npx tsc --noEmit` exits with code 0 — no type errors.

## No new dependencies
Only Zustand (already installed) + React's `createPortal`.
