import { useState } from 'react';
import { Plus, FileText, Pin, Trash2, Search } from 'lucide-react';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from './hooks/useNotes';
import { NoteEditor } from './components/NoteEditor';
import type { Note } from '@/shared/types/note';
import { format } from 'date-fns';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filter = searchQuery ? { search: searchQuery } : undefined;
  const { data: notes = [] } = useNotes(filter);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  async function handleCreateNote() {
    const note = await createNote.mutateAsync({ title: 'Untitled' });
    setSelectedNoteId(note.id);
  }

  function handleSelectNote(id: string) {
    setSelectedNoteId(id);
  }

  function handleDeleteNote(id: string) {
    if (selectedNoteId === id) setSelectedNoteId(null);
    deleteNote.mutate(id);
  }

  function handleEditorUpdate(content: string, textContent: string, wordCount: number) {
    if (selectedNote) {
      updateNote.mutate({
        id: selectedNote.id,
        data: { content, contentText: textContent, wordCount },
      });
    }
  }

  function handleTitleChange(title: string) {
    if (selectedNote && title.trim()) {
      updateNote.mutate({ id: selectedNote.id, data: { title: title.trim() } });
    }
  }

  function handleTogglePin(id: string, isPinned: boolean) {
    updateNote.mutate({ id, data: { isPinned: !isPinned } });
  }

  return (
    <div className="flex h-full">
      {/* Note list sidebar */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
        {/* Search + New */}
        <div className="p-3 space-y-2 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Plus size={14} />
            New Note
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
              {searchQuery ? 'No notes found.' : 'No notes yet. Create one!'}
            </div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isSelected={note.id === selectedNoteId}
                onSelect={() => handleSelectNote(note.id)}
                onDelete={() => handleDeleteNote(note.id)}
                onTogglePin={() => handleTogglePin(note.id, note.isPinned)}
              />
            ))
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedNote ? (
          <>
            {/* Note title */}
            <div className="px-6 pt-4 pb-2 border-b border-[var(--color-border)]">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-2xl font-bold bg-transparent border-none outline-none text-[var(--color-text-primary)]"
              />
              <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                <span>{format(new Date(selectedNote.updatedAt), 'MMM d, yyyy h:mm a')}</span>
                <span>•</span>
                <span>{selectedNote.wordCount} words</span>
              </div>
            </div>

            {/* TipTap Editor */}
            <div className="flex-1 overflow-hidden">
              <NoteEditor
                content={selectedNote.content}
                onUpdate={handleEditorUpdate}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-30" />
              <p className="text-sm text-[var(--color-text-muted)]">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NoteListItem({
  note,
  isSelected,
  onSelect,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2.5 cursor-pointer border-b border-[var(--color-border)] transition-colors ${
        isSelected
          ? 'bg-[var(--color-accent)] bg-opacity-10'
          : 'hover:bg-[var(--color-bg-tertiary)]'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {note.isPinned && <Pin size={10} className="text-[var(--color-warning)] shrink-0" />}
            <span className="text-sm font-medium truncate text-[var(--color-text-primary)]">
              {note.title}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
            {note.contentText?.slice(0, 60) || 'Empty note'}
          </p>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {format(new Date(note.updatedAt), 'MMM d')}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-warning)]"
          >
            <Pin size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
