import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { X, Tag, Eye, EyeOff, Link, Type, Zap, CheckCircle2 } from 'lucide-react';
import { Card, CreateCardInput, UpdateCardInput } from '@/shared/types/flashcard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CardFormProps {
  deckId: string;
  initialData?: Card;
  onSave: (data: CreateCardInput | UpdateCardInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// ─── RichPreview ─────────────────────────────────────────────────────────────

interface RichPreviewProps {
  text: string;
  blurred?: boolean;
}

function parseRichText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by tokens: **bold**, *italic*, `code`, {{cN::answer}}
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\{\{c\d+::[^}]+\}\})/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    // Push plain text before this match
    if (start > lastIndex) {
      parts.push(<span key={keyIdx++}>{text.slice(lastIndex, start)}</span>);
    }

    if (raw.startsWith('**') && raw.endsWith('**')) {
      parts.push(<strong key={keyIdx++} style={{ fontWeight: 700 }}>{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      parts.push(<em key={keyIdx++}>{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      parts.push(
        <code
          key={keyIdx++}
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            padding: '1px 5px',
            fontFamily: 'monospace',
            fontSize: '0.875em',
            color: 'var(--color-accent)',
          }}
        >
          {raw.slice(1, -1)}
        </code>
      );
    } else if (/^\{\{c\d+::/.test(raw)) {
      // {{cN::answer}}
      const inner = raw.replace(/^\{\{c\d+::/, '').replace(/\}\}$/, '');
      parts.push(
        <span
          key={keyIdx++}
          style={{
            display: 'inline-block',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
            borderRadius: 12,
            padding: '1px 8px',
            fontWeight: 600,
            fontSize: '0.875em',
            margin: '0 1px',
          }}
        >
          {inner}
        </span>
      );
    }

    lastIndex = start + raw.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={keyIdx++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

const RichPreview: React.FC<RichPreviewProps> = ({ text, blurred }) => {
  const nodes = parseRichText(text);
  return (
    <span
      style={{
        filter: blurred ? 'blur(4px)' : 'none',
        transition: 'filter 0.2s ease',
        userSelect: blurred ? 'none' : 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {nodes.length > 0 ? nodes : <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Empty</span>}
    </span>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextClozeNumber(text: string): number {
  const matches = [...text.matchAll(/\{\{c(\d+)::/g)];
  if (matches.length === 0) return 1;
  const nums = matches.map((m) => parseInt(m[1], 10));
  return Math.max(...nums) + 1;
}

function hasCloze(text: string): boolean {
  return /\{\{c\d+::/.test(text);
}

// ─── CardForm ─────────────────────────────────────────────────────────────────

export const CardForm: React.FC<CardFormProps> = ({
  deckId,
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [front, setFront] = useState(initialData?.front ?? '');
  const [back, setBack] = useState(initialData?.back ?? '');
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [backRevealed, setBackRevealed] = useState(false);
  const [showNoteSearch, setShowNoteSearch] = useState(false);

  const frontRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = Boolean(initialData);
  const cardType = hasCloze(front) ? 'Cloze' : 'Basic';
  const isReadyToSave = front.trim().length > 0 && back.trim().length > 0;

  // ── Cloze shortcut ──────────────────────────────────────────────────────

  const applyCloze = useCallback(() => {
    const ta = frontRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = front.slice(start, end);

    if (selected.length === 0) {
      // No selection: insert placeholder at cursor
      const n = getNextClozeNumber(front);
      const placeholder = `{{c${n}::}}`;
      const next = front.slice(0, start) + placeholder + front.slice(end);
      setFront(next);
      // Position cursor inside the cloze
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + placeholder.length - 2; // before }}
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    } else {
      const n = getNextClozeNumber(front);
      const wrapped = `{{c${n}::${selected}}}`;
      const next = front.slice(0, start) + wrapped + front.slice(end);
      setFront(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start, start + wrapped.length);
      });
    }
  }, [front]);

  // Global Ctrl+Shift+C when front textarea is focused
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'c' &&
        document.activeElement === frontRef.current
      ) {
        e.preventDefault();
        applyCloze();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [applyCloze]);

  // ── Tag input ────────────────────────────────────────────────────────────

  const commitTag = (raw: string) => {
    const trimmed = raw.trim().toLowerCase().replace(/,/g, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handleTagBlur = () => {
    if (tagInput.trim()) commitTag(tagInput);
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReadyToSave || isLoading) return;

    if (isEditing && initialData) {
      const payload: UpdateCardInput = {
        front: front.trim(),
        back: back.trim(),
        tags,
      };
      onSave(payload);
    } else {
      const payload: CreateCardInput = {
        deckId,
        front: front.trim(),
        back: back.trim(),
        tags,
      };
      onSave(payload);
    }
  };

  // ── Shared styles ────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    marginBottom: 4,
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 120,
    background: 'var(--color-bg-primary)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '10px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  };

  const btnStyle = (variant: 'primary' | 'ghost' | 'danger' = 'ghost'): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      borderRadius: 8,
      padding: '7px 14px',
      fontSize: '0.875rem',
      fontWeight: 600,
      cursor: 'pointer',
      border: 'none',
      transition: 'background 0.15s ease, opacity 0.15s ease',
      fontFamily: 'inherit',
    };
    if (variant === 'primary') {
      return {
        ...base,
        background: 'var(--color-accent)',
        color: '#fff',
      };
    }
    if (variant === 'danger') {
      return {
        ...base,
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
      };
    }
    return {
      ...base,
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
    };
  };

  const smallBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    padding: '3px 9px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-secondary)',
    fontFamily: 'inherit',
    transition: 'background 0.15s ease',
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        color: 'var(--color-text-primary)',
        fontFamily: 'inherit',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>
          {isEditing ? 'Edit Card' : 'New Card'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: 4,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Front / Back side-by-side ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}
        className="sm:grid-cols-2"
      >
        {/* Front */}
        <div style={cardStyle}>
          {/* Label row with Cloze button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={labelStyle}>Front</span>
              {/* Q badge */}
              <span
                style={{
                  background: 'var(--color-accent-soft)',
                  color: 'var(--color-accent)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 10,
                  letterSpacing: '0.04em',
                }}
              >
                Q
              </span>
            </div>

            {/* Cloze button */}
            <button
              type="button"
              onClick={applyCloze}
              title="Wrap selected text in cloze deletion (Ctrl+Shift+C)"
              style={{
                ...smallBtnStyle,
                ...(hasCloze(front)
                  ? {
                      background: 'var(--color-accent-soft)',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent)',
                    }
                  : {}),
              }}
            >
              <Zap size={11} />
              Cloze
            </button>
          </div>

          <textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Question or cloze text…"
            style={textareaStyle}
            disabled={isLoading}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />

          {/* Cloze syntax indicator */}
          {hasCloze(front) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.75rem',
                color: 'var(--color-accent)',
                marginTop: 2,
              }}
            >
              <Zap size={11} />
              Cloze deletion detected
            </div>
          )}
        </div>

        {/* Back */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={labelStyle}>Back</span>
            {/* A badge */}
            <span
              style={{
                background: 'rgba(var(--color-success-rgb, 34,197,94), 0.12)',
                color: 'var(--color-success)',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: 10,
                letterSpacing: '0.04em',
              }}
            >
              A
            </span>
          </div>

          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Answer or explanation…"
            style={textareaStyle}
            disabled={isLoading}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />
        </div>
      </div>

      {/* ── Tags ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={labelStyle}>Tags</span>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
            minHeight: 36,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Tag size={10} />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: 2,
                }}
                aria-label={`Remove tag ${tag}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}

          <input
            type="text"
            value={tagInput}
            onChange={(e) => {
              const val = e.target.value;
              if (val.includes(',')) {
                const parts = val.split(',');
                parts.slice(0, -1).forEach((p) => commitTag(p));
                setTagInput(parts[parts.length - 1]);
              } else {
                setTagInput(val);
              }
            }}
            onKeyDown={handleTagKeyDown}
            onBlur={handleTagBlur}
            placeholder={tags.length === 0 ? 'Add tags (Enter or comma)…' : ''}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              flex: 1,
              minWidth: 120,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Link to Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowNoteSearch((v) => !v)}
            style={{
              ...smallBtnStyle,
              ...(showNoteSearch
                ? {
                    background: 'var(--color-accent-soft)',
                    borderColor: 'var(--color-accent)',
                    color: 'var(--color-accent)',
                  }
                : {}),
            }}
          >
            <Link size={11} />
            🔗 Link to Note
          </button>
        </div>

        {showNoteSearch && (
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
            }}
          >
            <input
              type="text"
              placeholder="Search notes…"
              disabled
              title="Coming soon"
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '7px 12px',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                width: 280,
                fontFamily: 'inherit',
                cursor: 'not-allowed',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                color: 'var(--color-text-muted)',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '1px 6px',
                pointerEvents: 'none',
              }}
            >
              Coming soon
            </span>
          </div>
        )}
      </div>

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Preview header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={labelStyle}>Preview</span>

            {/* Card type badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: cardType === 'Cloze' ? 'var(--color-accent-soft)' : 'var(--color-bg-elevated)',
                color: cardType === 'Cloze' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                border: `1px solid ${cardType === 'Cloze' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 8px',
                borderRadius: 10,
                letterSpacing: '0.04em',
              }}
            >
              {cardType === 'Cloze' ? <Zap size={9} /> : <Type size={9} />}
              {cardType}
            </span>

            {/* Ready-to-save indicator */}
            {isReadyToSave && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--color-success)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={12} />
                Ready
              </span>
            )}
          </div>

          {/* Reveal toggle */}
          <button
            type="button"
            onClick={() => setBackRevealed((v) => !v)}
            style={smallBtnStyle}
            title={backRevealed ? 'Hide answer' : 'Reveal answer'}
          >
            {backRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
            {backRevealed ? 'Hide' : 'Reveal'}
          </button>
        </div>

        {/* Preview cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {/* Front preview */}
          <div
            style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '14px 16px',
              minHeight: 80,
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--color-text-primary)',
            }}
          >
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
                marginBottom: 6,
              }}
            >
              Front
            </div>
            <RichPreview text={front} blurred={false} />
          </div>

          {/* Back preview */}
          <div
            style={{
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '14px 16px',
              minHeight: 80,
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--color-text-primary)',
              cursor: backRevealed ? 'default' : 'pointer',
            }}
            onClick={() => !backRevealed && setBackRevealed(true)}
            title={backRevealed ? undefined : 'Click to reveal answer'}
          >
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-text-muted)',
                marginBottom: 6,
              }}
            >
              Back
            </div>
            <RichPreview text={back} blurred={!backRevealed} />
          </div>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={btnStyle('danger')}
          disabled={isLoading}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!isReadyToSave || isLoading}
          style={{
            ...btnStyle('primary'),
            opacity: !isReadyToSave || isLoading ? 0.5 : 1,
            cursor: !isReadyToSave || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? (
            <>
              <span
                style={{
                  width: 13,
                  height: 13,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Saving…
            </>
          ) : (
            <>{isEditing ? 'Update Card' : 'Save Card'}</>
          )}
        </button>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
};

export default CardForm;
