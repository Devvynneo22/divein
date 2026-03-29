# DiveIn Tasks Module — Advanced 10-Feature Overhaul (Phase 4.1)

**Goal:** Implement 10 top-tier modern UI/UX features to elevate DiveIn's task module to the standard of Linear/Notion/Todoist.
**Date:** 2026-03-29

## Execution Batches

To maintain stability and zero TypeScript errors, we will execute in strict sequential batches, with parallel sub-agents only when files don't overlap.

### Batch 1: Display Polish & Flow (Current)
*Target Files: `appSettingsStore.ts`, `TasksPage.tsx`, `TaskBoardColumn.tsx`, `TaskCard.tsx`, `TaskListRow.tsx`*
1. **Display Density Controls**: Global setting (Compact, Default, Spacious) that adjusting paddings, avatar sizes, and list row heights globally across Tasks views.
2. **Column WIP Limits**: Configurable max items per column. Board columns turn a subtle warning color (red-tinted background/header) when `tasks.length > limit`.
3. **Interactive Subtask Progress**: Render a tiny green progress bar on cards (e.g., `2/5` becomes a visual meter).

### Batch 2: Advanced Interaction
*Target Files: `TasksPage.tsx`, `TaskList.tsx`, `TaskBoard.tsx`, `TaskToolbar.tsx`*
4. **Multi-Select & Batch Actions**: Add Shift+Click/Cmd+Click selection logic. Show a floating action bar (FAB) at the bottom for bulk operations (Set Status, Priority, Date, Delete).
5. **Contextual Keyboard Command Palette**: When a task is selected, hitting `Cmd+K` opens a task-scoped command palette (using `cmdk`) for instant property changes.

### Batch 3: Input & NLP (Requires `chrono-node`)
*Target Files: `TaskToolbar.tsx` (Quick Add), `useTasks.ts`*
6. **NLP Quick Add**: Parse natural language ("Do this tomorrow at 5pm #work P1"). Date parsed via `chrono-node`, tags via regex `#`, priority via regex `P1/P2/P3/P4`. Highlight matched strings as chips.
7. **Task Dependencies (Graph)**: Add `blockedBy` and `blocks` arrays to the `Task` type. Show a red lock icon on blocked tasks, preventing (or warning) movement to `Done`.

### Batch 4: Data Matrix & Customization
*Target Files: `appSettingsStore.ts`, `TasksPage.tsx`, `TaskBoard.tsx`*
8. **Saved Custom Views**: Store complex filters (Filter + Group + Sort) in the settings store as named tabs ("My Urgent Bugs", "Due This Week").
9. **Swimlanes**: Grouping by *two* dimensions on the board (e.g., Columns = Status, Rows = Priority).
10. **Custom Workflow States**: Replace hardcoded `Todo`, `In Progress` with a user-editable array of statuses mapped to a `State` enum (Unstarted, Active, Completed).

---

## Technical Directives for Sub-Agents
- **Code Quality:** Top 1% only. Perfect CSS, flawless animations, clean abstractions.
- **Model:** `claude-sonnet-4-6` only.
- **State:** Use `zustand` (`appSettingsStore` or `useTasks` hooks) for shared states like selection/density.
- **Testing:** Ensure `tsc --noEmit` passes after every single feature.