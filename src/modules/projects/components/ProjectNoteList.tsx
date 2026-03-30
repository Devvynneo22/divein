import { useState } from 'react';
import { Plus, FileText, BookOpen } from 'lucide-react';
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
  const [newTitle, setNewTitle]     = useState('');
  const qc = useQueryClient();

  const createNote = useMutation({
    mutationFn: () =>
      noteService.create({ title: newTitle.trim() || 'Untitled', projectId }),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          <Plus size={14} />
          New Note
        </button>
      </div>

      {/* Quick create form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="flex gap-2 p-3 rounded-xl"
          style={{
            border: '1px solid var(--color-accent)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note title…"
            autoFocus
            className="flex-1 text-sm focus:outline-none"
            style={{ background: 'transparent', color: 'var(--color-text-primary)' }}
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setIsCreating(false); setNewTitle(''); }}
            className="px-3 py-1 rounded-lg text-xs transition-colors"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Note list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <BookOpen size={36} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No notes in this project yet
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Create your first note to capture ideas and knowledge
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors mt-1"
            style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={14} />
            Create first note
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteRow({ note }: { note: Note }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl transition-all duration-150 cursor-default"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
        style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
      >
        {note.icon ? (
          <span>{note.icon}</span>
        ) : (
          <FileText size={14} style={{ color: 'var(--color-text-muted)' }} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {note.title || 'Untitled'}
        </p>
        {note.contentText && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
            {note.contentText}
          </p>
        )}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {format(parseISO(note.updatedAt), 'MMM d')}
        </span>
        {note.wordCount > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            {note.wordCount}w
          </span>
        )}
      </div>
    </div>
  );
}
