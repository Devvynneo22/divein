# Flashcard Stats Dashboard — Done

**Completed by:** subagent `flashcard-stats`  
**Date:** 2026-03-30

---

## What Was Built

### New file: `src/modules/flashcards/components/DeckStats.tsx`

Full statistics dashboard component with 5 sections:

#### Section 1 — Summary Row
Four stat cards in a responsive row:
- **Total Cards** — raw count
- **Due Today** — cards where `nextReview <= today`
- **Mastered** — cards with `status === 'review' && intervalDays >= 21`
- **Avg Ease** — mean `easeFactor` formatted to 1 decimal place

#### Section 2 — Card Maturity Donut Chart (pure SVG)
- Segments: New / Learning / Young / Mature / Suspended
- SVG donut using `strokeDasharray` trick (circumference ≈ 314.16, r=50, strokeWidth=20)
- Interactive: hover highlights segment + dims legend rows
- Legend: colored dot + label + count + percentage
- Colors: New=#6366f1, Learning=#f59e0b, Young=#22c55e, Mature=#10b981, Suspended=#94a3b8

#### Section 3 — 14-Day Review Forecast (pure SVG bar chart)
- Uses `date-fns` `addDays` + `format` to compute each day's due count
- Bars proportional to max count, min height 2px
- Today's bar uses deck accent color; others use CSS vars
- Count label above bar (when > 0)
- Hover tooltip: "Apr 3: 12 cards" (fixed-positioned)
- Day-of-week labels on X axis

#### Section 4 — Study Activity Heatmap (12 weeks)
- Groups cards by `lastReviewed` date
- 7 columns (Mon–Sun) × 12 rows (weeks), 10px squares, 2px gaps, 3px border-radius
- Color levels: 0 = `--color-bg-tertiary`, 1–2 = 30% opacity, 3–5 = 65%, 6+ = 100% deck color
- Month labels on left, day-of-week labels on top
- Hover shows tooltip with date + count (fixed position)

#### Section 5 — Retention Rate
- Proxy: `(cards where easeFactor > 2.0) / total * 100`
- Large % number + animated horizontal bar
- Bar color: green ≥80%, amber ≥60%, red <60%
- Contextual encouragement text

---

### Modified file: `src/modules/flashcards/FlashcardsPage.tsx`

- Added `BarChart2` to lucide-react imports
- Added `DeckStats` component import (aliased type `DeckStatsData` to avoid name clash)
- Updated `DeckViewProps.initialView` to `'cards' | 'study' | 'stats'`
- Updated `FlashcardsPage` state `initialDeckView` type to include `'stats'`
- Added **📊 Stats** toggle button in deck header (active state highlighted with deck color)
- Wired `view === 'stats'` branch in content area: renders `<DeckStats deck={deck} cards={cards} deckColor={deck.color} />`
- Study/Cards toggle preserved: clicking Study from Stats view works; back to Cards works

---

## Design Notes
- All colors via CSS vars — dark mode compatible
- No new npm packages (uses existing `date-fns`)
- Pure SVG charts — no chart libraries
- Hover interactions use onMouseEnter/Leave inline style pattern (per style rules)
- TypeScript strict — zero `any` usage
- `npx tsc --noEmit --skipLibCheck` passes with 0 errors
