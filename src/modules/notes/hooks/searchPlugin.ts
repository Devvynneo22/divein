import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface SearchState {
  query: string;
  matches: Array<{ from: number; to: number }>;
  currentIndex: number;
}

export const searchPluginKey = new PluginKey<SearchState>('search');

function findMatches(doc: import('prosemirror-model').Node, query: string) {
  const matches: Array<{ from: number; to: number }> = [];
  if (!query) return matches;

  const normalizedQuery = query.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text ?? '';
    const normalized = text.toLowerCase();
    let idx = normalized.indexOf(normalizedQuery);
    while (idx !== -1) {
      matches.push({ from: pos + idx, to: pos + idx + normalizedQuery.length });
      idx = normalized.indexOf(normalizedQuery, idx + 1);
    }
  });

  return matches;
}

export const searchPlugin = new Plugin<SearchState>({
  key: searchPluginKey,

  state: {
    init() {
      return { query: '', matches: [], currentIndex: 0 };
    },
    apply(tr, value) {
      const meta = tr.getMeta(searchPluginKey) as Partial<SearchState> | undefined;
      if (meta !== undefined) {
        const newQuery = meta.query ?? value.query;
        const matches =
          meta.query !== undefined ? findMatches(tr.doc, newQuery) : value.matches;
        const currentIndex = meta.currentIndex ?? (meta.query !== undefined ? 0 : value.currentIndex);
        return { query: newQuery, matches, currentIndex };
      }

      // Re-run match positions when document changes
      if (tr.docChanged && value.query) {
        const matches = findMatches(tr.doc, value.query);
        return { ...value, matches };
      }

      return value;
    },
  },

  props: {
    decorations(state) {
      const pluginState = searchPluginKey.getState(state);
      if (!pluginState || !pluginState.query) return DecorationSet.empty;

      const decorations = pluginState.matches.map((match, idx) => {
        const isCurrent = idx === pluginState.currentIndex;
        return Decoration.inline(match.from, match.to, {
          class: isCurrent ? 'search-match-current' : 'search-match',
        });
      });

      return DecorationSet.create(state.doc, decorations);
    },
  },
});
