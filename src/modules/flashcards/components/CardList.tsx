import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Upload,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Grid3X3,
  Table2,
  Info,
  Trash2,
  Edit3,
  X,
  Tag,
  Check,
  AlertCircle,
  ChevronsUpDown,
} from 'lucide-react';
import { Card, CardStatus, CreateCardInput, UpdateCardInput } from '@/shared/types/flashcard';
import CardForm from './CardForm';
import { useCreateCard, useDeleteCard, useUpdateCard } from '../hooks/useFlashcards';
import { toast } from '@/shared/stores/toastStore';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ViewMode = 'grid' | 'table';
type SortKey = 'created' | 'next-review' | 'difficulty' | 'front' | 'interval' | 'ease';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | CardStatus | 'leeches';

interface CardListProps {
  deckId: string;
  cards: Card[];
  onStudyAll?: () => void;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_COLORS: Record<CardStatus, string> = {
  new: 'var(--color-accent)',
  learning: 'var(--color-warning)',
  review: 'var(--color-success)',
  suspended: 'var(--color-text-muted)',
};

const STATUS_LABELS: Record<CardStatus, string> = {
  new: 'New',
  learning: 'Learning',
  review: 'Review',
  suspended: 'Suspended',
};

function isLeech(card: Card): boolean {
  return (card.easeFactor ?? 2.5) < 1.5 && (card.repetitions ?? 0) > 3;
}

function isDue(card: Card): boolean {
  if (!card.nextReview) return false;
  return new Date(card.nextReview) <= new Date();
}

function truncate(str: string, n: number): string {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + 'â€¦' : str;
}

function formatDate(d: string | Date | undefined | null): string {
  if (!d) return 'â€”';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return 'â€”';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function easeColor(ease: number): string {
  // 1.3 â†’ red, 2.5 â†’ yellow, 4.0 â†’ green
  if (ease >= 3.0) return 'var(--color-success)';
  if (ease >= 2.0) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function easePercent(ease: number): number {
  const min = 1.3;
  const max = 4.0;
  return Math.min(100, Math.max(0, ((ease - min) / (max - min)) * 100));
}

// â”€â”€â”€ Ease Gauge Arc SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EaseGauge: React.FC<{ ease: number }> = ({ ease }) => {
  const pct = easePercent(ease);
  const radius = 40;
  const cx = 50;
  const cy = 55;
  const startAngle = -210;
  const totalAngle = 240;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (startDeg: number, endDeg: number, r: number) => {
    const s = toRad(startDeg);
    const e = toRad(endDeg);
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const fillAngle = startAngle + (totalAngle * pct) / 100;
  const color = easeColor(ease);

  return (
    <svg viewBox="0 0 100 70" width="120" height="84">
      {/* Track */}
      <path
        d={arcPath(startAngle, startAngle + totalAngle, radius)}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={arcPath(startAngle, fillAngle, radius)}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Label */}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--color-text-primary)" fontSize="14" fontWeight="bold">
        {ease.toFixed(2)}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--color-text-muted)" fontSize="8">
        EASE
      </text>
      {/* Min/max labels */}
      <text x="8" y="68" fill="var(--color-text-muted)" fontSize="7">1.3</text>
      <text x="84" y="68" fill="var(--color-text-muted)" fontSize="7">4.0</text>
    </svg>
  );
};

// â”€â”€â”€ Card Info Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CardInfoModal: React.FC<{ card: Card; onClose: () => void }> = ({ card, onClose }) => {
  const ease = card.easeFactor ?? 2.5;
  const leech = isLeech(card);
  const due = isDue(card);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-popup)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.5rem',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background: STATUS_COLORS[card.status] + '22',
                color: STATUS_COLORS[card.status],
                border: `1px solid ${STATUS_COLORS[card.status]}44`,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[card.status], display: 'inline-block' }} />
              {STATUS_LABELS[card.status]}
            </span>
            {leech && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)44' }}>
                ðŸ©¸ Leech
              </span>
            )}
            {due && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)44' }}>
                Due
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Front */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Front</div>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '0.875rem 1rem', color: 'var(--color-text-primary)', fontSize: '15px', lineHeight: 1.6 }}>
            {card.front}
          </div>
        </div>

        {/* Back */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Back</div>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '0.875rem 1rem', color: 'var(--color-text-primary)', fontSize: '15px', lineHeight: 1.6 }}>
            {card.back}
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {card.tags.map((tag) => (
                <span key={tag} style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '999px', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', border: '1px solid var(--color-accent)33' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Metadata grid + Gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.25rem', alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Created', value: formatDate(card.createdAt) },
              { label: 'Last Review', value: formatDate(card.lastReviewed) },
              { label: 'Next Review', value: formatDate(card.nextReview) },
              { label: 'Interval', value: card.intervalDays != null ? `${card.intervalDays}d` : 'â€”' },
              { label: 'Repetitions', value: card.repetitions ?? 0 },
              { label: 'Ease', value: ease.toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--color-bg-secondary)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{String(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <EaseGauge ease={ease} />
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ease Factor</div>
          </div>
        </div>

        {/* Review History placeholder */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Review History</div>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '10px', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
            Review history coming soon
          </div>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ Floating Bulk Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface BulkBarProps {
  selectedIds: Set<string>;
  cards: Card[];
  onClear: () => void;
  onDelete: (ids: string[]) => void;
  onSuspend: (ids: string[]) => void;
  onAddTag: (ids: string[], tag: string) => void;
}

const BulkBar: React.FC<BulkBarProps> = ({ selectedIds, cards, onClear, onDelete, onSuspend, onAddTag }) => {
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const count = selectedIds.size;

  const selectedCards = cards.filter((c) => selectedIds.has(c.id));
  const allSuspended = selectedCards.every((c) => c.status === 'suspended');

  if (count === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-popup)',
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        maxWidth: '90vw',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
        {count} selected
      </span>

      <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

      {/* Add Tag */}
      {showTagInput ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const tag = tagInput.trim();
            if (tag) { onAddTag([...selectedIds], tag); setTagInput(''); setShowTagInput(false); }
          }}
          style={{ display: 'flex', gap: '4px' }}
        >
          <input
            autoFocus
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag nameâ€¦"
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              outline: 'none',
              width: '120px',
            }}
          />
          <button type="submit" style={{ background: 'var(--color-accent)', border: 'none', borderRadius: '8px', padding: '4px 10px', color: '#fff', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            Add
          </button>
          <button type="button" onClick={() => setShowTagInput(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={14} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowTagInput(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '5px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 500 }}
        >
          <Tag size={13} /> Add Tag
        </button>
      )}

      {/* Suspend / Unsuspend */}
      <button
        onClick={() => onSuspend([...selectedIds])}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '5px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 500 }}
      >
        {allSuspended ? 'Unsuspend' : 'Suspend'}
      </button>

      {/* Delete */}
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>Delete {count}?</span>
          <button onClick={() => { onDelete([...selectedIds]); setConfirmDelete(false); }} style={{ background: 'var(--color-danger)', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Yes
          </button>
          <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)44', borderRadius: '8px', padding: '5px 12px', fontSize: '13px', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 500 }}
        >
          <Trash2 size={13} /> Delete
        </button>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

      <button
        onClick={onClear}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
      >
        <X size={14} /> Clear
      </button>
    </div>
  );
};

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CardList: React.FC<CardListProps> = ({ deckId, cards, onStudyAll }) => {
  // â”€â”€ View / sort / filter state â”€â”€
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('divein-cards-view') as ViewMode) || 'grid'; } catch { return 'grid'; }
  });
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  // â”€â”€ UI state â”€â”€
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());
  const [infoCardId, setInfoCardId] = useState<string | null>(null);

  // â”€â”€ Multi-select â”€â”€
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIdx = useRef<number | null>(null);

  // â”€â”€ Hooks â”€â”€
  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();
  const updateCard = useUpdateCard();

  // â”€â”€ Persist view mode â”€â”€
  useEffect(() => {
    try { localStorage.setItem('divein-cards-view', viewMode); } catch {}
  }, [viewMode]);

  // â”€â”€ Table sort toggle â”€â”€
  const handleTableSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  // â”€â”€ Filtered + sorted cards â”€â”€
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Status filter
    if (statusFilter === 'leeches') {
      result = result.filter(isLeech);
    } else if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q) ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'created') {
        cmp = new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      } else if (sortKey === 'next-review') {
        cmp = new Date(a.nextReview ?? '9999').getTime() - new Date(b.nextReview ?? '9999').getTime();
      } else if (sortKey === 'difficulty') {
        cmp = (a.easeFactor ?? 2.5) - (b.easeFactor ?? 2.5);
      } else if (sortKey === 'front') {
        cmp = a.front.localeCompare(b.front);
      } else if (sortKey === 'interval') {
        cmp = (a.intervalDays ?? 0) - (b.intervalDays ?? 0);
      } else if (sortKey === 'ease') {
        cmp = (a.easeFactor ?? 2.5) - (b.easeFactor ?? 2.5);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [cards, statusFilter, search, sortKey, sortDir]);

  // â”€â”€ Status counts â”€â”€
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cards.length, new: 0, learning: 0, review: 0, suspended: 0, leeches: 0 };
    for (const c of cards) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
      if (isLeech(c)) counts.leeches++;
    }
    return counts;
  }, [cards]);

  // â”€â”€ Stat pills â”€â”€
  const newCount = statusCounts.new ?? 0;
  const learningCount = statusCounts.learning ?? 0;
  const masteredCount = statusCounts.review ?? 0;

  // â”€â”€ Handlers â”€â”€
  const handleCreateCard = async (data: CreateCardInput) => {
    try {
      await createCard.mutateAsync({ ...data, deckId });
      toast.success('Card created');
      setShowAddForm(false);
    } catch {
      toast.error('Failed to create card');
    }
  };

  const handleUpdateCard = async (cardId: string, data: UpdateCardInput) => {
    try {
      await updateCard.mutateAsync({ id: cardId, data });
      toast.success('Card updated');
      setEditingCardId(null);
    } catch {
      toast.error('Failed to update card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteCard.mutateAsync(cardId);
      toast.success('Card deleted');
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(cardId); return next; });
    } catch {
      toast.error('Failed to delete card');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    let ok = 0;
    for (const id of ids) {
      try { await deleteCard.mutateAsync(id); ok++; } catch {}
    }
    toast.success(`Deleted ${ok} card${ok !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleBulkSuspend = async (ids: string[]) => {
    const selectedCards = cards.filter((c) => ids.includes(c.id));
    const allSuspended = selectedCards.every((c) => c.status === 'suspended');
    const newStatus: CardStatus = allSuspended ? 'new' : 'suspended';
    let ok = 0;
    for (const id of ids) {
      try { await updateCard.mutateAsync({ id: id, data: { status: newStatus } }); ok++; } catch {}
    }
    toast.success(`${allSuspended ? 'Unsuspended' : 'Suspended'} ${ok} card${ok !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleBulkAddTag = async (ids: string[], tag: string) => {
    let ok = 0;
    for (const id of ids) {
      const card = cards.find((c) => c.id === id);
      if (!card) continue;
      const tags = Array.from(new Set([...(card.tags ?? []), tag]));
      try { await updateCard.mutateAsync({ id: id, data: { tags } }); ok++; } catch {}
    }
    toast.success(`Tag "${tag}" added to ${ok} card${ok !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleBulkImport = async () => {
    const lines = bulkImportText.trim().split('\n').filter((l) => l.includes('|'));
    let created = 0;
    for (const line of lines) {
      const [front, ...backParts] = line.split('|');
      const back = backParts.join('|').trim();
      const f = front.trim();
      if (f && back) {
        try { await createCard.mutateAsync({ front: f, back, deckId }); created++; } catch {}
      }
    }
    toast.success(`Imported ${created} card${created !== 1 ? 's' : ''}`);
    setBulkImportText('');
    setShowBulkImport(false);
  };

  const toggleReveal = (cardId: string) => {
    setRevealedCardIds((prev) => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  };

  const toggleSelect = (cardId: string, index: number, shiftHeld: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftHeld && lastClickedIdx.current !== null) {
        const lo = Math.min(lastClickedIdx.current, index);
        const hi = Math.max(lastClickedIdx.current, index);
        const range = filteredCards.slice(lo, hi + 1).map((c) => c.id);
        range.forEach((id) => next.add(id));
      } else {
        next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      }
      lastClickedIdx.current = index;
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.35 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    background: 'var(--color-bg-secondary)',
    borderBottom: '1px solid var(--color-border)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const infoCard = infoCardId ? cards.find((c) => c.id === infoCardId) : null;

  return (
    <div style={{ color: 'var(--color-text-primary)' }}>
      {/* â”€â”€ Stat Pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'New', count: newCount, color: 'var(--color-accent)' },
          { label: 'Learning', count: learningCount, color: 'var(--color-warning)' },
          { label: 'Mastered', count: masteredCount, color: 'var(--color-success)' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{count}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {onStudyAll && (
          <button
            onClick={onStudyAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-accent)', border: 'none', borderRadius: '999px', padding: '5px 14px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            <BookOpen size={14} /> Study All
          </button>
        )}
      </div>

      {/* â”€â”€ Toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cardsâ€¦"
            style={{
              width: '100%',
              paddingLeft: '30px',
              paddingRight: '10px',
              paddingTop: '7px',
              paddingBottom: '7px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Sort */}
        <select
          value={sortKey}
          onChange={(e) => { setSortKey(e.target.value as SortKey); }}
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '7px 10px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', outline: 'none' }}
        >
          <option value="created">Sort: Created</option>
          <option value="next-review">Sort: Next Review</option>
          <option value="difficulty">Sort: Difficulty</option>
          <option value="ease">Sort: Ease</option>
          <option value="interval">Sort: Interval</option>
          <option value="front">Sort: Front</option>
        </select>

        <button
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
        >
          {sortDir === 'asc' ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {/* Grid/Table Toggle */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '3px' }}>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            style={{ background: viewMode === 'grid' ? 'var(--color-accent)' : 'none', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: viewMode === 'grid' ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Grid3X3 size={15} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            title="Table view"
            style={{ background: viewMode === 'table' ? 'var(--color-accent)' : 'none', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: viewMode === 'table' ? '#fff' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Table2 size={15} />
          </button>
        </div>

        {/* Bulk Import */}
        <button
          onClick={() => setShowBulkImport((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '7px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 500 }}
        >
          <Upload size={14} /> Import
        </button>

        {/* Add Card */}
        <button
          onClick={() => setShowAddForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--color-accent)', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
        >
          <Plus size={14} /> Add Card
        </button>
      </div>

      {/* â”€â”€ Status Filter Pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all', 'new', 'learning', 'review', 'suspended', 'leeches'] as StatusFilter[]).map((f) => {
          const active = statusFilter === f;
          const label = f === 'all' ? 'All' : f === 'leeches' ? 'ðŸ©¸ Leeches' : STATUS_LABELS[f as CardStatus];
          const cnt = statusCounts[f] ?? 0;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                background: active ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {label}
              <span style={{ background: active ? 'var(--color-accent)' : 'var(--color-bg-tertiary)', color: active ? '#fff' : 'var(--color-text-muted)', borderRadius: '999px', padding: '1px 6px', fontSize: '11px' }}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* â”€â”€ Bulk Import Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showBulkImport && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-primary)' }}>
            Bulk Import â€” one card per line: <code style={{ background: 'var(--color-bg-tertiary)', padding: '1px 6px', borderRadius: '4px' }}>Front | Back</code>
          </div>
          <textarea
            value={bulkImportText}
            onChange={(e) => setBulkImportText(e.target.value)}
            rows={5}
            placeholder={"What is React? | A JS library for building UIs\nCapital of France | Paris"}
            style={{ width: '100%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px', fontSize: '13px', color: 'var(--color-text-primary)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowBulkImport(false)} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleBulkImport} style={{ background: 'var(--color-accent)', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              Import
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ Add Card Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAddForm && (
        <div style={{ marginBottom: '1rem', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem' }}>
          <CardForm
            deckId={deckId}
            onSave={(data) => handleCreateCard(data as CreateCardInput)}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {filteredCards.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <div style={{ fontSize: '14px' }}>{cards.length === 0 ? 'No cards yet. Add your first card!' : 'No cards match your filters.'}</div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* GRID VIEW                                                             */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {viewMode === 'grid' && filteredCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filteredCards.map((card, idx) => {
            const leech = isLeech(card);
            const due = isDue(card);
            const revealed = revealedCardIds.has(card.id);
            const selected = selectedIds.has(card.id);
            const ease = card.easeFactor ?? 2.5;
            const borderColor = STATUS_COLORS[card.status];

            if (editingCardId === card.id) {
              return (
                <div key={card.id} style={{ gridColumn: '1 / -1', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem' }}>
                  <CardForm
                    deckId={deckId}
                    initialData={card}
                    onSave={(data) => handleUpdateCard(card.id, data as UpdateCardInput)}
                    onCancel={() => setEditingCardId(null)}
                  />
                </div>
              );
            }

            return (
              <div
                key={card.id}
                style={{
                  background: leech ? 'color-mix(in srgb, var(--color-danger-soft) 40%, var(--color-bg-elevated))' : 'var(--color-bg-elevated)',
                  border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderLeft: `2px solid ${borderColor}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: selected ? '0 0 0 2px var(--color-accent)22' : 'var(--shadow-sm)',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  position: 'relative',
                  cursor: 'default',
                }}
              >
                {/* Top row: checkbox + status dot + badges + info + edit */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleSelect(card.id, idx, e.shiftKey)}
                    style={{
                      width: 16, height: 16, borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                      background: selected ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                      border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                  >
                    {selected && <Check size={10} color="#fff" />}
                  </button>

                  {/* Status dot */}
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: borderColor, display: 'inline-block', flexShrink: 0, marginTop: '5px' }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                      {leech && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)44' }}>ðŸ©¸ Leech</span>}
                      {due && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px', background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)44' }}>Due</span>}
                    </div>

                    {/* Front */}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {card.front}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                    <button
                      onClick={() => setInfoCardId(card.id)}
                      title="Card info"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}
                    >
                      <Info size={14} />
                    </button>
                    <button
                      onClick={() => setEditingCardId(card.id)}
                      title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '6px' }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px', borderRadius: '6px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Back â€” click to reveal */}
                <div
                  onClick={() => toggleReveal(card.id)}
                  style={{
                    fontSize: '13px',
                    color: revealed ? 'var(--color-text-secondary)' : 'transparent',
                    background: revealed ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
                    filter: revealed ? 'none' : 'blur(5px)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    lineHeight: 1.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                    wordBreak: 'break-word',
                    minHeight: '36px',
                    position: 'relative',
                    transition: 'filter 0.2s',
                  }}
                >
                  {card.back}
                  {!revealed && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      Click to reveal
                    </span>
                  )}
                </div>

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {card.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '999px', background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Ease bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${easePercent(ease)}%`, height: '100%', background: easeColor(ease), borderRadius: '999px', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '28px', textAlign: 'right' }}>
                    {ease.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TABLE VIEW                                                            */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {viewMode === 'table' && filteredCards.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: '28px' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '60px' }} />
              <col style={{ width: '70px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '90px' }} />
            </colgroup>
            <thead>
              <tr>
                {/* Select All */}
                <th style={{ ...thStyle, cursor: 'default', paddingLeft: '12px' }}>
                  <button
                    onClick={handleSelectAll}
                    style={{
                      width: 16, height: 16, borderRadius: '4px',
                      background: selectedIds.size === filteredCards.length && filteredCards.length > 0 ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                      border: `1.5px solid ${selectedIds.size === filteredCards.length && filteredCards.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                  >
                    {selectedIds.size === filteredCards.length && filteredCards.length > 0 && <Check size={10} color="#fff" />}
                  </button>
                </th>
                <th style={thStyle} />
                <th style={thStyle} onClick={() => handleTableSort('front')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Front <SortIcon col="front" /></div>
                </th>
                <th style={thStyle}>Back</th>
                <th style={thStyle}>Tags</th>
                <th style={thStyle} onClick={() => handleTableSort('ease')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Ease <SortIcon col="ease" /></div>
                </th>
                <th style={thStyle} onClick={() => handleTableSort('interval')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Interval <SortIcon col="interval" /></div>
                </th>
                <th style={thStyle} onClick={() => handleTableSort('next-review')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Next Review <SortIcon col="next-review" /></div>
                </th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card, idx) => {
                const leech = isLeech(card);
                const due = isDue(card);
                const revealed = revealedCardIds.has(card.id);
                const selected = selectedIds.has(card.id);
                const ease = card.easeFactor ?? 2.5;

                return (
                  <tr
                    key={card.id}
                    style={{
                      background: selected
                        ? 'color-mix(in srgb, var(--color-accent-soft) 60%, transparent)'
                        : leech
                        ? 'color-mix(in srgb, var(--color-danger-soft) 35%, var(--color-bg-primary))'
                        : idx % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-bg-elevated)'; }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        (e.currentTarget as HTMLTableRowElement).style.background = leech
                          ? 'color-mix(in srgb, var(--color-danger-soft) 35%, var(--color-bg-primary))'
                          : idx % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)';
                      }
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '8px 4px 8px 12px' }}>
                      <button
                        onClick={(e) => toggleSelect(card.id, idx, e.shiftKey)}
                        style={{
                          width: 16, height: 16, borderRadius: '4px',
                          background: selected ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                          border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                      >
                        {selected && <Check size={10} color="#fff" />}
                      </button>
                    </td>

                    {/* Status dot */}
                    <td style={{ padding: '8px 4px' }}>
                      <span title={STATUS_LABELS[card.status]} style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[card.status], display: 'inline-block' }} />
                    </td>

                    {/* Front */}
                    <td style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={card.front}>
                          {truncate(card.front, 50)}
                        </span>
                        {leech && <span title="Leech" style={{ flexShrink: 0, fontSize: '12px' }}>ðŸ©¸</span>}
                        {due && <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '999px', background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: '1px solid var(--color-warning)44', whiteSpace: 'nowrap' }}>Due</span>}
                      </div>
                    </td>

                    {/* Back â€” blurred */}
                    <td style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }} onClick={() => toggleReveal(card.id)}>
                      <span style={{ filter: revealed ? 'none' : 'blur(5px)', transition: 'filter 0.2s', userSelect: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={revealed ? card.back : undefined}>
                        {truncate(card.back, 50)}
                      </span>
                    </td>

                    {/* Tags */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {(card.tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
                            {tag}
                          </span>
                        ))}
                        {(card.tags ?? []).length > 3 && (
                          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>+{(card.tags ?? []).length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Ease */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: easeColor(ease), fontVariantNumeric: 'tabular-nums' }}>{ease.toFixed(2)}</span>
                        <div style={{ height: 3, background: 'var(--color-border)', borderRadius: '999px', overflow: 'hidden', width: '40px' }}>
                          <div style={{ width: `${easePercent(ease)}%`, height: '100%', background: easeColor(ease), borderRadius: '999px' }} />
                        </div>
                      </div>
                    </td>

                    {/* Interval */}
                    <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {card.intervalDays != null ? `${card.intervalDays}d` : 'â€”'}
                    </td>

                    {/* Next Review */}
                    <td style={{ padding: '8px 12px', fontSize: '12px', color: due ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatDate(card.nextReview)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 8px' }}>
                      <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setInfoCardId(card.id)} title="Info" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '5px' }}>
                          <Info size={13} />
                        </button>
                        <button onClick={() => setEditingCardId(card.id)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '5px' }}>
                          <Edit3 size={13} />
                        </button>
                        <button onClick={() => handleDeleteCard(card.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: '4px', borderRadius: '5px' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* â”€â”€ Card Info Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {infoCard && (
        <CardInfoModal card={infoCard} onClose={() => setInfoCardId(null)} />
      )}

      {/* â”€â”€ Inline Edit Modal (table mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editingCardId && viewMode === 'table' && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingCardId(null); }}
        >
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '16px', boxShadow: 'var(--shadow-popup)', width: '100%', maxWidth: '520px', padding: '1.5rem' }}>
            {(() => {
              const ec = cards.find((c) => c.id === editingCardId);
              if (!ec) return null;
              return (
                <CardForm
                  deckId={deckId}
                  initialData={ec}
                  onSave={(data) => handleUpdateCard(ec.id, data as UpdateCardInput)}
                  onCancel={() => setEditingCardId(null)}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* â”€â”€ Floating Bulk Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <BulkBar
        selectedIds={selectedIds}
        cards={cards}
        onClear={() => setSelectedIds(new Set())}
        onDelete={handleBulkDelete}
        onSuspend={handleBulkSuspend}
        onAddTag={handleBulkAddTag}
      />
    </div>
  );
};

export { CardList };
export default CardList;
