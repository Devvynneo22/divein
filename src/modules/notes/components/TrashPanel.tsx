import { useState } from 'react';
import { ArrowLeft, RotateCcw, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useTrashedNotes, useRestoreNote, useDeleteNote, useEmptyTrash } from '../hooks/useNotes';

interface TrashPanelProps {
  onBack: () => void;
}

export function TrashPanel({ onBack }: TrashPanelProps) {
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const { data: trashed = [] } = useTrashedNotes();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const emptyTrash = useEmptyTrash();

  function handleEmptyTrash() {
    if (confirmEmpty) {
      emptyTrash.mutate();
      setConfirmEmpty(false);
    } else {
      setConfirmEmpty(true);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border)]">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Trash</span>
        {trashed.length > 0 && (
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">{trashed.length} items</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {trashed.length === 0 ? (
          <div className="p-6 text-center">
            <Trash2 size={32} className="mx-auto mb-2 text-[var(--color-text-muted)] opacity-30" />
            <p className="text-xs text-[var(--color-text-muted)]">Trash is empty</p>
          </div>
        ) : (
          trashed.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] group"
            >
              <div className="text-sm leading-none shrink-0">
                {note.icon ?? <FileText size={14} className="text-[var(--color-text-muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                  {note.title}
                </div>
                <div className="text-[10px] text-[var(--color-text-muted)]">
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => restoreNote.mutate(note.id)}
                  title="Restore"
                  className="p-1 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-success)] transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => deleteNote.mutate(note.id)}
                  title="Delete permanently"
                  className="p-1 rounded hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Empty trash button */}
      {trashed.length > 0 && (
        <div className="p-3 border-t border-[var(--color-border)]">
          {confirmEmpty ? (
            <div className="space-y-1.5">
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                Delete {trashed.length} items permanently?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="flex-1 py-1.5 text-xs rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmptyTrash}
                  className="flex-1 py-1.5 text-xs rounded bg-[var(--color-danger)] text-white hover:opacity-90 transition-opacity"
                >
                  Delete all
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleEmptyTrash}
              className="w-full py-1.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
            >
              Empty Trash
            </button>
          )}
        </div>
      )}
    </div>
  );
}
