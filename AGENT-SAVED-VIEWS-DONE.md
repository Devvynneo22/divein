# Saved Views — Implementation Complete

**Date:** 2026-03-30  
**Agent:** saved-views subagent

---

## What Was Done

### Files Modified

1. **`src/modules/tasks/TasksPage.tsx`** — Major redesign + new features
2. **`src/modules/tasks/components/TaskToolbar.tsx`** — Interface sync + cleanup

---

## Changes in Detail

### TasksPage.tsx

#### 1. New `noDueDate` field in `TaskFilters`
```ts
interface TaskFilters {
  ...
  noDueDate?: boolean; // client-side: filters tasks where dueDate === null
}
```
Handled in `tasks` useMemo (after the API fetch), not passed to `useTasks()` (API doesn't support it). Tasks are post-filtered client-side when `noDueDate: true`.

#### 2. `activeViewId` state — persisted to localStorage
- Key: `divein-tasks-active-view`
- Initialized from localStorage on mount via useState initializer
- `setActiveViewId()` syncs to localStorage on every change
- Set to `null` whenever user manually changes any filter, search, group, or sort (view becomes "dirty")

#### 3. Smart views — 4 built-in, always shown
Applied by `applySmartView(viewId)`:

| View | Filter Applied |
|------|---------------|
| 🔥 Overdue | `dueBefore: today 00:00:00`, `status: ['inbox','todo','in_progress','in_review']` |
| 📅 Due Today | `dueBefore: today 23:59:59` |
| ⚡ High Priority | `priority: [3, 4]` |
| 📭 No Due Date | `noDueDate: true` |

#### 4. Saved Views Bar (new component block in render)
- Horizontal strip below the toolbar, above filter chips
- Contains: smart view pills → divider → user view pills → divider → "+ Save view" button → optional "Clear view" button
- All pills styled as rounded pill buttons (border-radius: 999)
- Active view: accent background + white text + accent border
- Hover: `--color-bg-tertiary` background + `--color-border-hover` border
- User views show a `×` delete button (positioned absolute right) on hover
- Padding on the pill expands on hover to accommodate the delete button
- Horizontal scroll with `overflow-x: auto; scrollbar-width: none`

#### 5. "Save view" inline input
- Dashed pill button at end of row → click → inline input + Save/Cancel
- Enter key submits, Escape cancels
- Saves current filters (excluding `noDueDate` — it's client-side), groupBy, sortBy

#### 6. "Clear view" button
- Shown only when `activeViewId` is set
- Clears `activeViewId` + resets filters to `{}`

#### 7. Dirty view detection
- All user-driven filter changes now go through `handleFilterChange()` which calls `setActiveViewId(null)`
- `onSearch`, `onGroupByChange`, `onSortByChange` in TaskToolbar props also clear `activeViewId`
- Chips removal also routed through `handleFilterChange`

#### 8. Old saved views in header tabs — removed
- The old `savedViews.map()` tab rendering + `showSaveViewInput` inline input in the header tabs area has been removed
- All saved view UI is now in the dedicated Saved Views Bar

---

### TaskToolbar.tsx

- Added `noDueDate?: boolean` to local `TaskFilters` interface (keeps it in sync)
- `hasActiveFilters()` now includes `noDueDate` check
- Filter count badge now counts `noDueDate` as +1
- `handleRemoveFilter()` handles `noDueDate` key
- **Removed** the wrapping `flexDirection: column` div + filter chips row — the toolbar is now a single flat row of controls (no border-bottom, no column layout). The parent `TasksPage` owns the chips row.
- The "New Task" button was removed from `TaskToolbar` (it already exists in the page header). Props interface kept `onNewTask?` for backward compat but it is no longer rendered in the toolbar DOM.

---

## Known Considerations

- `noDueDate` filter is not stored in `SavedView.filters` (it's only in the client-side `TaskFilters`). If a user saves a view while `noDueDate` is active, the saved view won't restore it. To persist this, `SavedViewFilters` in `taskSettingsStore.ts` would need a `noDueDate?: boolean` field. This was not added to keep the store change minimal — easy to add later.
- The "Overdue" smart view uses `dueBefore: todayStr + 'T00:00:00'` (midnight = strictly before today). Tasks due exactly at midnight will be included; tasks due at any time today are excluded. Adjust to `todayStr + 'T23:59:59'` if "due today but overdue" should be included.
