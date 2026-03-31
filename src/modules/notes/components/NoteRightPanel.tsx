import { useState, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/shared/types/note';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import { LinkedItemsPanel } from '@/shared/components/LinkedItemsPanel';
import { NoteGraph } from './NoteGraph';

interface NoteRightPanelProps {
  editor: Editor | null;
  note: Note;
  onNavigateToHeading: (pos: number) => void;
}

interface HeadingItem {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

type Tab = 'contents' | 'info' | 'links';

export function NoteRightPanel({ editor, note, onNavigateToHeading }: NoteRightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('contents');
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  const parseHeadings = useCallback(() => {
    if (!editor) return;

    const items: HeadingItem[] = [];
    editor.getJSON().content?.forEach((node, _idx) => {
      if (node.type === 'heading' && node.attrs && node.content) {
        const level = (node.attrs as { level: number }).level as 1 | 2 | 3;
        const text = node.content
          .filter((n) => n.type === 'text')
          .map((n) => (n as { type: string; text?: string }).text ?? '')
          .join('');
        if (text.trim()) {
          // Find position of this heading node
          let pos = 0;
          let found = false;
          editor.state.doc.descendants((docNode, nodePos) => {
            if (found) return false;
            if (
              docNode.type.name === 'heading' &&
              docNode.attrs.level === level &&
              docNode.textContent === text
            ) {
              pos = nodePos;
              found = true;
              return false;
            }
            return true;
          });
          items.push({ level, text, pos });
        }
      }
    });

    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    parseHeadings();
    editor.on('update', parseHeadings);
    return () => {
      editor.off('update', parseHeadings);
    };
  }, [editor, parseHeadings]);

  const handleHeadingClick = useCallback(
    (heading: HeadingItem) => {
      if (!editor) return;
      onNavigateToHeading(heading.pos);
      editor.commands.setTextSelection(heading.pos + 1);
      editor.commands.scrollIntoView();
    },
    [editor, onNavigateToHeading],
  );

  const formatDate = (dateStr: string | Date | undefined) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const sevenDaysAgo = subDays(new Date(), 7);
    if (isAfter(date, sevenDaysAgo)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, yyyy');
  };

  const wordCount = note.wordCount ?? 0;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {/* Tab switcher */}
      <div
        className="flex items-center shrink-0 px-3 pt-3 gap-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {(['contents', 'info', 'links'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="pb-2 text-xs font-medium capitalize transition-colors relative"
            style={{
              color:
                activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            }}
          >
            {tab === 'contents' ? 'Contents' : tab === 'info' ? 'Info' : 'Links'}
            {activeTab === tab && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-accent)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto py-3">
        {activeTab === 'contents' ? (
          <ContentsTab headings={headings} onHeadingClick={handleHeadingClick} />
        ) : activeTab === 'info' ? (
          <InfoTab
            note={note}
            wordCount={wordCount}
            readingTime={readingTime}
            formatDate={formatDate}
          />
        ) : (
          <div className="px-3 py-2">
            <LinkedItemsPanel sourceType="note" sourceId={note.id} />
          </div>
        )}

        {/* Mini graph — always shown below tab content */}
        <MiniGraphSection noteId={note.id} />
      </div>
    </div>
  );
}

// ─── Mini Graph Section ───────────────────────────────────────────────────────

function MiniGraphSection({ noteId }: { noteId: string }) {
  return (
    <div style={{ padding: '12px 8px 4px' }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        Connections
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <NoteGraph
          selectedNoteId={noteId}
          onSelectNote={() => {}}
          mini
          miniNoteId={noteId}
        />
      </div>
    </div>
  );
}

// ─── Contents Tab ─────────────────────────────────────────────────────────────

function ContentsTab({
  headings,
  onHeadingClick,
}: {
  headings: HeadingItem[];
  onHeadingClick: (h: HeadingItem) => void;
}) {
  if (headings.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Add headings to see the table of contents
        </p>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-0.5">
      {headings.map((h, i) => (
        <button
          key={i}
          onClick={() => onHeadingClick(h)}
          className="w-full text-left rounded px-2 py-1 transition-colors block truncate"
          style={{
            paddingLeft: h.level === 1 ? 8 : h.level === 2 ? 16 : 24,
            fontSize: h.level === 1 ? 13 : 12,
            fontWeight: h.level === 1 ? 600 : 400,
            color:
              h.level === 3 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
          }}
          title={h.text}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color =
              h.level === 3 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)';
          }}
        >
          {h.text}
        </button>
      ))}
    </div>
  );
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({
  note,
  wordCount,
  readingTime,
  formatDate,
}: {
  note: Note;
  wordCount: number;
  readingTime: number;
  formatDate: (d: string | Date | undefined) => string;
}) {
  return (
    <div className="px-4 space-y-4">
      {/* Word count */}
      <InfoRow label="Words" value={`${wordCount} words`} />
      <InfoRow label="Reading time" value={`~${readingTime} min read`} />

      {/* Dates */}
      <InfoRow
        label="Created"
        value={formatDate(note.createdAt as unknown as string | Date | undefined)}
      />
      <InfoRow
        label="Updated"
        value={formatDate(note.updatedAt as unknown as string | Date | undefined)}
      />

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold block mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tags
          </span>
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[11px]"
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        className="text-[10px] uppercase tracking-widest font-semibold block mb-0.5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        {value}
      </span>
    </div>
  );
}
