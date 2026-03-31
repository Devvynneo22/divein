import { useState, useMemo, useEffect } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { SkeletonCard } from '@/shared/components/Skeleton';
import { Plus, Brain, Play, ChevronDown, BarChart2 } from 'lucide-react';
import {
  useDecks,
  useCreateDeck,
  useUpdateDeck,
  useCards,
  useDeckStats,
  useStudyQueue,
} from './hooks/useFlashcards';
import { DeckCard } from './components/DeckCard';
import { DeckForm } from './components/DeckForm';
import { CardList } from './components/CardList';
import { StudySession } from './components/StudySession';
import { DeckStats } from './components/DeckStats';
import type { Deck, CreateDeckInput, UpdateDeckInput } from '@/shared/types/flashcard';
import { EmptyState } from '@/shared/components/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = 'newest' | 'name-az' | 'most-cards' | 'due-first';

interface StudyStreak {
  lastStudyDate: string;
  streak: number;
}

// ─── Streak helpers ───────────────────────────────────────────────────────────

function getStreakFromStorage(): number {
  try {
    const raw = localStorage.getItem('divein-study-streak');
    if (!raw) return 0;
    const data: StudyStreak = JSON.parse(raw);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (data.lastStudyDate === todayStr || data.lastStudyDate === yesterdayStr) {
      return data.streak;
    }
    return 0;
  } catch {
    return 0;
  }
}

// ─── DeckCard + stats wrapper ─────────────────────────────────────────────────

function DeckCardWithStats({
  deck,
  onSelect,
  onStudy,
}: {
  deck: Deck;
  onSelect: () => void;
  onStudy: () => void;
}) {
  const { data: stats } = useDeckStats(deck.id);
  return (
    <DeckCard
      deck={deck}
      stats={stats}
      onClick={onSelect}
      onStudy={(e) => {
        e.stopPropagation();
        onStudy();
      }}
    />
  );
}

// ─── Global stats aggregator ──────────────────────────────────────────────────

// Recursively collects stats per deck using hooks (hooks-in-a-loop workaround)
function StatsSumRecurse({
  decks,
  idx,
  acc,
  streak,
  onStudyAllDue,
}: {
  decks: Deck[];
  idx: number;
  acc: { totalCards: number; dueToday: number; mastered: number };
  streak: number;
  onStudyAllDue?: () => void;
}) {
  const { data: stats } = useDeckStats(decks[idx].id);
  const next = {
    totalCards: acc.totalCards + (stats?.totalCards ?? 0),
    dueToday: acc.dueToday + (stats?.dueToday ?? 0),
    mastered: acc.mastered + (stats?.reviewCards ?? 0),
  };

  if (idx === decks.length - 1) {
    return (
      <StatsDisplay
        totalDecks={decks.length}
        totalCards={next.totalCards}
        dueToday={next.dueToday}
        mastered={next.mastered}
        streak={streak}
        onStudyAllDue={onStudyAllDue}
      />
    );
  }

  return <StatsSumRecurse decks={decks} idx={idx + 1} acc={next} streak={streak} onStudyAllDue={onStudyAllDue} />;
}

function AggregatedStats({
  decks,
  streak,
  onStudyAllDue,
}: {
  decks: Deck[];
  streak: number;
  onStudyAllDue?: () => void;
}) {
  if (decks.length === 0) {
    return <StatsDisplay totalDecks={0} totalCards={0} dueToday={0} mastered={0} streak={streak} />;
  }
  return (
    <StatsSumRecurse
      decks={decks}
      idx={0}
      acc={{ totalCards: 0, dueToday: 0, mastered: 0 }}
      streak={streak}
      onStudyAllDue={onStudyAllDue}
    />
  );
}

function StatsDisplay({
  totalDecks,
  totalCards,
  dueToday,
  mastered,
  streak,
  onStudyAllDue,
}: {
  totalDecks: number;
  totalCards: number;
  dueToday: number;
  mastered: number;
  streak: number;
  onStudyAllDue?: () => void;
}) {
  const masteryPct = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;
  return (
    <div className="flex items-center gap-4 flex-wrap w-full justify-between">
      <div className="flex items-center gap-3 flex-wrap">
        <StatChip icon="🧠" label={`${totalDecks} deck${totalDecks !== 1 ? 's' : ''}`} />
        <span style={{ color: 'var(--color-border)', fontSize: '14px' }}>·</span>
        <StatChip icon="🃏" label={`${totalCards} card${totalCards !== 1 ? 's' : ''}`} />
        <span style={{ color: 'var(--color-border)', fontSize: '14px' }}>·</span>
        <DueChip dueToday={dueToday} />
        <span style={{ color: 'var(--color-border)', fontSize: '14px' }}>·</span>
        <StatChip icon="⭐" label={`${masteryPct}% mastery`} />
        {streak > 0 && (
          <>
            <span style={{ color: 'var(--color-border)', fontSize: '14px' }}>·</span>
            <StreakChip streak={streak} />
          </>
        )}
      </div>
      {dueToday > 0 && onStudyAllDue && (
        <button
          onClick={onStudyAllDue}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--color-warning), #f97316)',
            boxShadow: '0 2px 8px rgba(207,142,23,0.35)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          ⚡ Study All Due ({dueToday})
        </button>
      )}
    </div>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function DueChip({ dueToday }: { dueToday: number }) {
  const isWarning = dueToday > 0;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: isWarning ? 'var(--color-warning-soft)' : 'var(--color-success-soft)',
        color: isWarning ? 'var(--color-warning)' : 'var(--color-success)',
        border: `1px solid ${isWarning ? 'rgba(207,142,23,0.25)' : 'rgba(34,197,94,0.2)'}`,
      }}
    >
      <span>{isWarning ? '⚡' : '✓'}</span>
      <span>{dueToday} due today</span>
    </div>
  );
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
      style={{
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
      }}
    >
      <span>🔥</span>
      <span>{streak} day streak</span>
    </div>
  );
}

// ─── Deck View ────────────────────────────────────────────────────────────────

interface DeckViewProps {
  deck: Deck;
  initialView?: 'cards' | 'study' | 'stats';
  onBack: () => void;
}

function DeckView({ deck, initialView = 'cards', onBack }: DeckViewProps) {
  const [view, setView] = useState<'cards' | 'study' | 'stats'>(initialView);
  const { data: cards = [] } = useCards(deck.id);
  const { data: studyQueue = [] } = useStudyQueue(deck.id);
  const updateDeck = useUpdateDeck();

  function handleSaveDeck(data: CreateDeckInput | UpdateDeckInput) {
    updateDeck.mutate({ id: deck.id, data: data as UpdateDeckInput });
  }

  const accentColor = deck.color ?? '#3b82f6';

  return (
    <div className="flex flex-col h-full">
      {/* ── Deck header ── */}
      <div
        className="px-8 pt-7 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-5" aria-label="Breadcrumb">
          <button
            onClick={onBack}
            className="transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            Flashcards
          </button>
          <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>›</span>
          <span className="font-medium truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }}>
            {deck.name}
          </span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          {/* Title + description */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Brain size={20} style={{ color: accentColor }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {deck.name}
              </h1>
              {deck.description && (
                <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {deck.description}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stats button */}
            <button
              onClick={() => setView(view === 'stats' ? 'cards' : 'stats')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                border: `1px solid ${view === 'stats' ? accentColor : 'var(--color-border)'}`,
                color: view === 'stats' ? accentColor : 'var(--color-text-secondary)',
                backgroundColor: view === 'stats' ? `${accentColor}15` : 'var(--color-bg-secondary)',
              }}
              onMouseEnter={(e) => {
                if (view !== 'stats') e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                if (view !== 'stats') e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
              }}
            >
              <BarChart2 size={14} />
              Stats
            </button>

            {/* Cards / Study toggle */}
            {view !== 'study' ? (
              <button
                onClick={() => setView('study')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ backgroundColor: accentColor }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                <Play size={14} fill="white" />
                Study
              </button>
            ) : (
              <button
                onClick={() => setView('cards')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
              >
                View Cards
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {view === 'stats' ? (
          <DeckStats deck={deck} cards={cards} deckColor={deck.color} />
        ) : view === 'cards' ? (
          <CardList
            deckId={deck.id}
            cards={cards}
            onStudyAll={() => setView('study')}
          />
        ) : (
          <StudySession
            deckId={deck.id}
            queue={studyQueue}
            deckColor={deck.color}
            deckName={deck.name}
            onExit={() => setView('cards')}
          />
        )}
      </div>
    </div>
  );
}

// ─── Modal overlay ─────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-popup)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  'name-az': 'Name A–Z',
  'most-cards': 'Most Cards',
  'due-first': 'Due First',
};

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)'; }}
      >
        <span>{SORT_LABELS[value]}</span>
        <ChevronDown size={13} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-20 rounded-xl overflow-hidden py-1"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-popup)',
              minWidth: '140px',
            }}
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  color: value === opt ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  backgroundColor: value === opt ? 'var(--color-accent-soft)' : 'transparent',
                  fontWeight: value === opt ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (value !== opt) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (value !== opt) e.currentTarget.style.backgroundColor = 'transparent';
                  else e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                }}
              >
                {SORT_LABELS[opt]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function FlashcardsPage() {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [initialDeckView, setInitialDeckView] = useState<'cards' | 'study' | 'stats'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [streak, setStreak] = useState(0);

  const { data: decks = [], isLoading } = useDecks();
  const createDeck = useCreateDeck();

  // Load streak on mount
  useEffect(() => {
    setStreak(getStreakFromStorage());
  }, []);

  function handleCreateDeck(input: CreateDeckInput | UpdateDeckInput) {
    createDeck.mutate(input as CreateDeckInput, {
      onSuccess: () => {
        setShowCreateModal(false);
        toast.success('Deck created ✓');
      },
    });
  }

  // Filter + sort decks
  const filteredDecks = useMemo(() => {
    let list = decks;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'name-az':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      // 'most-cards' and 'due-first' require stats — we can only approximate with client data
      // For these we keep original order (stats-based sorting would need a separate aggregation)
      default:
        break;
    }

    return list;
  }, [decks, searchQuery, sortBy]);

  // ── Deck view ──────────────────────────────────────────────────────────────
  if (selectedDeck) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <DeckView
            deck={selectedDeck}
            initialView={initialDeckView}
            onBack={() => {
              setSelectedDeck(null);
              setInitialDeckView('cards');
            }}
          />
        </div>
      </div>
    );
  }

  // ── Deck browser ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full">
        {/* ── Hero Header ── */}
        <div
          className="px-8 pt-7 pb-5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {/* Top row: title + new deck button */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Flashcards
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Spaced repetition for lasting knowledge
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: 'var(--shadow-sm)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
            >
              <Plus size={15} />
              New Deck
            </button>
          </div>

          {/* Stats summary bar */}
          {!isLoading && decks.length > 0 && (
            <div
              className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl mb-4"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <AggregatedStats
                decks={decks}
                streak={streak}
                onStudyAllDue={() => {
                  // Find the first deck with due cards and start studying
                  const firstDue = decks[0];
                  if (firstDue) {
                    setInitialDeckView('study');
                    setSelectedDeck(firstDue);
                  }
                }}
              />
            </div>
          )}

          {/* Search + Sort row */}
          {decks.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Search input */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 max-w-xs"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search decks…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {Array.from({ length: 4 }, (_, i) => (
                <SkeletonCard key={i} height={220} />
              ))}
            </div>
          ) : decks.length === 0 ? (
            /* ── Empty state ── */
            <EmptyState
              icon="🃏"
              title="Ready to learn?"
              description="Create your first flashcard deck and start studying with spaced repetition"
              actionLabel="Create Deck"
              onAction={() => setShowCreateModal(true)}
            />
          ) : filteredDecks.length === 0 ? (
            /* ── No search results ── */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span style={{ fontSize: '2rem' }}>🔍</span>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                No decks matching "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm underline"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Clear search
              </button>
            </div>
          ) : (
            /* ── Deck grid ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredDecks.map((deck) => (
                <DeckCardWithStats
                  key={deck.id}
                  deck={deck}
                  onSelect={() => {
                    setInitialDeckView('cards');
                    setSelectedDeck(deck);
                  }}
                  onStudy={() => {
                    setInitialDeckView('study');
                    setSelectedDeck(deck);
                  }}
                />
              ))}
              {/* Add new deck tile */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl py-12 border-2 border-dashed text-sm transition-all"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                  minHeight: '220px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                  e.currentTarget.style.color = 'var(--color-accent)';
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={22} />
                <span>New Deck</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Create deck modal ── */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text-primary)' }}>
            Create New Deck
          </h2>
          <DeckForm
            onSave={handleCreateDeck}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createDeck.isPending}
          />
        </Modal>
      )}
    </>
  );
}
