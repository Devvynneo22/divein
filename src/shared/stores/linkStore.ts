import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LinkableType = 'task' | 'note' | 'project' | 'event' | 'habit' | 'deck';

export interface CrossLink {
  id: string;          // unique link ID
  sourceType: LinkableType;
  sourceId: string;
  targetType: LinkableType;
  targetId: string;
  createdAt: string;   // ISO 8601
}

interface LinkStoreState {
  links: CrossLink[];
  addLink: (source: { type: LinkableType; id: string }, target: { type: LinkableType; id: string }) => void;
  removeLink: (linkId: string) => void;
  getLinksFor: (type: LinkableType, id: string) => CrossLink[];
  getLinkedItems: (type: LinkableType, id: string) => { type: LinkableType; id: string }[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLinkStore = create<LinkStoreState>()(
  persist(
    (set, get) => ({
      links: [],

      addLink: (source, target) => {
        // Prevent self-links
        if (source.type === target.type && source.id === target.id) return;

        const existing = get().links;
        // Check if link already exists (either direction)
        const alreadyExists = existing.some(
          (l) =>
            (l.sourceType === source.type && l.sourceId === source.id &&
             l.targetType === target.type && l.targetId === target.id) ||
            (l.sourceType === target.type && l.sourceId === target.id &&
             l.targetType === source.type && l.targetId === source.id),
        );
        if (alreadyExists) return;

        const newLink: CrossLink = {
          id: crypto.randomUUID(),
          sourceType: source.type,
          sourceId: source.id,
          targetType: target.type,
          targetId: target.id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ links: [...state.links, newLink] }));
      },

      removeLink: (linkId) => {
        set((state) => ({ links: state.links.filter((l) => l.id !== linkId) }));
      },

      getLinksFor: (type, id) => {
        return get().links.filter(
          (l) =>
            (l.sourceType === type && l.sourceId === id) ||
            (l.targetType === type && l.targetId === id),
        );
      },

      getLinkedItems: (type, id) => {
        const links = get().getLinksFor(type, id);
        return links.map((l) => {
          if (l.sourceType === type && l.sourceId === id) {
            return { type: l.targetType, id: l.targetId };
          }
          return { type: l.sourceType, id: l.sourceId };
        });
      },
    }),
    {
      name: 'divein-cross-links',
    },
  ),
);
