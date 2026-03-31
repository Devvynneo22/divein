import { useState, useMemo, useEffect } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { SkeletonCard } from '@/shared/components/Skeleton';
import { Plus, Brain, Play, ChevronDown, BarChart2, Grid, List, Trash2 } from 'lucide-react';
import { useDecks, useCreateDeck, useUpdateDeck, useDeleteDeck, useCards, useDeckStats, useStudyQueue } from './hooks/useFlashcards';
import { DeckCard, DeckListRow } from './components/DeckCard';
import { DeckForm } from './components/DeckForm';
import { CardList } from './components/CardList';
import { StudySession } from './components/StudySession';
import { DeckStats } from './components/DeckStats';
import type { Deck, CreateDeckInput, UpdateDeckInput } from '@/shared/types/flashcard';
import { EmptyState } from '@/shared/components/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeckStatsData {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
}

type SortOption = 'newest' | 'name-az' | 'most-cards' | 'due-first';
type LayoutMode = 'grid' | 'list';
type StudyMode = 'due' | 'cram' | 'preview-new' | 'by-tag';

// ─── Pulse animation style ────────────────────────────────────────────────────

const pulseKeyframes = `
@keyframes gentle-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--color-accent); opacity: 1; }
  50% { box-shadow: 0 0 0 6px transparent; opacity: 0.85; }
}
`;

// ─── StatChip ─────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        minWidth: 56,
      }}
    >
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function DueChip({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      style={{
        background: 'var(--color-danger-soft)',
        color: 'var(--color-danger)',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {count} due
    </span>
  );
}

function StreakChip({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <span
      style={{
        background: 'var(--color-warning-soft)',
        color: 'var(--color-warning)',
        borderRadius: 999,
        padding: '2px 10px',
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      🔥 {streak} day{streak !== 1 ? 's' : ''}
    </span>
  );
}

// ─── StatsDisplay ─────────────────────────────────────────────────────────────

function StatsDisplay({
  stats,
  streak,
  onStudyAllDue,
}: {
  stats: DeckStatsData;
  streak: number;
  onStudyAllDue: () => void;
}) {
  const hasDue = stats.dueToday > 0;

  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={20} color="var(--color-accent)" />
        <span
          style={{
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontSize: 15,
          }}
        >
          Overview
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flex: 1, flexWrap: 'wrap' }}>
        <StatChip label="Total" value={stats.totalCards} color="var(--color-text-primary)" />
        <StatChip label="New" value={stats.newCards} color="var(--color-accent)" />
        <StatChip label="Learning" value={stats.learningCards} color="var(--color-warning)" />
        <StatChip label="Review" value={stats.reviewCards} color="var(--color-success)" />
        <StatChip label="Due Today" value={stats.dueToday} color="var(--color-danger)" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StreakChip streak={streak} />
        <DueChip count={stats.dueToday} />
        {hasDue && (
          <>
            <style>{pulseKeyframes}</style>
            <button
              onClick={onStudyAllDue}
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 18px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                animation: 'gentle-pulse 2.4s ease-in-out infinite',
              }}
            >
              <Play size={14} />
              Study All Due
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── StatsSumRecurse / AggregatedStats ────────────────────────────────────────

function StatsSumRecurse({
  deckIds,
  accumulated,
  onDone,
}: {
  deckIds: string[];
  accumulated: DeckStatsData;
  onDone: (stats: DeckStatsData) => void;
}) {
  const currentId = deckIds[0];
  const remaining = deckIds.slice(1);
  const { data: stats } = useDeckStats(currentId);

  useEffect(() => {
    if (!stats) return;
    const next: DeckStatsData = {
      totalCards: accumulated.totalCards + (stats.totalCards ?? 0),
      newCards: accumulated.newCards + (stats.newCards ?? 0),
      learningCards: accumulated.learningCards + (stats.learningCards ?? 0),
      reviewCards: accumulated.reviewCards + (stats.reviewCards ?? 0),
      dueToday: accumulated.dueToday + (stats.dueToday ?? 0),
    };
    if (remaining.length === 0) {
      onDone(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  if (remaining.length === 0) return null;
  return (
    <StatsSumRecurse
      deckIds={remaining}
      accumulated={
        stats
          ? {
              totalCards: accumulated.totalCards + (stats.totalCards ?? 0),
              newCards: accumulated.newCards + (stats.newCards ?? 0),
              learningCards: accumulated.learningCards + (stats.learningCards ?? 0),
              reviewCards: accumulated.reviewCards + (stats.reviewCards ?? 0),
              dueToday: accumulated.dueToday + (stats.dueToday ?? 0),
            }
          : accumulated
      }
      onDone={onDone}
    />
  );
}

function AggregatedStats({
  decks,
  streak,
  onStudyAllDue,
}: {
  decks: Deck[];
  streak: number;
  onStudyAllDue: () => void;
}) {
  const [aggregated, setAggregated] = useState<DeckStatsData>({
    totalCards: 0,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    dueToday: 0,
  });

  if (decks.length === 0) return null;

  return (
    <>
      <StatsSumRecurse
        deckIds={decks.map((d) => d.id)}
        accumulated={{ totalCards: 0, newCards: 0, learningCards: 0, reviewCards: 0, dueToday: 0 }}
        onDone={setAggregated}
      />
      <StatsDisplay stats={aggregated} streak={streak} onStudyAllDue={onStudyAllDue} />
    </>
  );
}

// ─── DeckCardWithStats ────────────────────────────────────────────────────────

function DeckCardWithStats({
  deck,
  layout,
  onClick,
  onStudy,
  onDelete,
}: {
  deck: Deck;
  layout: LayoutMode;
  onClick: () => void;
  onStudy: (e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}) {
  const { data: stats } = useDeckStats(deck.id);

  if (layout === 'list') {
    return (
      <DeckListRow
        deck={deck}
        stats={stats}
        onClick={onClick}
        onStudy={onStudy}
        onDelete={() => onDelete(deck.id)}
      />
    );
  }

  return (
    <DeckCard
      deck={deck}
      stats={stats}
      onClick={onClick}
      onStudy={onStudy}
      onDelete={() => onDelete(deck.id)}
    />
  );
}

// ─── SortDropdown ─────────────────────────────────────────────────────────────

function SortDropdown({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'name-az', label: 'Name A–Z' },
    { value: 'most-cards', label: 'Most Cards' },
    { value: 'due-first', label: 'Due First' },
  ];

  const current = options.find((o) => o.value === value);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '7px 14px',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {current?.label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-popup)',
            zIndex: 100,
            overflow: 'hidden',
            minWidth: 160,
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 16px',
                background: opt.value === value ? 'var(--color-accent-soft)' : 'transparent',
                color:
                  opt.value === value
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                border: 'none',
                fontSize: 13,
                fontWeight: opt.value === value ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LayoutToggle ─────────────────────────────────────────────────────────────

function LayoutToggle({
  value,
  onChange,
}: {
  value: LayoutMode;
  onChange: (v: LayoutMode) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {(['grid', 'list'] as LayoutMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          title={mode === 'grid' ? 'Grid view' : 'List view'}
          style={{
            padding: '7px 12px',
            border: 'none',
            background: value === mode ? 'var(--color-accent-soft)' : 'transparent',
            color:
              value === mode ? 'var(--color-accent)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {mode === 'grid' ? <Grid size={15} /> : <List size={15} />}
        </button>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 18,
          boxShadow: 'var(--shadow-popup)',
          padding: 32,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── StudyOptionsPanel ────────────────────────────────────────────────────────

interface StudyOption {
  mode: StudyMode;
  label: string;
  description: string;
  count: number;
  disabled?: boolean;
}

function StudyOptionsPanel({
  deckId,
  onStart,
  onCancel,
}: {
  deckId: string;
  onStart: (mode: StudyMode, tag?: string) => void;
  onCancel: () => void;
}) {
  const { data: cards = [] } = useCards(deckId);
  const { data: queue = [] } = useStudyQueue(deckId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<StudyMode | null>(null);

  const newCards = useMemo(
    () => cards.filter((c: any) => c.status === 'new' || c.status === undefined),
    [cards]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    cards.forEach((c: any) => {
      if (Array.isArray(c.tags)) c.tags.forEach((t: string) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [cards]);

  const tagCount = selectedTag
    ? cards.filter((c: any) => Array.isArray(c.tags) && c.tags.includes(selectedTag)).length
    : 0;

  const options: StudyOption[] = [
    {
      mode: 'due',
      label: '📚 Due Cards',
      description: 'Study cards scheduled for today',
      count: queue.length,
      disabled: queue.length === 0,
    },
    {
      mode: 'cram',
      label: '🔄 Cram All',
      description: 'Review every card in this deck',
      count: cards.length,
      disabled: cards.length === 0,
    },
    {
      mode: 'preview-new',
      label: '🆕 Preview New',
      description: 'Only unseen cards',
      count: newCards.length,
      disabled: newCards.length === 0,
    },
    {
      mode: 'by-tag',
      label: '🏷️ By Tag',
      description: 'Filter cards by a tag',
      count: selectedTag ? tagCount : allTags.length,
      disabled: allTags.length === 0,
    },
  ];

  const [selectedMode, setSelectedMode] = useState<StudyMode>('due');

  const handleStart = () => {
    if (selectedMode === 'by-tag' && !selectedTag) return;
    onStart(selectedMode, selectedTag ?? undefined);
  };

  const canStart =
    selectedMode !== 'by-tag'
      ? (options.find((o) => o.mode === selectedMode)?.count ?? 0) > 0
      : !!selectedTag && tagCount > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          Study Options
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
          Choose how you want to study this deck
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt) => {
          const isSelected = selectedMode === opt.mode;
          const isHovered = hoveredMode === opt.mode;
          return (
            <button
              key={opt.mode}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && setSelectedMode(opt.mode)}
              onMouseEnter={() => setHoveredMode(opt.mode)}
              onMouseLeave={() => setHoveredMode(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: isSelected
                  ? 'var(--color-accent-soft)'
                  : isHovered && !opt.disabled
                  ? 'var(--color-bg-tertiary)'
                  : 'var(--color-bg-secondary)',
                border: `1.5px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 12,
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                opacity: opt.disabled ? 0.5 : 1,
                textAlign: 'left',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}
                >
                  {opt.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {opt.description}
                </div>
              </div>
              <span
                style={{
                  background: isSelected ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                  color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--color-border)',
                  minWidth: 36,
                  textAlign: 'center',
                }}
              >
                {opt.mode === 'by-tag' && !selectedTag
                  ? `${allTags.length} tags`
                  : opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tag picker */}
      {selectedMode === 'by-tag' && allTags.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select a tag
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: `1.5px solid ${selectedTag === tag ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: selectedTag === tag ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
                  color: selectedTag === tag ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
          {selectedTag && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {tagCount} card{tagCount !== 1 ? 's' : ''} with tag "{selectedTag}"
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          disabled={!canStart}
          onClick={handleStart}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: 'none',
            background: canStart ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: canStart ? '#fff' : 'var(--color-text-muted)',
            fontSize: 14,
            fontWeight: 600,
            cursor: canStart ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Play size={14} />
          Start Studying
        </button>
      </div>
    </div>
  );
}

// ─── DeckView ─────────────────────────────────────────────────────────────────

type DeckTab = 'cards' | 'study' | 'stats';

function DeckView({
  deck,
  onBack,
  onStudyAllDue,
}: {
  deck: Deck;
  onBack: () => void;
  onStudyAllDue?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<DeckTab>(onStudyAllDue ? 'study' : 'cards');
  const [showStudyOptions, setShowStudyOptions] = useState(false);
  const [studyConfig, setStudyConfig] = useState<{
    mode: StudyMode;
    tag?: string;
  } | null>(null);

  const { data: cards = [] } = useCards(deck.id);
  const { data: queue = [] } = useStudyQueue(deck.id);

  const handleStudyStart = (mode: StudyMode, tag?: string) => {
    setStudyConfig({ mode, tag });
    setShowStudyOptions(false);
    setActiveTab('study');
  };

  const studyCards = useMemo(() => {
    if (!studyConfig) return queue;
    switch (studyConfig.mode) {
      case 'due':
        return queue;
      case 'cram':
        return cards;
      case 'preview-new':
        return cards.filter((c: any) => c.status === 'new' || c.status === undefined);
      case 'by-tag':
        return cards.filter(
          (c: any) =>
            studyConfig.tag &&
            Array.isArray(c.tags) &&
            c.tags.includes(studyConfig.tag)
        );
      default:
        return queue;
    }
  }, [studyConfig, queue, cards]);

  const tabs: { id: DeckTab; label: string }[] = [
    { id: 'cards', label: 'Cards' },
    { id: 'study', label: 'Study' },
    { id: 'stats', label: 'Stats' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: deck.color ?? 'var(--color-accent)',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          {deck.name}
        </h2>
        {deck.description && (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {deck.description}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'var(--color-bg-secondary)',
          borderRadius: 12,
          padding: 4,
          width: 'fit-content',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'study') setStudyConfig(null);
            }}
            style={{
              padding: '7px 18px',
              borderRadius: 9,
              border: 'none',
              background:
                activeTab === tab.id ? 'var(--color-bg-elevated)' : 'transparent',
              color:
                activeTab === tab.id
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-muted)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              transition: 'background 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowStudyOptions(true)}
          style={{
            padding: '7px 16px',
            borderRadius: 9,
            border: 'none',
            background: 'var(--color-accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 4,
          }}
        >
          <Play size={13} />
          Study
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'cards' && <CardList deckId={deck.id} cards={cards} onStudyAll={() => { setShowStudyOptions(true); }} />}
      {activeTab === 'study' && !showStudyOptions && (
        <StudySession
          deckId={deck.id}
          queue={studyConfig ? studyCards : queue}
          deckColor={deck.color}
          deckName={deck.name}
          allCards={cards}
          onExit={() => setActiveTab('cards')}
        />
      )}
      {activeTab === 'stats' && <DeckStats deck={deck} cards={cards} deckColor={deck.color} />}

      {/* Study Options Modal */}
      {showStudyOptions && (
        <Modal onClose={() => setShowStudyOptions(false)}>
          <StudyOptionsPanel
            deckId={deck.id}
            onStart={handleStudyStart}
            onCancel={() => setShowStudyOptions(false)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── NewDeckTile ──────────────────────────────────────────────────────────────

function NewDeckTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const inspirations = [
    { icon: '📝', label: 'Vocabulary' },
    { icon: '🧬', label: 'Science' },
    { icon: '💻', label: 'Programming' },
    { icon: '🌍', label: 'Languages' },
  ];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--color-bg-secondary)' : 'transparent',
        border: `2px dashed ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        minHeight: 160,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: hovered ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
      >
        <Plus
          size={20}
          color={hovered ? 'var(--color-accent)' : 'var(--color-text-muted)'}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)',
          transition: 'color 0.2s',
        }}
      >
        New Deck
      </span>

      {/* Inspiration icons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {inspirations.map((ins) => (
          <div
            key={ins.label}
            title={ins.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              opacity: 0.45,
            }}
          >
            <span style={{ fontSize: 18 }}>{ins.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {ins.label}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}

// ─── List header row ──────────────────────────────────────────────────────────

function ListHeaderRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px 80px 80px 48px',
        gap: 8,
        padding: '6px 16px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 4,
      }}
    >
      {['Deck', 'Total', 'New', 'Review', 'Due', ''].map((h, i) => (
        <span
          key={i}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: i > 0 ? 'center' : 'left',
          }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

// ─── FlashcardsPage ───────────────────────────────────────────────────────────

export function FlashcardsPage() {
  const { data: decks = [], isLoading } = useDecks();
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [layout, setLayout] = useState<LayoutMode>(() => {
    try {
      return (localStorage.getItem('divein-flashcards-layout') as LayoutMode) ?? 'grid';
    } catch {
      return 'grid';
    }
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [studyAllDue, setStudyAllDue] = useState(false);

  const streak = useMemo(() => {
    try {
      return parseInt(localStorage.getItem('divein-study-streak') ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }, []);

  // Persist layout
  useEffect(() => {
    try {
      localStorage.setItem('divein-flashcards-layout', layout);
    } catch {}
  }, [layout]);

  const handleDelete = async (id: string) => {
    const deck = decks.find((d: Deck) => d.id === id);
    if (!window.confirm(`Delete deck "${deck?.name ?? 'this deck'}"? This cannot be undone.`)) return;
    try {
      await deleteDeck.mutateAsync(id);
      toast.success('Deck deleted');
    } catch {
      toast.error('Failed to delete deck');
    }
  };

  const handleCreate = async (input: CreateDeckInput) => {
    try {
      await createDeck.mutateAsync(input);
      setShowCreateModal(false);
      toast.success('Deck created!');
    } catch {
      toast.error('Failed to create deck');
    }
  };

  const sortedDecks = useMemo(() => {
    let result = [...decks];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (d: Deck) =>
          d.name.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (sort) {
      case 'newest':
        result.sort(
          (a: Deck, b: Deck) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'name-az':
        result.sort((a: Deck, b: Deck) => a.name.localeCompare(b.name));
        break;
      case 'most-cards':
        // Without stats here, fall back to name sort as proxy
        result.sort((a: Deck, b: Deck) => a.name.localeCompare(b.name));
        break;
      case 'due-first':
        // Also falls back, DeckCardWithStats has stats but sorting needs them lifted
        result.sort(
          (a: Deck, b: Deck) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
    }

    return result;
  }, [decks, search, sort]);

  // ── If a deck is selected, show DeckView ──
  if (selectedDeck) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <DeckView
          deck={selectedDeck}
          onBack={() => {
            setSelectedDeck(null);
            setStudyAllDue(false);
          }}
          onStudyAllDue={studyAllDue}
        />
      </div>
    );
  }

  // ── Main page ──
  return (
    <div
      style={{
        padding: '24px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brain size={28} color="var(--color-accent)" />
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Flashcards
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
              {decks.length} deck{decks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Plus size={16} />
          New Deck
        </button>
      </div>

      {/* Aggregated stats bar */}
      {!isLoading && decks.length > 0 && (
        <AggregatedStats
          decks={decks}
          streak={streak}
          onStudyAllDue={() => {
            // Navigate to first deck with due cards — or just open first deck in study mode
            if (decks.length > 0) {
              setStudyAllDue(true);
              setSelectedDeck(decks[0]);
            }
          }}
        />
      )}

      {/* Search + Sort + Layout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search decks…"
          style={{
            flex: 1,
            minWidth: 200,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '8px 14px',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <SortDropdown value={sort} onChange={setSort} />
        <LayoutToggle value={layout} onChange={setLayout} />
      </div>

      {/* Deck grid / list */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedDecks.length === 0 && search ? (
        <EmptyState
          icon="🔍"
          title="No decks found"
          description={`No decks match "${search}"`}
        />
      ) : sortedDecks.length === 0 ? (
        <EmptyState
          icon="🃏"
          title="No decks yet"
          description="Create your first deck to start studying"
          actionLabel="Create a Deck"
          onAction={() => setShowCreateModal(true)}
        />
      ) : layout === 'list' ? (
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ListHeaderRow />
          {sortedDecks.map((deck: Deck) => (
            <DeckCardWithStats
              key={deck.id}
              deck={deck}
              layout="list"
              onClick={() => setSelectedDeck(deck)}
              onStudy={(e) => { e.stopPropagation(); setSelectedDeck(deck); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {sortedDecks.map((deck: Deck) => (
            <DeckCardWithStats
              key={deck.id}
              deck={deck}
              layout="grid"
              onClick={() => setSelectedDeck(deck)}
              onStudy={(e) => { e.stopPropagation(); setSelectedDeck(deck); }}
              onDelete={handleDelete}
            />
          ))}
          <NewDeckTile onClick={() => setShowCreateModal(true)} />
        </div>
      )}

      {/* Create deck modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h3
            style={{
              margin: '0 0 20px',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            Create New Deck
          </h3>
          <DeckForm
            onSave={(data) => handleCreate(data as CreateDeckInput)}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createDeck.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
