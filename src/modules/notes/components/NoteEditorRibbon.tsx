import { useEffect, useRef, useState } from 'react';
import { type Editor } from '@tiptap/react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Search,
  Brain,
  Maximize2,
  ImageIcon,
  SmilePlus,
  Table as TableIcon,
  Columns2,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  ChevronUp,
  ChevronDown,
  PanelRight,
} from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';

// ─── Text colors ──────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  { color: '#fafafa', label: 'White' },
  { color: '#a1a1aa', label: 'Gray' },
  { color: '#ef4444', label: 'Red' },
  { color: '#f97316', label: 'Orange' },
  { color: '#eab308', label: 'Yellow' },
  { color: '#22c55e', label: 'Green' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#ec4899', label: 'Pink' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type RibbonTab = 'home' | 'insert' | 'view' | 'table' | 'image';

export interface NoteEditorRibbonProps {
  editor: Editor;
  triggerFileInput: () => void;
  showFindReplace: boolean;
  onToggleFindReplace: () => void;
  zenMode: boolean;
  onToggleZen: () => void;
  rightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  hasSelection: boolean;
  onCreateFlashcard: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RibbonBtn({
  onClick,
  active = false,
  title,
  children,
  disabled = false,
  danger = false,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        borderRadius: 5,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        transition: 'background 100ms, color 100ms',
        backgroundColor: active
          ? 'var(--color-accent-soft)'
          : 'transparent',
        color: danger
          ? 'var(--color-danger)'
          : active
          ? 'var(--color-accent)'
          : disabled
          ? 'var(--color-text-muted)'
          : 'var(--color-text-muted)',
        opacity: disabled ? 0.45 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (!active) {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          e.currentTarget.style.color = danger
            ? 'var(--color-danger)'
            : 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = danger
            ? 'var(--color-danger)'
            : 'var(--color-text-muted)';
        }
      }}
    >
      {children}
    </button>
  );
}

function SmallPillBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      style={{
        fontSize: 11,
        padding: '3px 7px',
        borderRadius: 5,
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-tertiary)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 100ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
      }}
    >
      {children}
    </button>
  );
}

function GroupDivider() {
  return (
    <div
      style={{
        width: 1,
        height: '60%',
        backgroundColor: 'var(--color-border)',
        alignSelf: 'center',
        margin: '0 3px',
        flexShrink: 0,
      }}
    />
  );
}

interface GroupProps {
  label: string;
  children: React.ReactNode;
}

function Group({ label, children }: GroupProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 6px 3px',
        gap: 2,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, flexWrap: 'nowrap' }}>
        {children}
      </div>
      <span
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Main Ribbon ──────────────────────────────────────────────────────────────

export function NoteEditorRibbon({
  editor,
  triggerFileInput,
  showFindReplace,
  onToggleFindReplace,
  zenMode: _zenMode,
  onToggleZen,
  rightPanelOpen,
  onToggleRightPanel,
  hasSelection,
  onCreateFlashcard,
  showEmojiPicker,
  onToggleEmojiPicker,
}: NoteEditorRibbonProps) {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // ─── Auto context tabs ─────────────────────────────────────────────────────

  useEffect(() => {
    const updateContextTab = () => {
      if (editor.isActive('image')) {
        setActiveTab('image');
      } else if (editor.isActive('table')) {
        setActiveTab('table');
      } else if (activeTab === 'table' || activeTab === 'image') {
        setActiveTab('home');
      }
    };
    editor.on('selectionUpdate', updateContextTab);
    return () => { editor.off('selectionUpdate', updateContextTab); };
  }, [editor, activeTab]);

  // ─── Close color picker on outside click ──────────────────────────────────

  useEffect(() => {
    if (!showColorPicker) return;
    function handler(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  const showTable = editor.isActive('table');
  const showImage = editor.isActive('image');

  const tabStyle = (tab: RibbonTab): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 500,
    padding: '0 11px',
    height: '100%',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
    transition: 'color 100ms',
    whiteSpace: 'nowrap',
  });

  const contextTabStyle = (tab: RibbonTab): React.CSSProperties => ({
    ...tabStyle(tab),
    backgroundColor: activeTab === tab ? 'var(--color-accent-soft)' : 'transparent',
    color: 'var(--color-accent)',
    borderRadius: 4,
    padding: '0 9px',
    border: activeTab === tab ? '1px solid var(--color-accent)' : '1px solid transparent',
    borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
  });

  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-primary)',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* ── Tab bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          paddingLeft: 4,
        }}
      >
        {(
          [
            { id: 'home', label: 'Home' },
            { id: 'insert', label: 'Insert' },
            { id: 'view', label: 'View' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            style={tabStyle(id)}
            onMouseDown={(e) => { e.preventDefault(); setActiveTab(id); }}
          >
            {label}
          </button>
        ))}

        {showTable && (
          <button style={contextTabStyle('table')} onMouseDown={(e) => { e.preventDefault(); setActiveTab('table'); }}>
            Table
          </button>
        )}
        {showImage && (
          <button style={contextTabStyle('image')} onMouseDown={(e) => { e.preventDefault(); setActiveTab('image'); }}>
            Image
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onMouseDown={(e) => { e.preventDefault(); setCollapsed((v) => !v); }}
          title={collapsed ? 'Expand ribbon' : 'Collapse ribbon'}
          style={{
            marginLeft: 'auto',
            marginRight: 4,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* ── Content area ── */}
      <div
        style={{
          maxHeight: collapsed ? 0 : 84,
          overflow: 'hidden',
          transition: 'max-height 150ms ease',
          backgroundColor: 'var(--color-bg-secondary)',
          borderTop: collapsed ? 'none' : '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            minHeight: 70,
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
        >
          {/* ── HOME Tab ── */}
          {activeTab === 'home' && (
            <>
              <Group label="Edit">
                <RibbonBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
                  <Undo size={15} />
                </RibbonBtn>
                <RibbonBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Shift+Z)">
                  <Redo size={15} />
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Format">
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  active={editor.isActive('bold')}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  active={editor.isActive('italic')}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  active={editor.isActive('underline')}
                  title="Underline (Ctrl+U)"
                >
                  <UnderlineIcon size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  active={editor.isActive('strike')}
                  title="Strikethrough"
                >
                  <Strikethrough size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                  active={editor.isActive('highlight')}
                  title="Highlight"
                >
                  <Highlighter size={15} />
                </RibbonBtn>

                {/* Color picker button */}
                <div style={{ position: 'relative' }} ref={colorPickerRef}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setShowColorPicker((v) => !v); }}
                    title="Text color"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      backgroundColor: showColorPicker ? 'var(--color-accent-soft)' : 'transparent',
                      color: showColorPicker ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => {
                      if (!showColorPicker) {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!showColorPicker) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: (editor.getAttributes('textStyle').color as string | undefined) ?? 'inherit',
                        lineHeight: 1,
                      }}
                    >
                      A
                    </span>
                    <span style={{ fontSize: 9 }}>▾</span>
                  </button>
                  {showColorPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        zIndex: 100,
                        padding: 8,
                        borderRadius: 10,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        width: 128,
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-popup)',
                      }}
                    >
                      {TEXT_COLORS.map(({ color, label }) => (
                        <button
                          key={color}
                          title={label}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            editor.chain().focus().setColor(color).run();
                            setShowColorPicker(false);
                          }}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: '1px solid rgba(0,0,0,0.2)',
                            backgroundColor: color,
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          editor.chain().focus().unsetColor().run();
                          setShowColorPicker(false);
                        }}
                        style={{
                          width: '100%',
                          fontSize: 11,
                          marginTop: 2,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--color-text-muted)',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </Group>
              <GroupDivider />

              <Group label="Paragraph">
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={editor.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={editor.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  <span style={{ fontSize: 11, fontWeight: 700 }}>H2</span>
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={editor.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  <span style={{ fontSize: 11, fontWeight: 700 }}>H3</span>
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().setParagraph().run()}
                  active={editor.isActive('paragraph')}
                  title="Normal text"
                >
                  <span style={{ fontSize: 12 }}>Aa</span>
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Structure">
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  active={editor.isActive('bulletList')}
                  title="Bullet list"
                >
                  <List size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  active={editor.isActive('orderedList')}
                  title="Ordered list"
                >
                  <ListOrdered size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleTaskList().run()}
                  active={editor.isActive('taskList')}
                  title="Task list"
                >
                  <CheckSquare size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  active={editor.isActive('blockquote')}
                  title="Blockquote"
                >
                  <Quote size={15} />
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Code">
                <RibbonBtn
                  onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                  active={editor.isActive('codeBlock')}
                  title="Code block"
                >
                  <Code2 size={15} />
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Tools">
                <RibbonBtn
                  onClick={onToggleFindReplace}
                  active={showFindReplace}
                  title="Find & Replace (Ctrl+F)"
                >
                  <Search size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => onCreateFlashcard()}
                  active={false}
                  disabled={!hasSelection}
                  title={hasSelection ? 'Create flashcard from selection' : 'Select text first'}
                >
                  <Brain size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={onToggleZen}
                  active={false}
                  title="Zen mode (Ctrl+Shift+F)"
                >
                  <Maximize2 size={15} />
                </RibbonBtn>
              </Group>
            </>
          )}

          {/* ── INSERT Tab ── */}
          {activeTab === 'insert' && (
            <>
              <Group label="Media">
                <RibbonBtn onClick={triggerFileInput} title="Insert image">
                  <ImageIcon size={15} />
                </RibbonBtn>
                <div style={{ position: 'relative' }}>
                  <RibbonBtn
                    onClick={onToggleEmojiPicker}
                    active={showEmojiPicker}
                    title="Insert emoji"
                  >
                    <SmilePlus size={15} />
                  </RibbonBtn>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => {
                        editor.chain().focus().insertContent(emoji).run();
                      }}
                      onClose={onToggleEmojiPicker}
                    />
                  )}
                </div>
              </Group>
              <GroupDivider />

              <Group label="Tables">
                <RibbonBtn
                  onClick={() => {
                    const { to } = editor.state.selection;
                    editor.chain().focus().insertContentAt(to, {
                      type: 'table',
                      content: [
                        {
                          type: 'tableRow',
                          content: [
                            { type: 'tableHeader', content: [{ type: 'paragraph' }] },
                            { type: 'tableHeader', content: [{ type: 'paragraph' }] },
                            { type: 'tableHeader', content: [{ type: 'paragraph' }] },
                          ],
                        },
                        {
                          type: 'tableRow',
                          content: [
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                          ],
                        },
                        {
                          type: 'tableRow',
                          content: [
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                            { type: 'tableCell', content: [{ type: 'paragraph' }] },
                          ],
                        },
                      ],
                    }).run();
                  }}
                  title="Insert table"
                >
                  <TableIcon size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().insertColumns().run()}
                  title="2 columns"
                >
                  <Columns2 size={15} />
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Blocks">
                <RibbonBtn
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  title="Divider"
                >
                  <Minus size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: 'paragraph',
                      content: [{ type: 'text', text: '⋆ ⋆ ⋆' }],
                    }).run();
                  }}
                  title="Ornamental divider"
                >
                  <span style={{ fontSize: 13 }}>⋆</span>
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Callouts">
                {(
                  [
                    { type: 'info', emoji: 'ℹ️', title: 'Info callout' },
                    { type: 'warning', emoji: '⚠️', title: 'Warning callout' },
                    { type: 'success', emoji: '✅', title: 'Success callout' },
                    { type: 'danger', emoji: '🚨', title: 'Danger callout' },
                    { type: 'note', emoji: '📝', title: 'Note callout' },
                  ] as const
                ).map(({ type, emoji, title }) => (
                  <button
                    key={type}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().insertCallout(type).run();
                    }}
                    title={title}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      backgroundColor: 'transparent',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {emoji}
                  </button>
                ))}
              </Group>
              <GroupDivider />

              <Group label="Notes">
                {(
                  [
                    { color: 'yellow', emoji: '📌', title: 'Yellow sticky note' },
                    { color: 'pink', emoji: '🌸', title: 'Pink sticky note' },
                    { color: 'blue', emoji: '💙', title: 'Blue sticky note' },
                  ] as const
                ).map(({ color, emoji, title }) => (
                  <button
                    key={color}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().insertStickyNote(color).run();
                    }}
                    title={title}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 5,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      backgroundColor: 'transparent',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {emoji}
                  </button>
                ))}
              </Group>
            </>
          )}

          {/* ── VIEW Tab ── */}
          {activeTab === 'view' && (
            <>
              <Group label="Panels">
                <button
                  onMouseDown={(e) => { e.preventDefault(); onToggleRightPanel(); }}
                  title={rightPanelOpen ? 'Hide outline' : 'Show outline'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500,
                    backgroundColor: rightPanelOpen ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
                    color: rightPanelOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    transition: 'background 100ms',
                  }}
                >
                  <PanelRight size={13} />
                  <span>{rightPanelOpen ? '⊟ Outline' : '⊞ Outline'}</span>
                </button>
              </Group>
              <GroupDivider />

              <Group label="Focus">
                <RibbonBtn onClick={onToggleZen} title="Zen mode (Ctrl+Shift+F)">
                  <Maximize2 size={15} />
                </RibbonBtn>
              </Group>
            </>
          )}

          {/* ── TABLE Context Tab ── */}
          {activeTab === 'table' && (
            <>
              <Group label="Rows">
                <SmallPillBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row above">
                  Add ↑
                </SmallPillBtn>
                <SmallPillBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below">
                  Add ↓
                </SmallPillBtn>
                <SmallPillBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row">
                  Del row
                </SmallPillBtn>
              </Group>
              <GroupDivider />

              <Group label="Columns">
                <SmallPillBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column left">
                  Add ←
                </SmallPillBtn>
                <SmallPillBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column right">
                  Add →
                </SmallPillBtn>
                <SmallPillBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column">
                  Del col
                </SmallPillBtn>
              </Group>
              <GroupDivider />

              <Group label="Table">
                <SmallPillBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">
                  Delete table
                </SmallPillBtn>
              </Group>
            </>
          )}

          {/* ── IMAGE Context Tab ── */}
          {activeTab === 'image' && (
            <>
              <Group label="Align">
                <RibbonBtn
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
                  active={(editor.getAttributes('image').align as string) === 'left'}
                  title="Align left"
                >
                  <AlignLeft size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
                  active={
                    !(editor.getAttributes('image').align as string) ||
                    (editor.getAttributes('image').align as string) === 'center'
                  }
                  title="Align center"
                >
                  <AlignCenter size={15} />
                </RibbonBtn>
                <RibbonBtn
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
                  active={(editor.getAttributes('image').align as string) === 'right'}
                  title="Align right"
                >
                  <AlignRight size={15} />
                </RibbonBtn>
              </Group>
              <GroupDivider />

              <Group label="Float">
                <SmallPillBtn
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: 'float-left' }).run()}
                  title="Float left"
                >
                  Float L
                </SmallPillBtn>
                <SmallPillBtn
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: 'float-right' }).run()}
                  title="Float right"
                >
                  Float R
                </SmallPillBtn>
              </Group>
              <GroupDivider />

              <Group label="Image">
                <RibbonBtn
                  onClick={() => editor.chain().focus().deleteSelection().run()}
                  title="Remove image"
                  danger
                >
                  <Trash2 size={15} />
                </RibbonBtn>
              </Group>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
