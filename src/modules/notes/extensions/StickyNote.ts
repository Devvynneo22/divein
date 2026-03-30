import { Node, mergeAttributes } from '@tiptap/core';

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'lavender';

export interface StickyNoteOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    stickyNote: {
      insertStickyNote: (color?: StickyNoteColor) => ReturnType;
    };
  }
}

export const StickyNote = Node.create<StickyNoteOptions>({
  name: 'stickyNote',

  group: 'block',

  content: 'paragraph+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: 'yellow' as StickyNoteColor,
        parseHTML: (element) => element.getAttribute('data-sticky-color') as StickyNoteColor,
        renderHTML: (attributes) => ({
          'data-sticky-color': (attributes.color as string) ?? 'yellow',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-sticky-color]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const color = (HTMLAttributes['data-sticky-color'] as StickyNoteColor) ?? 'yellow';
    return [
      'div',
      mergeAttributes(
        { class: `sticky-note sticky-note--${color}`, 'data-sticky-color': color },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      insertStickyNote:
        (color: StickyNoteColor = 'yellow') =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { color },
              content: [{ type: 'paragraph' }],
            })
            .run();
        },
    };
  },
});
