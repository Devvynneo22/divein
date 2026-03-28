import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flashcardService } from '@/shared/lib/flashcardService';
import type {
  CreateDeckInput,
  UpdateDeckInput,
  CreateCardInput,
  UpdateCardInput,
  ReviewQuality,
} from '@/shared/types/flashcard';

const DECKS_KEY = ['flashcard-decks'] as const;
const CARDS_KEY = ['flashcard-cards'] as const;
const DUE_KEY = ['flashcard-due-total'] as const;

// ── Decks ─────────────────────────────────────────────────────────────────────

export function useDecks() {
  return useQuery({
    queryKey: DECKS_KEY,
    queryFn: () => flashcardService.listDecks(),
  });
}

export function useDeck(id: string) {
  return useQuery({
    queryKey: [...DECKS_KEY, id],
    queryFn: () => flashcardService.getDeck(id),
    enabled: !!id,
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeckInput) => flashcardService.createDeck(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}

export function useUpdateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeckInput }) =>
      flashcardService.updateDeck(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flashcardService.deleteDeck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DECKS_KEY });
      qc.invalidateQueries({ queryKey: CARDS_KEY });
      qc.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export function useCards(deckId: string) {
  return useQuery({
    queryKey: [...CARDS_KEY, deckId],
    queryFn: () => flashcardService.listCards(deckId),
    enabled: !!deckId,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => flashcardService.createCard(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...CARDS_KEY, variables.deckId] });
      qc.invalidateQueries({ queryKey: DECKS_KEY });
    },
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCardInput }) =>
      flashcardService.updateCard(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARDS_KEY });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flashcardService.deleteCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARDS_KEY });
      qc.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

// ── Study ─────────────────────────────────────────────────────────────────────

export function useStudyQueue(deckId: string) {
  return useQuery({
    queryKey: ['flashcard-study-queue', deckId],
    queryFn: () => flashcardService.getStudyQueue(deckId),
    enabled: !!deckId,
  });
}

export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: ReviewQuality }) =>
      flashcardService.reviewCard(cardId, quality),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARDS_KEY });
      qc.invalidateQueries({ queryKey: ['flashcard-study-queue'] });
      qc.invalidateQueries({ queryKey: DUE_KEY });
    },
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useDeckStats(deckId: string) {
  return useQuery({
    queryKey: ['flashcard-stats', deckId],
    queryFn: () => flashcardService.getDeckStats(deckId),
    enabled: !!deckId,
  });
}

export function useTotalDueToday() {
  return useQuery({
    queryKey: DUE_KEY,
    queryFn: () => flashcardService.getTotalDueToday(),
  });
}
