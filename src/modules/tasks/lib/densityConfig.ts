// Re-export so consumers can import TaskDensity from one place
export type TaskDensity = 'compact' | 'default' | 'spacious';

export interface DensityConfig {
  card: {
    padding: number;        // px (used as uniform padding)
    titleSize: number;      // px
    metaSize: number;       // px
    gap: number;            // gap between cards in a column
    borderRadius: number;   // px
    minHeight: number;      // px (0 = no minimum)
    showCover: boolean;     // whether to show cover images
    titleLines: number;     // max lines for title truncation (WebkitLineClamp)
    showTags: boolean;      // show tag pills on card
    showDescription: boolean; // show description snippet
  };
  list: {
    rowHeight: number;      // px
    fontSize: number;       // px
    padding: string;        // CSS padding shorthand
    showTags: boolean;
    showDueDate: boolean;
    showPriority: boolean;
  };
  column: {
    width: number;          // px — board column width
    headerSize: number;     // px — column header font size
    gap: number;            // px — gap between board columns
  };
}

// ── Compact: Linear-style dense ──────────────────────────────────────────────

const COMPACT: DensityConfig = {
  card: {
    padding: 8,
    titleSize: 13,
    metaSize: 11,
    gap: 4,
    borderRadius: 6,
    minHeight: 0,
    showCover: false,
    titleLines: 1,
    showTags: false,
    showDescription: false,
  },
  list: {
    rowHeight: 36,
    fontSize: 13,
    padding: '4px 12px',
    showTags: false,
    showDueDate: true,
    showPriority: true,
  },
  column: {
    width: 260,
    headerSize: 12,
    gap: 8,
  },
};

// ── Default: current styling ──────────────────────────────────────────────────

const DEFAULT: DensityConfig = {
  card: {
    padding: 12,
    titleSize: 14,
    metaSize: 12,
    gap: 8,
    borderRadius: 8,
    minHeight: 0,
    showCover: true,
    titleLines: 2,
    showTags: true,
    showDescription: false,
  },
  list: {
    rowHeight: 44,
    fontSize: 14,
    padding: '8px 16px',
    showTags: true,
    showDueDate: true,
    showPriority: true,
  },
  column: {
    width: 296,
    headerSize: 13,
    gap: 12,
  },
};

// ── Spacious: Notion-style roomy ──────────────────────────────────────────────

const SPACIOUS: DensityConfig = {
  card: {
    padding: 16,
    titleSize: 15,
    metaSize: 13,
    gap: 12,
    borderRadius: 10,
    minHeight: 80,
    showCover: true,
    titleLines: 3,
    showTags: true,
    showDescription: true,
  },
  list: {
    rowHeight: 56,
    fontSize: 15,
    padding: '12px 20px',
    showTags: true,
    showDueDate: true,
    showPriority: true,
  },
  column: {
    width: 320,
    headerSize: 14,
    gap: 16,
  },
};

// ── Export ────────────────────────────────────────────────────────────────────

export const DENSITY_CONFIGS: Record<TaskDensity, DensityConfig> = {
  compact: COMPACT,
  default: DEFAULT,
  spacious: SPACIOUS,
};
