import { useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/shared/lib/noteService';
import type { Note } from '@/shared/types/note';

interface ProjectNoteListProps {
  projectId: string;
  notes: Note[];
}

export function ProjectNoteList({ projectId, notes }: ProjectNoteListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const qc = useQueryClient();

  const createNote = useMutation({
    mutationFn: () =>
      noteService.create({
        title: newTitle.trim() || 'Untitled',
        projectId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setNewTitle('');
      setIsCreating(false);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createNote.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with New Note button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          New Note
        </button>
      </div>

      {/* Quick create form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="flex gap-2 p-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-bg-secondary)]"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note title…"
            autoFocus
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-medium transition-colors"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setNewTitle('');
            }}
            className="px-3 py-1 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs transition-colors hover:bg-[var(--color-bg-tertiary)]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Note list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <FileText size={32} className="text-[var(--color-text-muted)] opacity-40" />
          <p className="text-sm text-[var(--color-text-muted)]">No notes in this project yet</p>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Create first note
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="px-3 py-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {note.title || 'Untitled'}
                  </p>
                  {note.contentText && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                      {note.contentText}
                    </p>
                  )}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 mt-0.5">
                  {format(parseISO(note.updatedAt), 'MMM d')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
