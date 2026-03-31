# Skeleton Loading States — Implementation Summary

**Completed by:** subagent (skeleton-states)  
**Date:** 2026-03-30

---

## What was implemented

### Step 1 — Shared Skeleton component
**Created:** `src/shared/components/Skeleton.tsx`

Five components, all using CSS vars only (no hardcoded colors), no new npm packages:

| Component | Usage |
|---|---|
| `Skeleton` | Base — width/height/radius/className props |
| `SkeletonText` | `lines` + `lastLineWidth` for text paragraphs |
| `SkeletonCard` | Matches project/deck card shape, configurable `height` |
| `SkeletonRow` | Generic list row (icon + title + badge) |
| `SkeletonStatCard` | Matches `PremiumStatCard` layout on the dashboard |

Shimmer animation is injected once into `<head>` via a self-invoking function (no CSS file dependency). Uses `--color-bg-secondary` and `--color-bg-tertiary` as specified.

---

### Step 2 — Module wiring

#### `src/modules/projects/ProjectsPage.tsx`
- `isLoading` → 6 × `<SkeletonCard height={200} />` in a responsive grid (replaces `<LoadingSpinner>`)

#### `src/modules/flashcards/FlashcardsPage.tsx`
- `isLoading` → 4 × `<SkeletonCard height={220} />` in a responsive grid (replaces `<LoadingSpinner>`)

#### `src/modules/tasks/components/TaskList.tsx`
- Added optional `isLoading?: boolean` prop to `TaskListProps` (backwards-compatible, defaults `false`)
- When `isLoading` is `true`: renders 8 × `<SkeletonRow />` before the column headers' row section
- Parent components can pass `isLoading` from their data hook

#### `src/modules/dashboard/DashboardPage.tsx`
- Destructured `isLoading` from `useTasks`, `useNotes`, `useProjects`, `useTotalDueToday`
- Combined into `statsLoading` boolean
- When `statsLoading`: renders 4 × `<SkeletonStatCard />` instead of the four `<PremiumStatCard>` components

#### `src/modules/notes/components/NotesSidebar.tsx`
- Destructured `isLoading` from `useNoteTree` and `useNotes`, combined into `isNotesLoading`
- In the **Pages** tree section: when `isNotesLoading` is `true`, shows 6 × `<SkeletonRow />` instead of the tree items or "No pages yet" message

---

### Step 3 — LoadingSpinner annotation
`src/app/LoadingSpinner.tsx` — kept intact, added a comment at the top:
> LoadingSpinner is for full-page/suspense boundaries. Prefer `Skeleton` components from `@/shared/components/Skeleton` for content areas.

---

## Notes

- All changes are TypeScript-strict; no `any` used.
- All colors use CSS vars per the design system (`OVERHAUL-CONTEXT.md`).
- No new npm packages added.
- `TaskList.isLoading` is backwards-compatible (optional, defaults `false`). Callers that already pass tasks without a loading state continue to work unchanged. To wire it in the parent, destructure `isLoading` from `useProjectTasks` / `useTasks` and pass it down.
