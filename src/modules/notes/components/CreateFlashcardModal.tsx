import { useState, useEffect, useRef } from 'react';
import { X, Brain, Plus, Check, Loader2 } from 'lucide-react';
import { useDecks, useCreateDeck, useCreateCard } from '@/modules/flashcards/hooks/useFlashcards';

interface CreateFlashcardModalProps {
  selectedText: string;
  sourceNoteId?: string;
  onClose: () => void;
}

export function CreateFlashcardModal({
  selectedText,
  sourceNoteId,
  onClose,
}: CreateFlashcardModalProps) {
  const [front, setFront] = useState(selectedText);
  const [back, setBack] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const backRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { data: decks = [], isLoading: decksLoading } = useDecks();
  const createDeck = useCreateDeck();
  const createCard = useCreateCard();

  // Auto-select first deck
  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  // Focus back field on mount
  useEffect(() => {
    setTimeout(() => backRef.current?.focus(), 100);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const isSaving = createCard.isPending || createDeck.isPending;

  const handleSave = async () => {
    setError('');

    if (!front.trim()) {
      setError('Front side cannot be empty');
      return;
    }
    if (!back.trim()) {
      setError('Back side cannot be empty');
      return;
    }

    try {
      let deckId = selectedDeckId;

      // Create new deck if needed
      if (showNewDeck) {
        if (!newDeckName.trim()) {
          setError('Deck name cannot be empty');
          return;
        }
        const newDeck = await createDeck.mutateAsync({ name: newDeckName.trim() });
        deckId = newDeck.id;
      }

      if (!deckId) {
        setError('Please select or create a deck');
        return;
      }

      await createCard.mutateAsync({
        deckId,
        front: front.trim(),
        back: back.trim(),
        sourceNoteId,
      });

      setSuccess(true);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flashcard');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
            <Brain size={18} className="text-[var(--color-accent)]" />
            <span className="font-semibold text-sm">Create Flashcard</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Front */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
              Front (Question)
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              placeholder="Question or prompt..."
            />
          </div>

          {/* Back */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
              Back (Answer)
            </label>
            <textarea
              ref={backRef}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm resize-none focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              placeholder="Answer..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>

          {/* Deck selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
              Deck
            </label>
            {!showNewDeck ? (
              <div className="flex gap-2">
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={decksLoading}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                >
                  {decksLoading && <option>Loading...</option>}
                  {!decksLoading && decks.length === 0 && (
                    <option value="">No decks — create one</option>
                  )}
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewDeck(true)}
                  title="Create new deck"
                  className="px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="New deck name..."
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                />
                <button
                  onClick={() => {
                    setShowNewDeck(false);
                    setNewDeckName('');
                  }}
                  className="px-2.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || success}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              success
                ? 'bg-green-600 text-white'
                : 'bg-[var(--color-accent)] text-white hover:opacity-90'
            } disabled:opacity-50`}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : success ? (
              <>
                <Check size={14} />
                Created!
              </>
            ) : (
              'Create Card'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
