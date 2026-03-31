# DiveIn Overhaul - Agent Reference

## Project Stack
- Electron + React 18 + TypeScript
- TailwindCSS (but use inline styles with CSS vars — see below)
- @tanstack/react-query for data
- Drizzle ORM + SQLite
- lucide-react for icons
- date-fns for dates

## CSS Design System (inline styles only, no Tailwind color classes)
```
--color-bg-primary        // page background
--color-bg-secondary      // card/panel background
--color-bg-elevated       // elevated card (slightly lighter)
--color-bg-tertiary       // subtle fill (hover states)
--color-text-primary      // headings
--color-text-secondary    // body text
--color-text-muted        // labels, placeholders
--color-accent            // primary CTA blue
--color-accent-hover      // darker accent
--color-accent-soft       // very light accent tint (0.1 opacity)
--color-border            // default border
--color-border-hover      // hovered border
--color-success / --color-success-soft
--color-warning / --color-warning-soft
--color-danger  / --color-danger-soft
--shadow-sm / --shadow-md / --shadow-lg / --shadow-popup
```

## Style Rules (CRITICAL — violation will break visual consistency)
1. NEVER use Tailwind `bg-*`, `text-*`, `border-*` color classes — always use inline style with CSS vars
2. Use Tailwind for layout only: flex, grid, gap, padding, rounded, overflow, etc.
3. Hover states: use onMouseEnter/onMouseLeave to toggle inline styles (same pattern as existing code)
4. Transitions: `transition-all duration-200` or inline `transition: 'all 0.2s ease'`
5. Border radius: rounded-xl (12px), rounded-2xl (16px), rounded-3xl (24px) for cards
6. All interactive elements need hover feedback

## App Architecture
- `src/modules/projects/` — Projects module (ProjectsPage.tsx + components/ + hooks/)
- `src/modules/flashcards/` — Flashcards module (FlashcardsPage.tsx + components/ + hooks/)
- `src/shared/types/` — TypeScript interfaces (don't change without coordinating)
- `src/shared/lib/` — Service layer (read only)

## Key existing types

### Project
```typescript
interface Project {
  id: string; name: string; description: string | null;
  color: string | null; // CSS gradient or hex
  icon: string | null;  // emoji
  status: 'active' | 'on_hold' | 'completed' | 'archived';
  sortOrder: number;
  createdAt: string; updatedAt: string;
}
interface ProjectStats {
  totalTasks: number; completedTasks: number;
  totalNotes: number; totalTimeSeconds: number;
}
```

### Flashcard
```typescript
interface Deck {
  id: string; name: string; description: string | null;
  color: string | null; // hex only e.g. '#3b82f6'
  newCardsPerDay: number; tags: string[];
  createdAt: string; updatedAt: string;
}
interface Card {
  id: string; deckId: string; front: string; back: string;
  tags: string[]; intervalDays: number; repetitions: number;
  easeFactor: number; nextReview: string; lastReviewed: string | null;
  status: 'new' | 'learning' | 'review' | 'suspended';
  createdAt: string; updatedAt: string;
}
interface DeckStats {
  totalCards: number; newCards: number; learningCards: number;
  reviewCards: number; dueToday: number;
}
type UIRating = 'again' | 'hard' | 'good' | 'easy';
const UI_RATING_QUALITY: Record<UIRating, ReviewQuality> = {
  again: 0, hard: 3, good: 4, easy: 5,
};
```

## Existing hooks (don't break these interfaces)
- useProjects(showArchived) → Project[]
- useProject(id) → Project
- useProjectStats(id) → ProjectStats
- useProjectTasks(id) → Task[]
- useProjectNotes(id) → Note[]
- useCreateProject, useUpdateProject, useDeleteProject, useArchiveProject, useUnarchiveProject
- useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone

- useDecks() → Deck[]
- useCards(deckId) → Card[]
- useDeckStats(deckId) → DeckStats
- useStudyQueue(deckId) → Card[]
- useReviewCard() → mutation({cardId, quality})
- useCreateDeck, useUpdateDeck, useDeleteDeck
- useCreateCard, useUpdateCard, useDeleteCard

## Benchmark aesthetic: Notion, Linear, Cron
- Clean, airy but information-dense
- Subtle depth (shadows, borders)
- Emoji-rich for visual anchoring
- Smooth micro-interactions
- Dark mode aware (all via CSS vars)
