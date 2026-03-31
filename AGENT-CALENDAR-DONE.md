# Calendar Intelligence — Agent Done

**File written:** `src/modules/calendar/CalendarPage.tsx`  
**Date:** 2026-03-30

---

## What was implemented

### Feature 1 — Natural language event creation (quick-create popover)
- FullCalendar's `select` callback is now the unified entry point for new-event creation (replacing `dateClick`).
- A single click (below drag threshold) triggers `QuickCreatePopover` — a small floating panel that appears at the cursor position.
- User types free text like `"Team standup 10am-11am"` or just `"Team meeting"`.
- On Enter: `chrono-node` (`import * as chrono from 'chrono-node'`) parses the text to extract title and time range. Title is derived from the text before/after the parsed date expression. If no time is found, the clicked slot time is used.
- On Escape / outside click: popover closes, nothing created.
- Confirmed text pre-fills the `EventForm` and opens it.

### Feature 2 — Next-event countdown in header
- `useEffect` with `setInterval(60_000)` computes the next CalendarEvent starting within the next 8 hours.
- Format: `"in X min"` if < 60 min, `"in Xh Ym"` if ≥ 60 min, `"starting now"` if imminent.
- Rendered as a subtle pill next to the "Calendar" heading using `--color-accent-soft` background and `--color-accent` text — a non-intrusive tint.
- Hidden entirely when there's no upcoming event in the window.

### Feature 3 — Time blocking (event types)
- `EventForm` has a new **Type** selector: `Event` (📅) | `Focus Block` (🎯) | `Break` (☕).
- Type is stored in the `description` field prefixed with `[type:focus_block]` or `[type:break]`. Raw description text is stored after the prefix. Type-prefix is stripped before showing description in the edit form.
- `renderEventContent` hook detects the type via `parseEventType()` and applies:
  - **Focus Block:** `repeating-linear-gradient(-45deg, ...)` diagonal hatching overlay on the event tile.
  - **Break:** `filter: saturate(0.45) brightness(1.15)` desaturation.
- Default `Event` type: no custom rendering (falls through to FullCalendar defaults).

### Feature 4 — Drag-to-create with duration hint
- When user drags across time slots (selection duration > 30 min for timed views, > 1 day for all-day), the quick-create popover is skipped.
- `EventForm` opens directly with `startTime` and `endTime` pre-filled from the selection.
- A `durationHint` string (`"⏱ 1 hour event"`, `"⏱ 45 min event"`, etc.) is displayed below the End field.

---

## Architecture notes
- `EventForm` extracted into its own component to keep `CalendarPage` clean.
- `QuickCreatePopover` is a separate component; renders a fixed-position overlay with a backdrop div for outside-click dismiss.
- `FormData` interface extended with `eventType: EventType` and `durationHint: string`.
- `handleSelect` replaces `handleDateClick`; FullCalendar prop changed from `dateClick` → `select`.
- `evtType` is passed through `extendedProps` of each FC event so `renderEventContent` can pick it up without re-parsing.
- All colors use CSS vars only. No new npm packages. TypeScript strict (no `any`).

---

## Potential gotchas
- `chrono-node` parses relative to a reference date; we pass the clicked slot's time as `refDate` with `forwardDate: true` to handle "10am tomorrow" naturally.
- `toDatetimeLocal()` formats a `Date` to `YYYY-MM-DDTHH:mm` (the `datetime-local` input value format) without timezone conversion — keeps times in local wall-clock time matching the user's calendar view.
- `renderEventContent` returns `undefined` (not `null`) for standard events so FullCalendar falls back to its built-in renderer.
