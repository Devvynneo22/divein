import { useState } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import { ArrowLeft, Plus, Brain } from 'lucide-react';
import {
  useDecks,
  useCreateDeck,
  useCards,
  useDeckStats,
  useStudyQueue,
} from './hooks/useFlashcards';
import { DeckCard } from './components/DeckCard';
import { DeckForm } from './components/DeckForm';
import { CardList } from './components/CardList';
import { StudySession } from './components/StudySession';
import type { Deck, CreateDeckInput, UpdateDeckInput } from '@/shared/types/flashcard';

type DeckViewTab = 'cards' | 'study';

// ─── Deck Stats wrapper (per card in browser grid) ───────────────────────────

function DeckCardWithStats({ deck, onSelect }: { deck: Deck; onSelect: () => void }) {
  const { data: stats } = useDeckStats(deck.id);
  return <DeckCard deck={deck} stats={stats} onClick={onSelect} />;
}

// ─── Deck View ────────────────────────────────────────────────────────────────

interface DeckViewProps {
  deck: Deck;
  onBack: () => void;
}

function DeckView({ deck, onBack }: DeckViewProps) {
  const [activeTab, setActiveTab] = useState<DeckViewTab>('cards');
  const { data: cards = [] } = useCards(deck.id);
  const { data: stats } = useDeckStats(deck.id);
  const { data: studyQueue = [] } = useStudyQueue(deck.id);
  const accentColor = deck.color ?? '#3b82f6';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <ArrowLeft size={16} />
          All Decks
        </button>

        {/* Deck header */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Brain size={22} style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {deck.name}
            </h1>
            {deck.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{deck.description}</p>
            )}
          </div>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-5">
            <StatChip label="Total" value={stats.totalCards} />
            <StatChip label="New" value={stats.newCards} color="var(--color-accent)" />
            <StatChip label="Learning" value={stats.learningCards} color="var(--color-warning)" />
            <StatChip label="Review" value={stats.reviewCards} color="var(--color-success)" />
            <StatChip
              label="Due Today"
              value={stats.dueToday}
              color={stats.dueToday > 0 ? accentColor : undefined}
              highlight={stats.dueToday > 0}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1">
          {(['cards', 'study'] as DeckViewTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--color-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {activeTab === 'cards' ? (
          <CardList deckId={deck.id} cards={cards} />
        ) : (
          <StudySession
            deckId={deck.id}
            queue={studyQueue}
            onExit={() => setActiveTab('cards')}
          />
        )}
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
      style={{
        backgroundColor: highlight ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
        border: `1px solid ${highlight ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
      }}
    >
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        className="font-semibold"
        style={{ color: color ?? 'var(--color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FlashcardsPage() {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: decks = [], isLoading } = useDecks();
  const createDeck = useCreateDeck();

  function handleCreateDeck(input: CreateDeckInput | UpdateDeckInput) {
    createDeck.mutate(input as CreateDeckInput, {
      onSuccess: () => setShowCreateForm(false),
    });
  }

  // ── Deck View ──────────────────────────────────────────────────────────────
  if (selectedDeck) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <DeckView deck={selectedDeck} onBack={() => setSelectedDeck(null)} />
        </div>
      </div>
    );
  }

  // ── Deck Browser ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Flashcards</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Spaced repetition for lasting knowledge
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={16} />
            New Deck
          </button>
        </div>

        {/* Create deck form */}
        {showCreateForm && (
          <div
            className="rounded-xl p-5 mb-6"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
            }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Create New Deck
            </h2>
            <DeckForm
              onSave={handleCreateDeck}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createDeck.isPending}
            />
          </div>
        )}
      </div>

      {/* Deck grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <LoadingSpinner text="Loading flashcards…" />
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <Brain size={28} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No decks yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Create your first deck to start studying
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-dashed transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <Plus size={14} />
              Create a Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {decks.map((deck) => (
              <DeckCardWithStats
                key={deck.id}
                deck={deck}
                onSelect={() => setSelectedDeck(deck)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
