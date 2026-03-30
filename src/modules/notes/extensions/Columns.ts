import { Node, mergeAttributes } from '@tiptap/core';

export interface ColumnsOptions {
  HTMLAttributes: Record<string, unknown>;
}

export interface ColumnOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: () => ReturnType;
    };
  }
}

export const Column = Node.create<ColumnOptions>({
  name: 'column',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-column]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ class: 'column', 'data-column': '' }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

export const Columns = Node.create<ColumnsOptions>({
  name: 'columns',

  group: 'block',

  content: 'column{2,}',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-columns]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ class: 'columns-layout', 'data-columns': '' }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumns:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: 'column',
                  content: [{ type: 'paragraph' }],
                },
                {
                  type: 'column',
                  content: [{ type: 'paragraph' }],
                },
              ],
            })
            .run();
        },
    };
  },
});
