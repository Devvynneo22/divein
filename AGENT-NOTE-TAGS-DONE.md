# Agent Task Complete: Tag Editing + Word Count in NoteHeader

## What was implemented

### Feature 1: Word Count & Reading Time (`WordCountPill` component)
- Added a `WordCountPill` component rendered below the title row (above the tag editor).
- Shows `"N words · X min read"` using `Math.ceil(wordCount / 200)` for reading time.
- Styled at `fontSize: 11` with `var(--color-text-muted)`, matching the muted small-text spec.
- Hidden entirely when `wordCount` is 0 or falsy.
- **Clickable** — opens a small dropdown with:
  - **Words**: exact count
  - **Characters**: `words * 5` estimate
  - **Paragraphs**: `Math.ceil(words / 8)` estimate
- Dropdown closes on outside click.
- All hover states use `onMouseEnter`/`onMouseLeave` with CSS vars per design system rules.

### Feature 2: Tag Editor (`TagEditor` component)
- Renders below the word count pill, before the cover/meta area.
- Existing tags shown as removable pills: `● #tag ×`
  - Dot color derived deterministically via `tagColor()` hash (no storage).
  - `×` button calls `updateNote` to remove the tag.
- **`+ Add tag` button** (dashed border, muted) appears at the end of pills or alone if no tags.
- Clicking opens an inline text input (auto-focused).
- As user types:
  - Pulls all notes via `useNotes()` (no filter = all notes).
  - Extracts unique tags across all notes with `useMemo`.
  - Filters to match current input (case-insensitive), excluding already-applied tags.
  - Shows up to 8 suggestions in a dropdown.
- Keyboard navigation: ArrowUp/ArrowDown cycles suggestions, Enter confirms, Escape cancels.
- Clicking a suggestion also adds it (`onMouseDown` + `e.preventDefault()` to beat the `onBlur` timing).
- Tags saved via `useUpdateNote()` hook called directly inside `TagEditor` — no prop threading needed.

## Approach Decisions
- **`useUpdateNote()` imported directly** inside the new `TagEditor` component rather than threading props through `NoteHeader`. Cleaner and self-contained.
- **`useNotes()` called without filter** to get all notes for global tag autocomplete.
- **`onBlur` delay (160ms)** on the input allows suggestion `onMouseDown` to fire before the blur handler hides the input.
- Removed the word-count display from the old meta info row (it was inline there before) — it's now a dedicated clickable pill above the tag row.
- No new npm packages used.
- No Tailwind color classes used — all colors via CSS vars.
- TypeScript strict, no `any`.

## Files Modified
- `src/modules/notes/components/NoteHeader.tsx` — complete rewrite with both features added
