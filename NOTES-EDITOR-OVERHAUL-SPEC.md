# Notes Editor Overhaul — Session 22 Spec

**Date:** 2026-03-30  
**Goal:** Comprehensive notes editor upgrade — 12 features, all built together as one cohesive pass.  
**Quality bar:** Top 1% — Notion / Craft / Bear / Linear polish level.  
**Stack:** React + TypeScript + TipTap v3.21 + Tailwind + design tokens from `globals.css`

---

## Project Location
`C:\Users\immer\OneDrive\Desktop\divein`

## Run / Build
```bash
npm run dev        # port 5173 (or 5174 if occupied)
npx tsc --noEmit   # must pass with zero errors after all changes
```

## Hard Constraints
- Zero TypeScript errors (`npx tsc --noEmit` must pass clean)
- Use `npm install --legacy-peer-deps` for any new packages
- Do NOT modify: `src/styles/globals.css`, `src/app/Sidebar.tsx`, `src/app/Layout.tsx`, `src/app/StatusBar.tsx`, `src/app/App.tsx`, `src/modules/dashboard/DashboardPage.tsx`, `src/shared/stores/appSettingsStore.ts`, anything in `src/shared/lib/`, `src/shared/types/`, `src/shared/stores/`
- All new design must use CSS variables from `globals.css` (e.g. `var(--color-bg-elevated)`, `var(--color-border)`, `var(--color-accent)`) — no hardcoded hex in JSX style props
- Both light and dark themes must work correctly
- git commit all changes at end with a descriptive message

---

## Features to Build

---

### ① Toolbar Ribbon Redesign

**File:** `src/modules/notes/components/NoteEditor.tsx` (toolbar section)

**Current state:** Single flat strip of ~20 tiny icons, no grouping, no labels.

**Target:** A two-row ribbon with clear visual group sections, like a mini Word/Craft ribbon.

**Implementation:**
- Toolbar container becomes `flex flex-col` — two rows total
- **Row 1 (actions + headings + formatting):**
  - Group "History": Undo, Redo
  - Separator
  - Group "Format": Bold, Italic, Underline, Strikethrough, Highlight, Text color picker
  - Separator  
  - Group "Headings": H1, H2, H3 buttons — show which is currently active with accent bg
- **Row 2 (blocks + insert):**
  - Group "Blocks": Bullet list, Ordered list, Task list, Blockquote, Code block, Horizontal rule
  - Separator
  - Group "Insert": Image upload button, Emoji picker, Table (new), Callout (new)
  - Separator
  - Group "Tools": Find & Replace toggle button (🔍), Flashcard (🧠), Zen mode toggle (⛶)

- Each group gets a tiny uppercase label above the icons (e.g. "FORMAT", "HEADINGS") — rendered as `text-[9px] tracking-widest text-muted uppercase` label, icons below
- Actually on second thought: group labels are optional — use a more compact approach: visual separators between groups with slightly different background zones. Keep single-row but with clear separator pipe `|` dividers and group background highlights. Toolbar height ~36px. This avoids making it too tall.
- Active state: accent blue bg pill, icon in accent color
- Hover state: `var(--color-bg-tertiary)` bg
- Each button has a `title` tooltip

**Context-sensitive behavior:**
- When cursor is inside a code block: show a language selector `<select>` dropdown inline in the toolbar (replaces empty space on right). Use a small styled select with common languages: plaintext, javascript, typescript, python, css, html, sql, bash, json.
- When an image is selected: show image alignment controls inline (Left | Center | Right | Float Left | Float Right) in the toolbar's right area
- These context panels appear/disappear based on `editor.isActive(...)` state

---

### ② Right Panel — Table of Contents + Properties

**Files:**
- New: `src/modules/notes/components/NoteRightPanel.tsx`
- Modified: `src/modules/notes/NotesPage.tsx` (layout)

**Layout change in `NotesPage.tsx`:**
- The main editor area becomes a 3-column layout: `[sidebar] [editor] [right-panel]`
- Right panel width: `240px`, collapses to `0` when hidden
- Right panel toggle button: small `›` / `‹` chevron button on the right edge of the breadcrumb bar
- Panel is shown by default when the note has H1/H2/H3 headings, hidden otherwise (auto-detect)
- State: `const [rightPanelOpen, setRightPanelOpen] = useState(false)` in `NotesPage.tsx` — manually toggleable via chevron button

**`NoteRightPanel.tsx` component:**

Props:
```tsx
interface NoteRightPanelProps {
  editor: ReturnType<typeof useEditor> | null;
  note: Note;
  onNavigateToHeading: (pos: number) => void;
}
```

UI:
- Two tabs: **Contents** | **Info**
- Tab switcher: simple text tabs with underline indicator
- Sticky at top of panel, scrollable content below

**Contents tab:**
- Parse headings from editor document: `editor.getJSON()` → traverse nodes → collect `{ level, text, pos }` for all heading nodes
- Update live via `editor.on('update', ...)` effect
- Render as an indented list:
  - H1: `pl-2 text-sm font-semibold`
  - H2: `pl-4 text-xs`
  - H3: `pl-6 text-xs text-muted`
- Click any heading → `editor.commands.setTextSelection(pos); editor.commands.scrollIntoView()` to jump there
- If no headings: show a placeholder "Add headings to see the table of contents"

**Info tab:**
- Word count: `{note.wordCount ?? 0} words`
- Reading time: `~{Math.max(1, Math.round((note.wordCount ?? 0) / 200))} min read`
- Created: formatted date
- Updated: formatted date (relative if <7 days old: "2 hours ago")
- Tags: show note tags as small pills
- (Backlinks count: `{backlinks.length} backlinks` — just a count, no expand needed here)

**Right panel needs the editor instance** — `NoteEditor` must forward/expose the editor instance upward. Options:
- Add a `onEditorReady: (editor: Editor) => void` callback prop to `NoteEditor`
- Or lift the `useEditor()` call up into `NotesPage` and pass the editor as a prop into `NoteEditor` — **prefer this approach** as it's cleaner

**Refactor plan for editor lifting:**
- Create `src/modules/notes/hooks/useNoteEditor.ts` — contains all the `useEditor(...)` setup and returns `{ editor, triggerFileInput, fileInputRef, ... }`
- `NoteEditor` receives `editor` as a prop instead of creating it internally
- `NotesPage` calls `useNoteEditor(...)` and passes `editor` to both `NoteEditor` and `NoteRightPanel`

---

### ③ Callout / Alert Blocks

**Files:**
- New: `src/modules/notes/extensions/Callout.ts` — TipTap node extension
- Modified: `src/modules/notes/components/NoteEditor.tsx` — register extension
- Modified: `src/modules/notes/components/SlashCommandMenu.tsx` — add callout variants

**TipTap Node definition:**

```ts
// Callout is a block node with an `type` attribute: 'info' | 'warning' | 'success' | 'danger' | 'note'
// Renders as <div data-callout-type="info"> with icon + content
```

- Node name: `callout`
- Attributes: `{ calloutType: { default: 'info' } }` — 'info' | 'warning' | 'success' | 'danger' | 'note'
- Content: `paragraph+` (allows typing inside)
- Group: `block`
- Rendered HTML: `<div data-callout-type="{calloutType}" class="callout">...</div>`
- Add CSS in `NoteEditor`'s inline style or as a `<style>` tag injected into the editor wrapper:

```css
.callout {
  border-radius: 8px;
  padding: 12px 14px;
  margin: 8px 0;
  border-left: 3px solid;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
[data-callout-type="info"] { background: var(--color-accent-soft); border-color: var(--color-accent); }
[data-callout-type="warning"] { background: var(--color-warning-soft); border-color: var(--color-warning); }
[data-callout-type="success"] { background: var(--color-success-soft); border-color: var(--color-success); }
[data-callout-type="danger"] { background: var(--color-danger-soft); border-color: var(--color-danger); }
[data-callout-type="note"] { background: var(--color-bg-tertiary); border-color: var(--color-border-strong); }
```

- Icon (emoji) per type: info → ℹ️, warning → ⚠️, success → ✅, danger → 🚨, note → 📝
- Icon rendered as a non-editable `<span>` before the content

**Slash commands to add:**
- `/callout` → Info callout (default)
- `/info` → Info
- `/warning` → Warning  
- `/success` → Success
- `/danger` → Danger
- `/note` → Note callout

Each slash command: delete the slash trigger text, insert the callout node at cursor.

---

### ④ Two-Column Layout

**Files:**
- New: `src/modules/notes/extensions/Columns.ts` — TipTap node extension
- Modified: `src/modules/notes/components/NoteEditor.tsx` — register
- Modified: `src/modules/notes/components/SlashCommandMenu.tsx` — add command

**Node definition:**
- Parent node: `columns` — renders as `<div class="columns-layout">`
- Child node: `column` — renders as `<div class="column">`
- Default: 2 equal columns (50/50)
- Content: `columns` contains exactly 2+ `column` nodes; `column` contains `block+`

**CSS:**
```css
.columns-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 8px 0; }
.column { min-height: 40px; padding: 4px; border-radius: 4px; }
.column:focus-within { outline: 1px dashed var(--color-border-hover); }
```

**Slash command:** `/2col` or `/columns` → inserts a 2-column layout with placeholder paragraph content in each column

**Note on TipTap v3 columns:** implement as two nested `Paragraph` groups rather than a full custom schema if the custom node approach has issues. Fall back to: insert `<div>` wrapping HTML via `editor.commands.insertContent(html)` if the node extension approach causes schema conflicts.

---

### ⑤ Find & Replace

**Files:**
- New: `src/modules/notes/components/FindReplaceBar.tsx`
- Modified: `src/modules/notes/components/NoteEditor.tsx` — show/hide bar, keyboard shortcut

**Since `@tiptap/extension-search-and-replace` does NOT exist as a package, implement manually using ProseMirror's built-in decorations:**

Use `prosemirror-search` if available, or implement manually:
- On search query change: walk the document, find all text ranges matching the query (case-insensitive)
- Apply decorations via a ProseMirror plugin using `DecorationSet` to highlight matches in yellow
- Track current match index for "next/previous" navigation
- Replace: use `tr.insertText(replacement, matchFrom, matchTo)`

**UI — `FindReplaceBar.tsx`:**
```
[🔍 Find: ___________] [x/n matches] [▲] [▼]   [Replace: ___________] [Replace] [Replace All]   [✕]
```
- Bar appears at the top of the editor area (below toolbar), above the content
- Slides in/out with CSS transition (`translate-y`)
- Keyboard shortcuts: `Ctrl+F` → open/focus find, `Ctrl+H` → open with replace field visible, `Escape` → close
- Match count: "3 of 12 matches" or "No matches"
- Current match highlighted differently (solid accent) vs other matches (soft yellow)

**Keyboard in bar:**
- `Enter` in Find → next match
- `Shift+Enter` → prev match
- `Tab` → focus Replace input

**Integration:**
- Add `showFindReplace` state in `NoteEditor`
- `Ctrl+F` handler on the editor's `keydown`
- Pass ProseMirror plugin as an extension to `useEditor`

---

### ⑥ Table Support

**Install:**
```bash
npm install --legacy-peer-deps @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

**Files:**
- Modified: `src/modules/notes/components/NoteEditor.tsx` — add extensions, table toolbar controls
- Modified: `src/modules/notes/components/SlashCommandMenu.tsx` — add `/table` command

**Extensions to register:**
```ts
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

Table.configure({ resizable: true }),
TableRow,
TableHeader,
TableCell,
```

**Slash command:** `/table` → inserts a 3×3 table with headers

**Table CSS** (add to editor wrapper style tag):
```css
.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.ProseMirror th, .ProseMirror td {
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
  min-width: 80px;
}
.ProseMirror th {
  background: var(--color-bg-tertiary);
  font-weight: 600;
}
.ProseMirror .selectedCell {
  background: var(--color-accent-soft);
}
.column-resize-handle {
  background-color: var(--color-accent);
  bottom: 0;
  pointer-events: none;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
}
```

**Context-sensitive toolbar** (when cursor is inside a table):
- Show table controls in toolbar right area: "Add row ↓", "Add col →", "Del row", "Del col", "Del table"
- These are small text-button pills, not icons, to be readable

---

### ⑦ Focus / Zen Mode

**Files:**
- Modified: `src/modules/notes/NotesPage.tsx` — zen mode state
- Modified: `src/modules/notes/components/NoteEditor.tsx` — zen mode prop

**State:** `const [zenMode, setZenMode] = useState(false)` in `NotesPage`

**When zen mode is ON:**
- Sidebar: `display: none` (pass `zenMode` prop to layout or use a CSS class on the root container)
- Toolbar: hidden
- Breadcrumb: hidden
- Right panel: hidden
- Editor content area: centered, max-w-2xl (narrower, ~680px), more padding top
- A small floating exit button appears bottom-center: `Esc` or click to exit

**Keyboard shortcut:** `Ctrl+Shift+F` — handled at the `NotesPage` level via `useEffect` on `keydown`

**Transition:** CSS transition on sidebar/toolbar opacity + width for smooth feel

**Toolbar zen mode button:** The `⛶` icon in the toolbar (Tools group) toggles zen mode — it calls back up to `NotesPage` via an `onToggleZen` prop

---

### ⑧ Inline Image Alignment Controls

**Files:**
- Modified: `src/modules/notes/components/NoteEditor.tsx` — custom Image extension + floating toolbar

**When an image node is selected in TipTap:**
- A small floating toolbar appears above the image: `[← Left] [↔ Center] [→ Right] [Float L] [Float R] [🗑 Remove]`
- This is a custom bubble menu that shows only when `editor.isActive('image')`

**Implementation:**
- Extend the Image extension to support `align` attribute: `'left' | 'center' | 'right' | 'float-left' | 'float-right'`
- Custom `NodeView` renders `<figure>` with appropriate class based on `align`
- CSS classes:
  ```css
  .image-align-left { margin-right: auto; display: block; }
  .image-align-center { margin: 0 auto; display: block; }
  .image-align-right { margin-left: auto; display: block; }
  .image-align-float-left { float: left; margin: 0 16px 8px 0; }
  .image-align-float-right { float: right; margin: 0 0 8px 16px; }
  ```
- Floating toolbar: use `BubbleMenu` from `@tiptap/react` configured to show only on image selection
  ```tsx
  <BubbleMenu editor={editor} shouldShow={({ editor }) => editor.isActive('image')}>
    ... alignment buttons ...
  </BubbleMenu>
  ```
- Remove button: `editor.chain().focus().deleteSelection().run()`

---

### ⑩ Divider Style Options

**Files:**
- Modified: `src/modules/notes/extensions/` — extend horizontal rule, or handle in CSS
- Modified: `src/modules/notes/components/SlashCommandMenu.tsx`

**Approach:** Add 3 slash commands:
- `/divider` → standard HR (`---`)
- `/divider-dots` → inserts a styled paragraph node with content `⋆ ⋆ ⋆` + centered style (class `divider-ornamental`)
- `/divider-wave` → inserts `〰〰〰` centered

For the ornamental dividers, insert a paragraph with the text content + CSS class for centering. These don't need a custom node — just a styled paragraph.

Standard HR CSS improvement:
```css
.ProseMirror hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 16px 0;
}
```

---

### ⑪ Word Count Status Bar

**Files:**
- Modified: `src/modules/notes/components/NoteEditor.tsx` — add status bar at bottom

**UI:** A slim bar at the very bottom of the editor area (below the `EditorContent`):
```
248 words · ~2 min read · Last saved 10:45 AM
```

**Implementation:**
- `wordCount` derived from `editor.getText().split(/\s+/).filter(Boolean).length` — update in `onUpdate` callback
- Track last save time: update a `lastSaved` state whenever `onUpdate` is called (debounced)
- Reading time: `Math.max(1, Math.round(wordCount / 200))` minutes
- Format: `"Just now"` if <30s ago, otherwise `"HH:MM AM/PM"`

**Styling:**
```tsx
<div
  className="shrink-0 px-4 py-1 text-[11px] flex items-center gap-2"
  style={{
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-primary)',
  }}
>
  {wordCount} words · ~{readingTime} min read · Saved {lastSaved}
</div>
```

---

### ⑫ Sticky Note Inline Block

**Files:**
- New: `src/modules/notes/extensions/StickyNote.ts`
- Modified: `src/modules/notes/components/NoteEditor.tsx` — register extension
- Modified: `src/modules/notes/components/SlashCommandMenu.tsx` — add command

**Node:**
- Name: `stickyNote`
- Attributes: `{ color: { default: 'yellow' } }` — 'yellow' | 'pink' | 'blue' | 'green' | 'lavender'
- Renders as a div with a sticky note visual: slight drop shadow, slightly warm background, subtle rotation effect
- Content: `paragraph+`
- Group: `block`

**Colors (CSS vars or hardcoded for this component):**
```
yellow:   #fef3c7 (bg) / #d97706 (border)
pink:     #fce7f3 / #db2777
blue:     #dbeafe / #2563eb
green:    #d1fae5 / #059669
lavender: #ede9fe / #7c3aed
```

Use light-mode-specific colors (for dark mode, use transparency + border).

**CSS:**
```css
.sticky-note {
  border-radius: 4px;
  padding: 14px 16px;
  margin: 8px 0;
  box-shadow: 2px 3px 8px rgba(0,0,0,0.12);
  font-family: inherit;
  position: relative;
}
.sticky-note::before {
  content: '📌';
  position: absolute;
  top: -8px;
  left: 12px;
  font-size: 14px;
}
```

**Slash commands:**
- `/sticky` → yellow sticky note (default)
- `/sticky-pink` → pink
- `/sticky-blue` → blue
- `/sticky-green` → green

**Color picker on the sticky note:** A small floating color picker appears when the sticky note is focused — 5 color swatches in a row above the block. Click to change color (update the node's `color` attribute).

---

## Summary of Files to Create/Modify

### New files:
- `src/modules/notes/extensions/Callout.ts`
- `src/modules/notes/extensions/Columns.ts`
- `src/modules/notes/extensions/StickyNote.ts`
- `src/modules/notes/components/NoteRightPanel.tsx`
- `src/modules/notes/components/FindReplaceBar.tsx`
- `src/modules/notes/hooks/useNoteEditor.ts` (if editor lifting approach taken)

### Modified files:
- `src/modules/notes/components/NoteEditor.tsx` — major changes (toolbar redesign, all extensions, find/replace, status bar, zen mode prop, image alignment)
- `src/modules/notes/components/SlashCommandMenu.tsx` — add callout, columns, table, divider variants, sticky note commands
- `src/modules/notes/NotesPage.tsx` — 3-column layout, right panel, zen mode state
- `package.json` (via npm install) — table extensions

---

## Execution Order (recommended)

1. Install table packages
2. Lift editor into `useNoteEditor` hook (or add `onEditorReady` callback) — prerequisite for right panel
3. Build `NoteRightPanel` + integrate into `NotesPage` layout
4. Build `Callout` extension + slash commands
5. Build `Columns` extension + slash command
6. Build table support + slash command + context toolbar
7. Build `FindReplaceBar` + ProseMirror search plugin
8. Build image alignment (extended Image node + BubbleMenu)
9. Toolbar ribbon redesign (grouping, context-sensitive sections)
10. Zen mode
11. Status bar (word count)
12. Divider style options
13. Sticky note extension
14. Full TypeScript check: `npx tsc --noEmit`
15. Git commit

---

## Notes on TipTap v3 Compatibility

- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell` all exist at v3.21.0 ✅
- `@tiptap/extension-search-and-replace` does NOT exist — must implement manually with ProseMirror decorations ✅
- `BubbleMenu` is available from `@tiptap/react` ✅
- Custom node extensions follow TipTap v3 API (not v1/v2 syntax) — use `Node.create({...})` pattern ✅
- `editor.commands.insertContentAt()` and `editor.commands.insertContent()` available for programmatic insert ✅

---

## Git Commit Format
```
feat(notes): editor overhaul — toolbar ribbon, TOC panel, callouts, columns, tables, find/replace, zen mode, image alignment, sticky notes, status bar
```
