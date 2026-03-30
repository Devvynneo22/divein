import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success' | 'danger' | 'note';

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  danger: '🚨',
  note: '📝',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (calloutType?: CalloutType) => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

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
      calloutType: {
        default: 'info' as CalloutType,
        parseHTML: (element) => element.getAttribute('data-callout-type') as CalloutType,
        renderHTML: (attributes) => ({
          'data-callout-type': (attributes.calloutType as string) ?? 'info',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = (HTMLAttributes['data-callout-type'] as CalloutType) ?? 'info';
    const icon = CALLOUT_ICONS[type] ?? 'ℹ️';
    return [
      'div',
      mergeAttributes(
        { class: 'callout', 'data-callout-type': type },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ['span', { class: 'callout-icon', contenteditable: 'false' }, icon],
      ['div', { class: 'callout-content' }, 0],
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (calloutType: CalloutType = 'info') =>
        ({ commands, state }) => {
          const { to } = state.selection;
          return commands.insertContentAt(to, {
            type: this.name,
            attrs: { calloutType },
            content: [{ type: 'paragraph' }],
          });
        },
    };
  },
});
