# Notes Editor Fix & Ribbon Redesign — Session 22b

**Date:** 2026-03-30  
**Goal:** Fix all visual/functional bugs, replace flat toolbar with a proper PowerPoint-style tabbed ribbon.  
**Quality bar:** Top 1% — must look and feel like a premium product. Question every decision: "Is this good enough?"

---

## Project Location
`C:\Users\immer\OneDrive\Desktop\divein`

## Hard Constraints
- Zero TypeScript errors (`npx tsc --noEmit` must pass clean after all changes)
- Use CSS variables (`var(--color-*)`) everywhere — no hardcoded hex in JSX style props
- Both light and dark themes must work
- Do NOT modify: `src/styles/globals.css`, `src/app/Sidebar.tsx`, `src/app/Layout.tsx`, `src/app/StatusBar.tsx`, `src/app/App.tsx`, `src/modules/dashboard/DashboardPage.tsx`, `src/shared/stores/appSettingsStore.ts`, anything in `src/shared/lib/`, `src/shared/types/`, `src/shared/stores/`
- git commit all changes at end

---

## FIX 1 — Cover Banner to Icon Gap

**File:** `src/modules/notes/components/NoteHeader.tsx`

**Problem:** After the cover banner ends, there's a large white gap before the page icon. It looks disconnected.

**Fix — Notion-style icon overlap:**
The page icon area should visually "emerge" from the cover banner, overlapping its bottom edge.

Change the content wrapper's `paddingTop` and icon positioning:

```tsx
// Current (broken):
<div className="px-8 pb-6 max-w-3xl mx-auto w-full" style={{ paddingTop: note.coverColor ? 24 : 48 }}>

// Fixed:
<div className="px-8 pb-6 w-full" style={{ 
  paddingTop: note.coverColor ? 0 : 48,
  maxWidth: 768  // left-aligned, not mx-auto
}}>
```

When there IS a cover:
- The icon wrapper should have `marginTop: -32px` (negative, to overlap the cover bottom)
- Add `position: 'relative'` and `zIndex: 1` to the icon wrapper so it sits above the banner
- Add a subtle `2px` white/bg-primary border on the icon button to separate it from the banner visually

When there IS NO cover:
- Keep `paddingTop: 48` as before

The visual result: icon appears to "float" out of the cover, half-overlapping the banner's bottom edge. This is exactly how Notion handles it.

**Also fix:** Remove `mx-auto` from the content wrapper. Left-align the content (it starts at paddingLeft: 32px from the edge, giving a Notion-style left-anchored layout rather than centered).

---

## FIX 2 — Layout: Left-Aligned Content, Fix Right-Side Real Estate

**Files:** `src/modules/notes/components/NoteEditor.tsx`, `src/modules/notes/NotesPage.tsx`

**Problem 1:** Editor content is `max-w-3xl mx-auto` — centered on wide screens, leaving large blank margins on both sides. Wasted space.

**Fix:** Change the editor content wrapper to left-aligned:
```tsx
// In NoteEditor.tsx, find the editor content wrapper div:
// Current:
<div className="mx-auto py-8" style={{ maxWidth: zenMode ? 680 : 768, paddingLeft: 32, paddingRight: 32 }}>

// Fixed:
<div className="py-8" style={{ maxWidth: zenMode ? 680 : 800, paddingLeft: 48, paddingRight: 48 }}>
// No mx-auto. Left-anchored. 48px padding on both sides for breathing room.
```

**Problem 2:** `NoteRightPanel` auto-show/hide based on headings is too aggressive — it keeps toggling as the user types. Remove the auto-show behavior.

**Fix in `NotesPage.tsx`:** Remove the `useEffect` that auto-detects headings and toggles `rightPanelOpen`. The right panel should be manual-only. Keep the initial state as `false`. User can open it with the chevron toggle.

**Problem 3:** The right panel toggle chevron is confusing — `ChevronLeft` when panel is closed means "there's something to the right" which is backwards.

**Fix:** When panel is CLOSED, show `ChevronLeft` (< means "expand left panel from right"). Actually use a different icon — use `PanelRight` icon from lucide (or `LayoutPanelLeft`). Better yet: use a simple `⊞` or a sidebar panel icon. Or use text: a small button with text "TOC" that opens the panel. Much clearer.

Change the toggle button to:
```tsx
<button
  onClick={() => setRightPanelOpen((v) => !v)}
  title={rightPanelOpen ? 'Hide outline' : 'Show outline'}
  style={{ ... }}
>
  <span style={{ fontSize: 11, fontWeight: 500 }}>
    {rightPanelOpen ? '⊟ Outline' : '⊞ Outline'}
  </span>
</button>
```

---

## FIX 3 — Complete Ribbon Redesign (PowerPoint-Style)

**File:** Create new `src/modules/notes/components/NoteEditorRibbon.tsx`  
**File:** Modify `src/modules/notes/components/NoteEditor.tsx` — replace the flat toolbar section with `<NoteEditorRibbon>`

This is the most important fix. The ribbon must be:
- Tabbed (Home | Insert | View)
- Context-sensitive tabs appear automatically: **Table** tab when cursor is in a table, **Image** tab when an image is selected
- Each tab has grouped buttons with labels
- The entire ribbon body (below the tab bar) can be collapsed/expanded
- Premium feel: clean typography, proper spacing, subtle shadows

### Ribbon Dimensions & Structure

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Home │ Insert │ View │ [Table] │ [Image]    (context tabs)          ⌄ (hide ribbon) │  ← 30px tab bar
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ←  →  │  B  I  U  S  ⋆  A▾  │  H1  H2  H3  Aa  │  ≡  ≡☑  "  {}  ─  │  🔍  🧠  ⛶  │  ← 56px content
│  Edit   │       Format         │     Paragraph     │      Blocks        │    Tools   │  ← 14px labels
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Total ribbon height: **30px (tabs) + 56px (icons) + 14px (labels) + borders = ~102px**  
Collapsed height: **30px (tab bar only)**

### Tab Bar Design
- Height: 30px
- Background: `var(--color-bg-primary)`
- Border-bottom: `1px solid var(--color-border)` (only when ribbon is expanded)
- Tabs are plain text buttons: `font-size: 12px`, `font-weight: 500`, `padding: 0 12px`
- Active tab: subtle bottom border in accent color, text is primary color
- Inactive tabs: muted text, no underline
- Context tabs (Table, Image): only appear when relevant — use accent blue background pill to distinguish them: `background: var(--color-accent-soft)`, `color: var(--color-accent)`, slight border
- Collapse toggle: a `^` / `v` chevron button, far right of tab bar, 28px × 28px

### Ribbon Content Area Design
- Height: 70px (when expanded)
- Background: `var(--color-bg-secondary)` (slightly offset from main bg)
- Border-bottom: `1px solid var(--color-border)`
- Smooth height transition: CSS `max-height` transition 150ms ease
- Content: a row of groups, each group is a `flex-col` container with icons on top, label at bottom

### Group Design
Each group:
```
[icon] [icon] [icon]   ← flex-row of buttons, centered
     GROUP LABEL       ← 10px, uppercase, tracking-wide, muted, text-center
```
- Group container: `flex flex-col items-center justify-between` with `padding: 8px 6px 4px`
- Group label: `font-size: 10px`, `text-transform: uppercase`, `letter-spacing: 0.06em`, `color: var(--color-text-muted)`, bottom of the group
- Group separator: `1px solid var(--color-border)` vertical line, `height: 60%`, `align-self: center`, `margin: 0 2px`

### Icon Button Design
- Size: `28px × 28px`
- Icon: `15px`
- Border-radius: `5px`
- Normal state: transparent bg, `var(--color-text-muted)` color
- Hover: `var(--color-bg-tertiary)` bg, `var(--color-text-primary)` color
- Active/toggled: `var(--color-accent-soft)` bg, `var(--color-accent)` color
- Transition: 100ms
- `title` attribute for tooltip

### HOME Tab Groups

**Group "Edit"** (label: "EDIT"):
- Undo (`↩` icon or Undo from lucide, size 15)
- Redo (`↪` icon or Redo from lucide)

**Group "Format"** (label: "FORMAT"):
- Bold (`B`, `font-weight: 700`, text instead of icon — more authentic)
- Italic (`I`, `font-style: italic`, text)
- Underline (`U`, text with underline CSS)
- Strikethrough (`S`, text with line-through CSS)
- Highlight (`⋆` or Highlighter icon)
- Text color: a button showing `A` with a colored underline bar (like Word). Click → shows color swatch popover.

**Group "Paragraph"** (label: "PARAGRAPH"):  
- H1 button: shows "H1" text, `font-size: 13px font-weight: 700`
- H2 button: shows "H2" text
- H3 button: shows "H3" text
- Normal text button: shows "¶" or "Aa" text

**Group "Structure"** (label: "STRUCTURE"):
- Bullet list (• icon or List lucide)
- Ordered list (1. icon or ListOrdered lucide)
- Task list (☐ or CheckSquare lucide)
- Blockquote (❝ or Quote lucide)

**Group "Code"** (label: "CODE"):
- Code block (`</>` or Code2 lucide)

**Group "Tools"** (label: "TOOLS"):
- Find & Replace (Search lucide, toggles find bar)
- Flashcard (Brain lucide, only enabled when text is selected — show in muted if not)
- Zen mode (Maximize2 lucide)

---

### INSERT Tab Groups

**Group "Media"** (label: "MEDIA"):
- Image (ImageIcon lucide — triggers file input)
- Emoji (SmilePlus lucide — opens emoji picker)

**Group "Tables"** (label: "TABLES"):
- Table (TableIcon lucide) — inserts 3×3 table  
- 2 Columns (Columns2 lucide) — inserts column layout

**Group "Blocks"** (label: "BLOCKS"):
- Divider (Minus lucide) — plain HR
- Divider ⋆ — ornamental (clicking inserts `⋆ ⋆ ⋆` divider)

**Group "Callouts"** (label: "CALLOUTS"):
5 small buttons in a row, each shows the emoji + a colored left border swatch:
- ℹ️ Info — accent blue
- ⚠️ Warn — warning yellow  
- ✅ OK — success green
- 🚨 Danger — danger red
- 📝 Note — neutral
These buttons are slightly smaller (24×24) to fit 5 in a row.

**Group "Notes"** (label: "NOTES"):
- 📌 Sticky (yellow) 
- 📌 Pink sticky
- 📌 Blue sticky

---

### VIEW Tab Groups

**Group "Panels"** (label: "PANELS"):
- Outline panel toggle (right panel) — shows `⊞ Outline` text-button, active when panel is open

**Group "Focus"** (label: "FOCUS"):
- Zen mode toggle

---

### TABLE Tab (context — only shows when editor.isActive('table'))

**Group "Rows"** (label: "ROWS"):
- Add row above (↑+ icon or small text button)
- Add row below (↓+ icon)
- Delete row (✕ icon)

**Group "Columns"** (label: "COLUMNS"):
- Add col left
- Add col right
- Delete column

**Group "Table"** (label: "TABLE"):
- Merge cells
- Delete table

For this tab, use text-label buttons instead of icons for clarity: "Add ↑", "Add ↓", "Del row", "Add →", "Add ←", "Del col", "Delete table" — all small pill buttons `text-[11px] px-2 py-1 rounded`.

---

### IMAGE Tab (context — only shows when editor.isActive('image'))

**Group "Align"** (label: "ALIGN"):
- Left (AlignLeft)
- Center (AlignCenter) 
- Right (AlignRight)

**Group "Float"** (label: "FLOAT"):
- Float left
- Float right

**Group "Image"** (label: "IMAGE"):
- Remove image (Trash2, in danger color)

---

### Ribbon Component Implementation

Create `src/modules/notes/components/NoteEditorRibbon.tsx`:

```tsx
// Props interface:
interface NoteEditorRibbonProps {
  editor: Editor;
  triggerFileInput: () => void;
  onShowEmojiPicker: () => void;
  showFindReplace: boolean;
  onToggleFindReplace: () => void;
  zenMode: boolean;
  onToggleZen: () => void;
  rightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  hasSelection: boolean;
  onCreateFlashcard: () => void;
  showEmojiPicker: boolean;
}
```

State inside the component:
- `activeTab: 'home' | 'insert' | 'view' | 'table' | 'image'` — default 'home'
- `collapsed: boolean` — default false
- `showColorPicker: boolean`

The active tab auto-follows context: add a `useEffect` that watches `editor.state.selection`:
```ts
useEffect(() => {
  if (!editor) return;
  const updateContextTab = () => {
    if (editor.isActive('table')) {
      setActiveTab('table');
    } else if (editor.isActive('image')) {
      setActiveTab('image');
    }
    // Don't switch away from home/insert/view when not in context
    // Only switch TO context tabs when entering those elements
  };
  editor.on('selectionUpdate', updateContextTab);
  return () => editor.off('selectionUpdate', updateContextTab);
}, [editor]);
```

The tab bar and collapse toggle:
```tsx
<div className="flex items-center" style={{ height: 30, borderBottom: collapsed ? '1px solid var(--color-border)' : 'none', backgroundColor: 'var(--color-bg-primary)' }}>
  {/* Tab buttons */}
  {/* Collapse toggle — far right */}
  <button onClick={() => setCollapsed(v => !v)} style={{ marginLeft: 'auto' }}>
    {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
  </button>
</div>
```

The content area uses `max-height` transition:
```tsx
<div style={{
  maxHeight: collapsed ? 0 : 84,
  overflow: 'hidden',
  transition: 'max-height 150ms ease',
  backgroundColor: 'var(--color-bg-secondary)',
  borderBottom: collapsed ? 'none' : '1px solid var(--color-border)',
}}>
  {/* Tab content */}
</div>
```

---

### Update NoteEditor.tsx

Replace the entire old toolbar `<div>` (the `!zenMode && <div className="flex items-center...">`) with:

```tsx
{!zenMode && (
  <NoteEditorRibbon
    editor={editor}
    triggerFileInput={triggerFileInput}
    onShowEmojiPicker={() => setShowEmojiPicker(v => !v)}
    showFindReplace={showFindReplace}
    onToggleFindReplace={() => { setShowFindReplace(v => !v); setShowReplaceField(false); }}
    zenMode={zenMode}
    onToggleZen={() => onToggleZen?.()}
    rightPanelOpen={rightPanelOpen}
    onToggleRightPanel={onToggleRightPanel}
    hasSelection={hasSelection}
    onCreateFlashcard={handleCreateFlashcard}
    showEmojiPicker={showEmojiPicker}
  />
)}
```

Update `NoteEditorProps` to include:
- `rightPanelOpen: boolean`
- `onToggleRightPanel: () => void`

Update `NotesPage.tsx` to pass these new props to `NoteEditor`.

---

## FIX 4 — Sticky Note Insertion Bug (Replaces Image)

**Files:** `src/modules/notes/extensions/StickyNote.ts`, `src/modules/notes/extensions/Callout.ts`, `src/modules/notes/extensions/Columns.ts`

**Problem:** When inserting a sticky note (or callout/columns), if an image is currently selected in the editor, the `insertContent` command replaces the selected image (because the image node is in the selection and insertContent replaces the selection).

**Fix:** In each extension's `insertContent` command, first move the cursor past the selection before inserting:

```ts
// In StickyNote.addCommands():
insertStickyNote: (color: StickyNoteColor = 'yellow') => ({ chain, state }) => {
  // If current selection contains a block node (like an image), move past it first
  const { $from, $to } = state.selection;
  const isNodeSelection = $from.pos !== $to.pos && !state.selection.empty;
  
  return chain()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        // Move selection to after the current position
        const pos = Math.max($from.pos, $to.pos);
        tr.setSelection(state.selection.constructor.near(tr.doc.resolve(pos)));
        dispatch(tr);
      }
      return true;
    })
    .insertContent({
      type: this.name,
      attrs: { color },
      content: [{ type: 'paragraph' }],
    })
    .run();
},
```

Actually, a simpler approach: use `insertContentAt` with an explicit position after the current selection end:

```ts
insertStickyNote: (color: StickyNoteColor = 'yellow') => ({ commands, state }) => {
  const { to } = state.selection;
  return commands.insertContentAt(to, {
    type: this.name,
    attrs: { color },
    content: [{ type: 'paragraph' }],
  });
},
```

Apply the same fix to `insertCallout` in `Callout.ts` and `insertColumns` in `Columns.ts`.

Also apply the same fix to the toolbar's `insertTable` call in `NoteEditorRibbon.tsx`:
```tsx
// Instead of: editor.chain().focus().insertTable(...).run()
// Use:
editor.chain().focus().command(({ tr, state, dispatch }) => {
  if (dispatch) {
    const { to } = state.selection;
    tr.setSelection(/* near after to */);
    dispatch(tr);
  }
  return true;
}).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
```

Even simpler: before any block insert, always do `editor.commands.selectParentNode()` + `editor.commands.focus()` to deselect the current block node, OR use:
```ts
// The simplest correct fix: insertContentAt position = selection end
const { to } = editor.state.selection;
editor.chain().focus().insertContentAt(to, { type: 'stickyNote', ... }).run();
```

Apply this pattern consistently across all block insertions (callout, columns, stickyNote, table).

---

## FIX 5 — Sticky Note is "Stuck" (Can't Type In It)

**File:** `src/modules/notes/extensions/StickyNote.ts`, `EDITOR_STYLES` in `NoteEditor.tsx`

**Problem:** The sticky note's `::before` pseudo-element with `position: absolute; top: -8px` and the `position: relative` on the note itself is causing click events to be absorbed incorrectly, OR the node is somehow not properly editable.

**Fix 1:** Remove the `::before` pseudo-element trick (it causes issues). Instead, render the 📌 icon as part of the node's HTML output:

In `StickyNote.ts`, update `renderHTML` to include a pin icon as an absolutely-positioned element:
```ts
renderHTML({ HTMLAttributes }) {
  const color = (HTMLAttributes['data-sticky-color'] as StickyNoteColor) ?? 'yellow';
  return [
    'div',
    mergeAttributes(
      { class: `sticky-note sticky-note--${color}`, 'data-sticky-color': color },
      HTMLAttributes,
    ),
    0,  // content goes directly in the div
  ];
}
```

Remove the `::before` CSS from `EDITOR_STYLES`. Instead, add the 📌 as a visible part of the sticky note via a top bar:

```css
.sticky-note {
  border-radius: 6px;
  padding: 12px 14px;
  margin: 10px 0;
  box-shadow: 2px 3px 10px rgba(0,0,0,0.10);
  position: relative;
  border: 1px solid;
}
/* No ::before pseudo-element */
```

And add a visual "header bar" at the top of the sticky note by using CSS `::before` on the BORDER-TOP only (not a floating icon):
```css
.sticky-note::before {
  content: '';
  display: block;
  height: 3px;
  border-radius: 4px 4px 0 0;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  opacity: 0.6;
}
.sticky-note--yellow::before { background: #d97706; }
.sticky-note--pink::before { background: #db2777; }
/* etc */
```

This gives a colored top accent bar (like a sticky note's folded top) without any click-event interference.

**Fix 2:** Make sticky note `isolating: false` (already default) and ensure `defining: true` is set so the cursor doesn't jump out unexpectedly.

**Fix 3:** Add `white-space: pre-wrap` to `.sticky-note p` to ensure text wraps properly inside.

---

## FIX 6 — Image Floating Toolbar Positioning

**File:** `src/modules/notes/components/NoteEditor.tsx` — `ImageFloatingToolbar` component

**Problem:** The current implementation uses `coordsAtPos` which returns coordinates relative to the viewport, but the container might be scrolled. Also, the toolbar appears ABOVE the image using `top: coords.top - 50` which may position it outside the visible area.

**Fix:** Remove the separate `ImageFloatingToolbar` component entirely. The image alignment controls are now in the **Image context tab** of the ribbon. When an image is selected, the ribbon auto-switches to the Image tab and shows all alignment/float/remove controls there.

Remove `ImageFloatingToolbar` component. Remove `{isImageSelected && <ImageFloatingToolbar ... />}` from the render. Remove `ImageAlignControls` from the old toolbar (since it's now in the ribbon).

---

## FIX 7 — Text Color Picker (Move into Ribbon)

The text color picker (the `A▾` button with a floating swatch grid) needs to work inside the new ribbon. In `NoteEditorRibbon.tsx`, implement the color picker as a popover within the Format group.

The `A▾` button in the Format group: 
- Shows `A` with a colored bottom bar `(reflecting current color)` 
- Click → shows a popover with `9 color swatches + Reset` 
- Popover uses `position: absolute`, `z-index: 100`, drops down from the button

---

## Summary of Files to Change

### Create:
- `src/modules/notes/components/NoteEditorRibbon.tsx` — full ribbon component

### Modify:
- `src/modules/notes/components/NoteEditor.tsx` — replace toolbar with `<NoteEditorRibbon>`, remove `ImageFloatingToolbar`, remove `ImageAlignControls`, remove `TableControls`, update props interface
- `src/modules/notes/components/NoteHeader.tsx` — fix cover→icon gap (overlap effect, remove mx-auto from content)
- `src/modules/notes/NotesPage.tsx` — remove heading-auto-detect for right panel, update outline toggle button UI, pass new props to NoteEditor
- `src/modules/notes/extensions/StickyNote.ts` — fix insertion to use `insertContentAt(to, ...)`, fix ::before CSS
- `src/modules/notes/extensions/Callout.ts` — fix insertion to use `insertContentAt(to, ...)`
- `src/modules/notes/extensions/Columns.ts` — fix insertion to use `insertContentAt(to, ...)`
- `EDITOR_STYLES` in `NoteEditor.tsx` — fix sticky note CSS (remove broken ::before, add colored top accent bar)

---

## Final Checklist Before Commit

1. `npx tsc --noEmit` — zero errors
2. Visually verify: banner → icon overlap (no gap)
3. Visually verify: ribbon shows tabs + groups with labels
4. Visually verify: ribbon collapses when clicking `^`  
5. Visually verify: Table tab appears when cursor is in table
6. Visually verify: Image tab appears when image is selected
7. Verify: inserting sticky note when image is selected does NOT delete the image
8. Verify: can type inside a sticky note after inserting
9. Verify: Find & Replace bar appears (Ctrl+F)
10. Dark mode: check all ribbon colors, sticky notes, callouts look correct

---

## Git Commit Message
```
fix(notes): ribbon redesign (tabbed, grouped, collapsible), fix cover gap, fix sticky note insertion, fix image controls
```
