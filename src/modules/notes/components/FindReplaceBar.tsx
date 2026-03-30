import { useState, useRef, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { searchPluginKey } from '../hooks/searchPlugin';

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
  showReplace?: boolean;
}

export function FindReplaceBar({ editor, onClose, showReplace = false }: FindReplaceBarProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  // Update search in editor
  const updateSearch = useCallback(
    (newQuery: string, newIndex?: number) => {
      const { state, view } = editor;
      const tr = state.tr.setMeta(searchPluginKey, {
        query: newQuery,
        currentIndex: newIndex ?? 0,
      });
      view.dispatch(tr);

      // Get updated match count from plugin state
      setTimeout(() => {
        const pluginState = searchPluginKey.getState(editor.state);
        if (pluginState) {
          setMatchCount(pluginState.matches.length);
          setCurrentIndex(pluginState.currentIndex);
        }
      }, 10);
    },
    [editor],
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      updateSearch(newQuery, 0);
    },
    [updateSearch],
  );

  const navigateMatch = useCallback(
    (direction: 'next' | 'prev') => {
      const pluginState = searchPluginKey.getState(editor.state);
      if (!pluginState || pluginState.matches.length === 0) return;

      const total = pluginState.matches.length;
      let newIndex = pluginState.currentIndex;
      if (direction === 'next') {
        newIndex = (newIndex + 1) % total;
      } else {
        newIndex = (newIndex - 1 + total) % total;
      }

      const tr = editor.state.tr.setMeta(searchPluginKey, {
        query: pluginState.query,
        currentIndex: newIndex,
      });
      editor.view.dispatch(tr);

      // Scroll to the current match
      setTimeout(() => {
        const newState = searchPluginKey.getState(editor.state);
        if (newState && newState.matches[newIndex]) {
          const match = newState.matches[newIndex];
          editor.commands.setTextSelection({ from: match.from, to: match.to });
          editor.commands.scrollIntoView();
        }
        setCurrentIndex(newIndex);
      }, 10);
    },
    [editor],
  );

  const handleReplace = useCallback(() => {
    const pluginState = searchPluginKey.getState(editor.state);
    if (!pluginState || pluginState.matches.length === 0) return;

    const match = pluginState.matches[pluginState.currentIndex];
    if (!match) return;

    const tr = editor.state.tr.insertText(replacement, match.from, match.to);
    editor.view.dispatch(tr);

    // Re-search after replace
    setTimeout(() => updateSearch(query), 10);
  }, [editor, replacement, query, updateSearch]);

  const handleReplaceAll = useCallback(() => {
    const pluginState = searchPluginKey.getState(editor.state);
    if (!pluginState || pluginState.matches.length === 0) return;

    // Replace all matches from end to start to preserve positions
    let tr = editor.state.tr;
    const matches = [...pluginState.matches].reverse();
    for (const match of matches) {
      tr = tr.insertText(replacement, match.from, match.to);
    }
    editor.view.dispatch(tr);
    setTimeout(() => updateSearch(query), 10);
  }, [editor, replacement, query, updateSearch]);

  // Close and clear on unmount
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        const tr = editor.state.tr.setMeta(searchPluginKey, { query: '', currentIndex: 0 });
        editor.view.dispatch(tr);
      }
    };
  }, [editor]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.target === findInputRef.current) {
        e.preventDefault();
        if (e.shiftKey) {
          navigateMatch('prev');
        } else {
          navigateMatch('next');
        }
      } else if (e.key === 'Tab' && e.target === findInputRef.current) {
        e.preventDefault();
        replaceInputRef.current?.focus();
      }
    },
    [onClose, navigateMatch],
  );

  const matchLabel =
    matchCount === 0
      ? query
        ? 'No matches'
        : ''
      : `${currentIndex + 1} of ${matchCount} matches`;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
      style={{
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Find group */}
      <div className="flex items-center gap-1">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Find:
        </span>
        <input
          ref={findInputRef}
          value={query}
          onChange={handleQueryChange}
          placeholder="Search..."
          className="px-2 py-1 text-xs rounded border"
          style={{
            width: 160,
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        />
      </div>

      {/* Match count */}
      <span
        className="text-xs min-w-[80px]"
        style={{
          color: matchCount === 0 && query ? 'var(--color-danger)' : 'var(--color-text-muted)',
        }}
      >
        {matchLabel}
      </span>

      {/* Navigation */}
      <button
        onClick={() => navigateMatch('prev')}
        title="Previous match (Shift+Enter)"
        className="px-1.5 py-1 rounded text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ▲
      </button>
      <button
        onClick={() => navigateMatch('next')}
        title="Next match (Enter)"
        className="px-1.5 py-1 rounded text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ▼
      </button>

      {/* Separator */}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Replace group */}
      {showReplace && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Replace:
            </span>
            <input
              ref={replaceInputRef}
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replace with..."
              className="px-2 py-1 text-xs rounded border"
              style={{
                width: 140,
                backgroundColor: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            />
          </div>
          <button
            onClick={handleReplace}
            title="Replace current"
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            title="Replace all"
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-tertiary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
          >
            Replace All
          </button>
        </>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        title="Close (Esc)"
        className="ml-auto px-1.5 py-1 rounded text-xs transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-muted)';
        }}
      >
        ✕
      </button>
    </div>
  );
}
