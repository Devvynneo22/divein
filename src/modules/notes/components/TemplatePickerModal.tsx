import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  defaultTitle: string;
  content: string;
  tags?: string[];
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank page',
    description: 'Start with a clean slate',
    emoji: '📄',
    defaultTitle: 'Untitled',
    content: '',
    tags: [],
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    description: 'Agenda, attendees, action items',
    emoji: '🤝',
    defaultTitle: 'Meeting Notes',
    content: `<h2>Meeting Notes</h2><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><hr/><h3>Agenda</h3><ul><li><p></p></li></ul><h3>Discussion</h3><p></p><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>`,
    tags: ['meeting'],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Reflect on your week, plan ahead',
    emoji: '📊',
    defaultTitle: 'Weekly Review',
    content: `<h2>Weekly Review</h2><p><strong>Week of:</strong> </p><hr/><h3>✅ What went well</h3><ul><li><p></p></li></ul><h3>🔧 What to improve</h3><ul><li><p></p></li></ul><h3>🎯 Next week's focus</h3><ul><li><p></p></li></ul><h3>💡 Key learnings</h3><p></p>`,
    tags: ['review'],
  },
  {
    id: 'project-brief',
    name: 'Project Brief',
    description: 'Define goals, scope, and timeline',
    emoji: '📁',
    defaultTitle: 'Project Brief',
    content: `<h2>Project Brief</h2><p><strong>Owner:</strong> </p><p><strong>Start date:</strong> </p><p><strong>Target date:</strong> </p><hr/><h3>Problem statement</h3><p></p><h3>Goals &amp; success criteria</h3><ul><li><p></p></li></ul><h3>Out of scope</h3><ul><li><p></p></li></ul><h3>Key milestones</h3><ul><li><p></p></li></ul>`,
    tags: ['project'],
  },
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    description: 'Capture thoughts and gratitude',
    emoji: '✍️',
    defaultTitle: 'Journal Entry',
    content: `<h2>Journal Entry</h2><p><strong>Date:</strong> </p><hr/><h3>🌅 Morning intention</h3><p></p><h3>💭 Thoughts &amp; reflections</h3><p></p><h3>🙏 Gratitude</h3><ul><li><p></p></li><li><p></p></li><li><p></p></li></ul><h3>⭐ One win today</h3><p></p>`,
    tags: [],
  },
  {
    id: 'reading-notes',
    name: 'Reading Notes',
    description: 'Capture insights from books or articles',
    emoji: '📚',
    defaultTitle: 'Reading Notes',
    content: `<h2>Reading Notes</h2><p><strong>Title:</strong> </p><p><strong>Author:</strong> </p><p><strong>Date read:</strong> </p><hr/><h3>Summary</h3><p></p><h3>Key ideas</h3><ul><li><p></p></li></ul><h3>Favourite quotes</h3><blockquote><p></p></blockquote><h3>My takeaways</h3><p></p>`,
    tags: ['reading'],
  },
];

interface TemplatePickerModalProps {
  onSelect: (template: NoteTemplate) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ onSelect, onClose }: TemplatePickerModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          padding: 28,
          width: 560,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, marginBottom: 4 }}>
              Start with a template
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Or choose Blank page to start fresh
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {NOTE_TEMPLATES.map((template) => {
            const isBlank = template.id === 'blank';
            return (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: isBlank ? '2px dashed var(--color-border)' : '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--color-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{template.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3 }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {template.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
