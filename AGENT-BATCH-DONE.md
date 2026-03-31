# Batch Task Selection — Implementation Complete

## What was implemented

### TaskListRow.tsx
- Added `onToggleSelect?: (id: string, shiftKey?: boolean) => void` prop
- Added a **checkbox element** on the LEFT side of each row (before the status icon)
  - Hidden by default (`opacity: 0`), revealed on row hover OR when task is multi-selected
  - Smooth `opacity` transition (0.15s)
  - Custom checkbox UI: rounded border, accent fill when checked, white checkmark SVG
  - Click stops propagation so it doesn't trigger row selection
  - Passes `shiftKey` through for range selection support

### TaskList.tsx
- Added `onToggleSelectById?: (id: string) => void` prop (for checkbox-based toggles without a mouse event)
- Added `lastSelectedIndexRef` to track anchor for shift+click range selection
- Implemented `handleToggleSelectWithRange(id, shiftKey)`:
  - Without shift: toggles single task, updates anchor index
  - With shift: selects the full range from anchor to clicked index (additive, no de-select)
- Flat task list derived from grouped tasks for correct range indexing across groups
- Column header spacer updated to account for checkbox column width
- Passes `onToggleSelect` with shiftKey down to each `TaskListRow`

### TaskCard.tsx
- Added `onToggleSelect?: (id: string) => void` prop
- Added **checkbox overlay** in top-left corner of card
  - Hidden until hover or when `isMultiSelected` is true
  - Positioned absolutely, above cover image offset or at top-left of card body
  - Same visual style as list row checkbox (accent border/fill, white checkmark SVG)
  - `zIndex: 11` so it sits above other card content
  - Click stops propagation to prevent card selection

### TaskBoardColumn.tsx
- Wired `onToggleSelect` from column through to each `TaskCard` via a closure that invokes the parent's toggle with a synthetic event (metaKey=true to ensure the toggle path is taken)

### TasksPage.tsx
- Added `handleToggleSelectById` callback (`(id: string) => void`) for checkbox-based toggles
- Wired `onToggleSelectById={handleToggleSelectById}` to both `list` and `backlog` TaskList instances
- **Ctrl+A shortcut**: selects all visible root tasks (`tasks.map(t => t.id)`) — only fires when no input/textarea focused
- **Escape fix**: now clears multi-selection first, then closes detail panel, then closes modal (priority order)
- `selectedTaskIds` remains as `string[]`; all existing batch handler + FAB wiring was already complete

## TypeScript
Zero errors — `npx tsc --noEmit` exits clean.

## Files modified
1. `src/modules/tasks/components/TaskListRow.tsx`
2. `src/modules/tasks/components/TaskList.tsx`
3. `src/modules/tasks/components/TaskCard.tsx`
4. `src/modules/tasks/components/TaskBoardColumn.tsx`
5. `src/modules/tasks/TasksPage.tsx`
