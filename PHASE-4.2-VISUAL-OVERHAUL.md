# Visual & UX Overhaul Spec (Phase 4.2)

**Goal:** Transform the Tasks module from a dry, purely functional UI into a visually stunning, vibrant, and highly customized modern board.
**Reference Material:** User provided two images (one enterprise/matrix style like Jira, one vibrant consumer style like Monday/Trello).

## Key Visual Upgrades Required

### 1. Data Model Upgrades (`src/shared/types/task.ts`)
Add the following optional fields to the `Task` interface:
- `coverImage?: string` (URL to an Unsplash image)
- `issueKey?: string` (e.g., "DIV-1040")
- `assignees?: string[]` (Array of avatar URLs)
*Requirement:* Update `src/shared/lib/taskService.ts` to inject random `coverImage` (use `https://images.unsplash.com/photo-...` IDs) and `assignees` (use `https://i.pravatar.cc/150?u=...` URLs) into the initial mock tasks so the UI immediately pops. Add sequential `issueKey`s (DIV-1, DIV-2).

### 2. Kanban Columns (`src/modules/tasks/components/TaskBoardColumn.tsx`)
- **Headers:** Left align the title. Add an emoji to the status (e.g., 📌 To Do, ⏳ In Progress, 🔍 Review, ✅ Done).
- **Count Badge:** Replace the plain count with a vibrant pill (e.g., `bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full`).
- **Actions:** Add a `+` and `...` (MoreHorizontal) icon to the right side of the column header in subtle gray.
- **Background:** Ensure the column background is a very subtle light gray (`bg-zinc-50/50` or similar) so the white cards pop.

### 3. Task Cards (`src/modules/tasks/components/TaskCard.tsx`)
Complete rewrite of the card internals to match the reference images:
- **Cover Image:** If `coverImage` exists, render it at the very top of the card (`w-full h-28 object-cover rounded-t-xl`), with no padding around it.
- **Tags:** Instead of subtle outlines, tags must be **solid, vibrant pills** (e.g., solid purple, solid green, solid blue backgrounds with white text, `text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full`). Map specific tags to specific tailwind colors (e.g., 'iOS' -> purple, 'Mobile' -> blue, 'Development' -> green).
- **Issue Key:** Render the `issueKey` in muted bold text (`text-xs text-zinc-500 font-bold`).
- **Execution Stage Block (Enterprise Style):** Below the title, add a full-width colored rounded rectangle displaying the `status` name in white text (e.g., if status is "In Progress", render a solid blue block with white text "In Progress").
- **Avatars:** Render overlapping assignee avatars (`w-6 h-6 rounded-full border-2 border-white -ml-2`) in the bottom right corner.
- **Shadows & Borders:** Ensure the card has a crisp white background, `rounded-xl`, `border border-zinc-200`, and a soft shadow.

### 4. Customization Toggles (`src/shared/stores/appSettingsStore.ts`)
Add to `AppSettings`:
- `showCoverImages: boolean` (default: true)
- `showIssueKeys: boolean` (default: true)
Update the toolbar or settings to let users toggle these off if they want a cleaner look.

## Execution Rules
- Use Claude Sonnet 4.6.
- Ensure `tsc --noEmit` passes with zero errors.
- Test edge cases (tasks without images, tasks without assignees).
- Document changes in `CHANGELOG.md` and `IMPLEMENTATION-STATUS.md`.