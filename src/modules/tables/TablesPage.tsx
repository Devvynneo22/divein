import { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import {
  ArrowLeft, Plus, Table2, Filter, ArrowUpDown, Download, Upload,
  LayoutGrid, Columns3, X, Search, Trash2, Edit2, Grid, List,
  GalleryHorizontalEnd, ChevronDown, ChevronRight, Maximize2, Settings
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTables, useCreateTable, useUpdateTable, useDeleteTable, useAddColumn, useCreateRow, useRows } from './hooks/useTables';
import { TableCard } from './components/TableCard';
import { TableGrid } from './components/TableGrid';
import { TableBoardView } from './components/TableBoardView';
import { FilterBar } from './components/FilterBar';
import { SortBar } from './components/SortBar';
import { AddColumnPanel } from './components/AddColumnPanel';
import { tableService } from '@/shared/lib/tableService';
import { exportTableToCSV, downloadCSV, parseCSVToRows, type CSVParseResult } from '@/shared/lib/csvService';
import type { TableDef, TableFilter, TableSort, ColumnDef, TableRow } from '@/shared/types/table';
import { EmptyState } from '@/shared/components/EmptyState';
import { toast } from '@/shared/stores/toastStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_PICKER_OPTIONS = ['📊','📋','📝','📦','👥','🚀','💰','📚','🎯','🗓️','💡','🔧','📈','🏠','✈️','🎵','🍕','🌍','🔬','💊'];

const TYPE_ICONS: Record<string, string> = {
  text: 'T', number: '#', date: '📅', select: '◉', multiselect: '◎',
  checkbox: '☑', url: '🔗', email: '✉', phone: '📞', rating: '★',
  progress: '%', formula: 'ƒ', relation: '↗',
};

const SELECT_COLORS = [
  'var(--color-accent)', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#64748b',
];

function getSelectColor(value: string, options?: string[]): string {
  if (!options) return SELECT_COLORS[0];
  const idx = options.indexOf(value);
  return SELECT_COLORS[idx % SELECT_COLORS.length] ?? SELECT_COLORS[0];
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TABLE_TEMPLATES = [
  {
    id: 'project-tracker',
    icon: '🎯',
    name: 'Project Tracker',
    description: 'Track tasks, status, and deadlines',
    columns: [
      { name: 'Task', type: 'text' as const },
      { name: 'Status', type: 'select' as const, options: ['Todo', 'In Progress', 'Done', 'Blocked'] },
      { name: 'Priority', type: 'select' as const, options: ['Low', 'Medium', 'High'] },
      { name: 'Due Date', type: 'date' as const },
      { name: 'Assignee', type: 'text' as const },
      { name: 'Progress', type: 'progress' as const },
    ],
  },
  {
    id: 'contacts',
    icon: '👥',
    name: 'Contacts',
    description: 'Manage people and organizations',
    columns: [
      { name: 'Name', type: 'text' as const },
      { name: 'Email', type: 'email' as const },
      { name: 'Phone', type: 'phone' as const },
      { name: 'Company', type: 'text' as const },
      { name: 'Tags', type: 'multiselect' as const, options: ['Client', 'Partner', 'Vendor', 'Friend'] },
    ],
  },
  {
    id: 'inventory',
    icon: '📦',
    name: 'Inventory',
    description: 'Track stock, quantities, and locations',
    columns: [
      { name: 'Item', type: 'text' as const },
      { name: 'SKU', type: 'text' as const },
      { name: 'Quantity', type: 'number' as const },
      { name: 'Location', type: 'text' as const },
      { name: 'Status', type: 'select' as const, options: ['In Stock', 'Low Stock', 'Out of Stock'] },
      { name: 'Price', type: 'number' as const },
    ],
  },
  {
    id: 'reading-list',
    icon: '📚',
    name: 'Reading List',
    description: 'Organize books and reading progress',
    columns: [
      { name: 'Title', type: 'text' as const },
      { name: 'Author', type: 'text' as const },
      { name: 'Status', type: 'select' as const, options: ['To Read', 'Reading', 'Finished', 'Abandoned'] },
      { name: 'Rating', type: 'rating' as const },
      { name: 'Genre', type: 'select' as const, options: ['Fiction', 'Non-Fiction', 'Science', 'History', 'Biography'] },
      { name: 'Notes', type: 'text' as const },
    ],
  },
  {
    id: 'crm-pipeline',
    icon: '💰',
    name: 'CRM Pipeline',
    description: 'Track leads and sales opportunities',
    columns: [
      { name: 'Lead', type: 'text' as const },
      { name: 'Company', type: 'text' as const },
      { name: 'Stage', type: 'select' as const, options: ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] },
      { name: 'Value', type: 'number' as const },
      { name: 'Contact Date', type: 'date' as const },
      { name: 'Priority', type: 'select' as const, options: ['Hot', 'Warm', 'Cold'] },
    ],
  },
  {
    id: 'sprint-board',
    icon: '🚀',
    name: 'Sprint Board',
    description: 'Manage sprints and development tasks',
    columns: [
      { name: 'Task', type: 'text' as const },
      { name: 'Status', type: 'select' as const, options: ['Backlog', 'Todo', 'InProgress', 'Review', 'Done'] },
      { name: 'Assignee', type: 'text' as const },
      { name: 'Points', type: 'number' as const },
      { name: 'Sprint', type: 'text' as const },
      { name: 'Done', type: 'checkbox' as const },
    ],
  },
  {
    id: 'habit-tracker',
    icon: '🗓️',
    name: 'Habit Tracker',
    description: 'Track daily habits and streaks',
    columns: [
      { name: 'Habit', type: 'text' as const },
      { name: 'Mon', type: 'checkbox' as const },
      { name: 'Tue', type: 'checkbox' as const },
      { name: 'Wed', type: 'checkbox' as const },
      { name: 'Thu', type: 'checkbox' as const },
      { name: 'Fri', type: 'checkbox' as const },
      { name: 'Sat', type: 'checkbox' as const },
      { name: 'Sun', type: 'checkbox' as const },
      { name: 'Streak', type: 'number' as const },
    ],
  },
  {
    id: 'budget-tracker',
    icon: '📈',
    name: 'Budget Tracker',
    description: 'Track expenses and budget categories',
    columns: [
      { name: 'Item', type: 'text' as const },
      { name: 'Category', type: 'select' as const, options: ['Housing', 'Food', 'Transport', 'Entertainment', 'Utilities', 'Other'] },
      { name: 'Amount', type: 'number' as const },
      { name: 'Date', type: 'date' as const },
      { name: 'Recurring', type: 'checkbox' as const },
      { name: 'Paid', type: 'checkbox' as const },
    ],
  },
];

// ─── RowDetailModal ───────────────────────────────────────────────────────────

interface RowDetailModalProps {
  row: TableRow;
  table: TableDef;
  onClose: () => void;
  onSave: (rowId: string, colId: string, value: unknown) => void;
}

function RowDetailModal({ row, table, onClose, onSave }: RowDetailModalProps) {
  const [localData, setLocalData] = useState<Record<string, unknown>>({ ...row.data });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = (colId: string, value: unknown) => {
    setLocalData(prev => ({ ...prev, [colId]: value }));
    onSave(row.id, colId, value);
  };

  const renderField = (col: ColumnDef) => {
    const val = localData[col.id];

    switch (col.type) {
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => handleChange(col.id, e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--color-accent)', cursor: 'pointer' }}
          />
        );
      case 'select':
        return (
          <select
            value={String(val ?? '')}
            onChange={e => handleChange(col.id, e.target.value)}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              padding: '6px 10px',
              fontSize: 13,
              minWidth: 160,
            }}
          >
            <option value="">—</option>
            {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={val != null ? String(val) : ''}
            onChange={e => handleChange(col.id, e.target.value ? Number(e.target.value) : null)}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              padding: '6px 10px',
              fontSize: 13,
              width: 160,
            }}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={String(val ?? '')}
            onChange={e => handleChange(col.id, e.target.value)}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              padding: '6px 10px',
              fontSize: 13,
            }}
          />
        );
      case 'progress':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
            <input
              type="range"
              min={0} max={100}
              value={Number(val ?? 0)}
              onChange={e => handleChange(col.id, Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--color-accent)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', minWidth: 32 }}>
              {Number(val ?? 0)}%
            </span>
          </div>
        );
      case 'rating':
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => handleChange(col.id, n)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 20,
                  color: Number(val ?? 0) >= n ? '#f59e0b' : 'var(--color-border)',
                }}
              >★</button>
            ))}
          </div>
        );
      default:
        return (
          <textarea
            value={String(val ?? '')}
            onChange={e => handleChange(col.id, e.target.value)}
            rows={col.type === 'text' && String(val ?? '').length > 80 ? 3 : 1}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              color: 'var(--color-text-primary)',
              padding: '6px 10px',
              fontSize: 13,
              resize: 'vertical',
              minWidth: 240,
              fontFamily: 'inherit',
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-popup)',
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Row Details
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Created {new Date(row.createdAt).toLocaleString()} · Updated {new Date(row.updatedAt).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '12px 20px 20px', flex: 1 }}>
          {table.columns.map(col => (
            <div
              key={col.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                padding: '10px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{
                minWidth: 140, display: 'flex', alignItems: 'center', gap: 6,
                paddingTop: 6,
              }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  {TYPE_ICONS[col.type] ?? '?'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {col.name}
                </span>
                {col.required && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>*</span>}
              </div>
              <div style={{ flex: 1 }}>
                {renderField(col)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── GalleryView ──────────────────────────────────────────────────────────────

interface GalleryViewProps {
  rows: TableRow[];
  table: TableDef;
  onRowExpand: (row: TableRow) => void;
}

function GalleryView({ rows, table, onRowExpand }: GalleryViewProps) {
  const cols = table.columns;
  const titleCol = cols.find(c => c.type === 'text') ?? cols[0];
  const bodyCols = cols.filter(c => c.id !== titleCol?.id).slice(0, 4);

  const renderCellValue = (col: ColumnDef, val: unknown) => {
    if (val == null || val === '') return <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>;

    switch (col.type) {
      case 'checkbox':
        return <span style={{ fontSize: 13 }}>{val ? '✓' : '✗'}</span>;
      case 'select':
        return (
          <span style={{
            background: getSelectColor(String(val), col.options) + '22',
            color: getSelectColor(String(val), col.options),
            border: `1px solid ${getSelectColor(String(val), col.options)}55`,
            borderRadius: 4,
            padding: '1px 7px',
            fontSize: 11,
            fontWeight: 500,
          }}>
            {String(val)}
          </span>
        );
      case 'progress':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              flex: 1, height: 6, background: 'var(--color-border)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Number(val))}%`,
                background: 'var(--color-accent)',
                borderRadius: 99,
              }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{Number(val)}%</span>
          </div>
        );
      case 'rating':
        return (
          <span style={{ fontSize: 13, color: '#f59e0b' }}>
            {'★'.repeat(Number(val))}{'☆'.repeat(5 - Number(val))}
          </span>
        );
      default:
        return <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{String(val)}</span>;
    }
  };

  if (rows.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        No rows yet. Add a row to see it here.
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      padding: 20,
      alignContent: 'flex-start',
    }}>
      {rows.map(row => (
        <div
          key={row.id}
          style={{
            width: 250,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: 14,
            cursor: 'pointer',
            transition: 'transform 0.15s, box-shadow 0.15s',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
          }}
          onClick={() => onRowExpand(row)}
        >
          {/* Title */}
          <div style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--color-text-primary)',
            marginBottom: 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {titleCol ? String(row.data[titleCol.id] ?? 'Untitled') : 'Row'}
          </div>

          {/* Body fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bodyCols.map(col => (
              <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  minWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {col.name}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  {renderCellValue(col, row.data[col.id])}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TableCardWithCount ───────────────────────────────────────────────────────

function TableCardWithCount({
  table,
  onClick,
}: {
  table: TableDef;
  onClick: () => void;
}) {
  const { data: rowsData } = useRows(table.id);
  const rowCount = rowsData?.length ?? 0;

  return (
    <TableCard
      table={table}
      rowCount={rowCount}
      onClick={onClick}
    />
  );
}

// ─── ImportPreviewModal ───────────────────────────────────────────────────────

interface ImportPreviewModalProps {
  parseResult: CSVParseResult;
  table: TableDef;
  onConfirm: (mappings: Record<string, string>) => void;
  onClose: () => void;
}

function ImportPreviewModal({ parseResult, table, onConfirm, onClose }: ImportPreviewModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    parseResult.headers.forEach(h => {
      const match = table.columns.find(c => c.name.toLowerCase() === h.toLowerCase());
      if (match) m[h] = match.id;
    });
    return m;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-popup)',
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Import CSV — Map Columns
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Detected {parseResult.rows.length} rows with {parseResult.headers.length} columns. Map CSV headers to table columns:
          </p>
          {parseResult.headers.map(header => (
            <div key={header} style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
            }}>
              <span style={{
                fontSize: 13, color: 'var(--color-text-primary)', minWidth: 140,
                background: 'var(--color-bg-secondary)', padding: '5px 10px',
                borderRadius: 6, border: '1px solid var(--color-border)',
              }}>
                {header}
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>→</span>
              <select
                value={mappings[header] ?? ''}
                onChange={e => setMappings(prev => ({ ...prev, [header]: e.target.value }))}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  color: 'var(--color-text-primary)',
                  padding: '5px 10px',
                  fontSize: 13,
                  flex: 1,
                }}
              >
                <option value="">— Skip —</option>
                {table.columns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text-secondary)',
              padding: '7px 16px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(mappings)}
            style={{
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Import Rows
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
}: {
  template: typeof TABLE_TEMPLATES[0];
  onUse: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onUse}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--color-bg-elevated)' : 'var(--color-bg-secondary)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{template.icon}</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{template.name}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>{template.description}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
        {template.columns.length} columns
      </div>
    </div>
  );
}

// ─── CreateTableForm ──────────────────────────────────────────────────────────

interface CreateTableFormProps {
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

function CreateTableForm({ onSubmit, onCancel, loading }: CreateTableFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim(), description.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-accent)',
      borderRadius: 10,
      padding: 16,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ marginBottom: 12 }}>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Table name…"
          style={{
            width: '100%',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            color: 'var(--color-text-primary)',
            padding: '8px 10px',
            fontSize: 14,
            fontWeight: 500,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          style={{
            width: '100%',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            color: 'var(--color-text-primary)',
            padding: '7px 10px',
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            color: 'var(--color-text-secondary)',
            padding: '7px 14px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim() || loading}
          style={{
            background: 'var(--color-accent)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '7px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
            opacity: name.trim() && !loading ? 1 : 0.6,
          }}
        >
          {loading ? 'Creating…' : 'Create Table'}
        </button>
      </div>
    </form>
  );
}

// ─── TableView ────────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'board' | 'gallery';

interface TableViewProps {
  table: TableDef;
  onBack: () => void;
}

function TableView({ table, onBack }: TableViewProps) {
  const queryClient = useQueryClient();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();
  const addColumn = useAddColumn();
  const createRow = useCreateRow();
  const { data: rows = [], isLoading: rowsLoading } = useRows(table.id);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showAddCol, setShowAddCol] = useState(false);
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [sorts, setSorts] = useState<TableSort[]>([]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [importPreview, setImportPreview] = useState<CSVParseResult | null>(null);
  const [expandedRow, setExpandedRow] = useState<TableRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descValue, setDescValue] = useState(table.description ?? '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [groupByCol, setGroupByCol] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectCols = table.columns.filter(c => c.type === 'select');
  const hasSelectCols = selectCols.length > 0;

  // Filtered + sorted rows
  const processedRows = (() => {
    let result = [...rows];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        Object.values(row.data).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return result;
  })();

  // Grouped rows
  const groupedRows = (() => {
    if (viewMode !== 'grid' || !groupByCol) return null;
    const col = table.columns.find(c => c.id === groupByCol);
    if (!col) return null;
    const groups = new Map<string, TableRow[]>();
    for (const row of processedRows) {
      const val = String(row.data[groupByCol] ?? '');
      const key = val || 'No value';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    return { col, groups };
  })();

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async () => {
    try {
      const csv = exportTableToCSV(table, rows);
      downloadCSV(csv, `${table.name}.csv`);
      toast.success('Exported to CSV');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseCSVToRows(text, table.columns);
    setImportPreview(result);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async (mappings: Record<string, string>) => {
    if (!importPreview) return;
    let count = 0;
    for (const csvRow of importPreview.rows) {
      const data: Record<string, unknown> = {};
      for (const [header, colId] of Object.entries(mappings)) {
        if (colId && csvRow.raw[header] != null) data[colId] = csvRow.raw[header];
      }
      await createRow.mutateAsync({ tableId: table.id, data });
      count++;
    }
    setImportPreview(null);
    toast.success(`Imported ${count} rows`);
  };

  const handleUpdateCell = async (rowId: string, colId: string, value: unknown) => {
    try {
      await tableService.updateCell(rowId, colId, value);
      queryClient.invalidateQueries({ queryKey: ['tableRows', table.id] });
    } catch {
      toast.error('Failed to update cell');
    }
  };

  const handleSaveDescription = async () => {
    setEditingDescription(false);
    try {
      await updateTable.mutateAsync({ id: table.id, data: { description: descValue } });
    } catch {
      toast.error('Failed to update description');
    }
  };

  const handleSetIcon = async (emoji: string) => {
    setShowEmojiPicker(false);
    try {
      await updateTable.mutateAsync({ id: table.id, data: { icon: emoji } });
    } catch {
      toast.error('Failed to update icon');
    }
  };

  const handleDeleteTable = async () => {
    try {
      await deleteTable.mutateAsync(table.id);
      toast.success(`"${table.name}" deleted`);
      onBack();
    } catch {
      toast.error('Failed to delete table');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: 'var(--color-bg-elevated)',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: 6,
            fontSize: 13,
          }}
        >
          <ArrowLeft size={15} /> Tables
        </button>

        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Icon */}
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              title="Change icon"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 20, lineHeight: 1, padding: 2,
              }}
            >
              {table.icon ?? '📊'}
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
                {table.name}
              </div>
              {/* Description */}
              {editingDescription ? (
                <input
                  autoFocus
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  onBlur={handleSaveDescription}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDescription(); if (e.key === 'Escape') setEditingDescription(false); }}
                  style={{
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: 4,
                    color: 'var(--color-text-secondary)',
                    padding: '2px 6px',
                    fontSize: 12,
                    marginTop: 2,
                    minWidth: 200,
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingDescription(true)}
                  title="Click to edit description"
                  style={{
                    fontSize: 12,
                    color: table.description ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
                    cursor: 'text',
                    marginTop: 1,
                    opacity: table.description ? 1 : 0.5,
                  }}
                >
                  {table.description || 'Add description…'}
                </div>
              )}
            </div>
          </div>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 500,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow-popup)',
                padding: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 4,
                marginTop: 4,
              }}
            >
              {EMOJI_PICKER_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleSetIcon(emoji)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, padding: 5, borderRadius: 6,
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.background = 'var(--color-bg-secondary)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {rows.length} rows · {table.columns.length} cols
          </span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete table"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 5, borderRadius: 6, display: 'flex',
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-popup)',
            padding: 28,
            maxWidth: 380,
            width: '100%',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              Delete Table?
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
              This will permanently delete <strong>"{table.name}"</strong> and all {rows.length} rows. This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text-secondary)',
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                style={{
                  background: 'var(--color-danger)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        flexWrap: 'wrap',
      }}>
        {/* View toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--color-bg-tertiary)',
          borderRadius: 8,
          padding: 2,
          gap: 2,
        }}>
          {(['grid', ...(hasSelectCols ? ['board'] : []), 'gallery'] as ViewMode[]).map(mode => {
            const icons: Record<ViewMode, React.ReactNode> = {
              grid: <Grid size={14} />,
              board: <Columns3 size={14} />,
              gallery: <GalleryHorizontalEnd size={14} />,
            };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? 'var(--color-bg-elevated)' : 'none',
                  border: 'none',
                  borderRadius: 6,
                  color: viewMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  padding: '4px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontWeight: viewMode === mode ? 600 : 400,
                  boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {icons[mode]} {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

        {/* Filter */}
        <button
          onClick={() => { setShowFilter(v => !v); setShowSort(false); }}
          style={{
            background: showFilter ? 'var(--color-accent-soft)' : 'none',
            border: `1px solid ${showFilter ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 7,
            color: showFilter ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Filter size={13} />
          Filter {filters.length > 0 && `(${filters.length})`}
        </button>

        {/* Sort */}
        <button
          onClick={() => { setShowSort(v => !v); setShowFilter(false); }}
          style={{
            background: showSort ? 'var(--color-accent-soft)' : 'none',
            border: `1px solid ${showSort ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 7,
            color: showSort ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <ArrowUpDown size={13} />
          Sort {sorts.length > 0 && `(${sorts.length})`}
        </button>

        {/* Group by (grid + select cols only) */}
        {viewMode === 'grid' && hasSelectCols && (
          <select
            value={groupByCol ?? ''}
            onChange={e => setGroupByCol(e.target.value || null)}
            style={{
              background: groupByCol ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
              border: `1px solid ${groupByCol ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 7,
              color: groupByCol ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              padding: '5px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <option value="">Group by…</option>
            {selectCols.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* Add column */}
        <button
          onClick={() => setShowAddCol(v => !v)}
          style={{
            background: showAddCol ? 'var(--color-accent-soft)' : 'none',
            border: `1px solid ${showAddCol ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 7,
            color: showAddCol ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Columns3 size={13} /> Add Column
        </button>

        <div style={{ flex: 1 }} />

        {/* Search */}
        {showSearch ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rows…"
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 7,
                color: 'var(--color-text-primary)',
                padding: '5px 10px',
                fontSize: 12,
                width: 180,
              }}
            />
            <button
              onClick={() => { setShowSearch(false); setSearch(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 7, color: 'var(--color-text-secondary)',
              padding: '5px 10px', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Search size={13} />
          </button>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          style={{
            background: 'none', border: '1px solid var(--color-border)',
            borderRadius: 7, color: 'var(--color-text-secondary)',
            padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Download size={13} /> Export
        </button>

        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'none', border: '1px solid var(--color-border)',
            borderRadius: 7, color: 'var(--color-text-secondary)',
            padding: '5px 10px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Upload size={13} /> Import
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportFile} style={{ display: 'none' }} />

        {/* Add row */}
        <button
          onClick={() => createRow.mutate({ tableId: table.id, data: {} })}
          style={{
            background: 'var(--color-accent)', border: 'none',
            borderRadius: 7, color: '#fff',
            padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <Plus size={13} /> Row
        </button>
      </div>

      {/* Filter/Sort bars */}
      {showFilter && (
        <FilterBar columns={table.columns} filters={filters} onChange={setFilters} />
      )}
      {showSort && (
        <SortBar columns={table.columns} sorts={sorts} onChange={setSorts} />
      )}
      {showAddCol && (
        <AddColumnPanel
          onSave={(col: ColumnDef) => { addColumn.mutate({ tableId: table.id, column: col }); setShowAddCol(false); }}
          onCancel={() => setShowAddCol(false)}
        />
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {rowsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <LoadingSpinner />
          </div>
        ) : viewMode === 'board' && hasSelectCols ? (
          <TableBoardView
            table={table}
            rows={processedRows}
            groupByColumnId={groupByCol ?? ''}
            onGroupByChange={setGroupByCol}
          />
        ) : viewMode === 'gallery' ? (
          <GalleryView
            rows={processedRows}
            table={table}
            onRowExpand={row => setExpandedRow(row)}
          />
        ) : groupedRows ? (
          // Grouped grid view
          <div>
            {Array.from(groupedRows.groups.entries()).map(([groupKey, groupRows]) => {
              const isCollapsed = collapsedGroups.has(groupKey);
              const groupColor = groupKey === 'No value'
                ? 'var(--color-text-muted)'
                : getSelectColor(groupKey, groupedRows.col.options);
              return (
                <div key={groupKey}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 16px',
                      background: 'var(--color-bg-secondary)',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => toggleGroup(groupKey)}
                  >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span style={{
                      background: groupColor + '22',
                      color: groupColor,
                      border: `1px solid ${groupColor}55`,
                      borderRadius: 4,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {groupKey}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {groupRows.length} row{groupRows.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <TableGrid
                      table={table}
                      rows={groupRows}
                      filters={[]}
                      sorts={[]}
                      onSortsChange={setSorts}
                      onShowAddColumn={() => setShowAddCol(true)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <TableGrid
            table={table}
            rows={processedRows}
            filters={filters}
            sorts={sorts}
            onSortsChange={setSorts}
            onShowAddColumn={() => setShowAddCol(true)}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 16px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {processedRows.length} / {rows.length} rows
        </span>
        {search && (
          <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>
            Filtered by search
          </span>
        )}
        {filters.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>
            {filters.length} filter{filters.length > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* Modals */}
      {expandedRow && (
        <RowDetailModal
          row={expandedRow}
          table={table}
          onClose={() => setExpandedRow(null)}
          onSave={handleUpdateCell}
        />
      )}
      {importPreview && (
        <ImportPreviewModal
          parseResult={importPreview}
          table={table}
          onConfirm={handleImportConfirm}
          onClose={() => setImportPreview(null)}
        />
      )}
    </div>
  );
}

// ─── TablesPage ───────────────────────────────────────────────────────────────

export function TablesPage() {
  const { data: tables = [], isLoading } = useTables();
  const createTable = useCreateTable();
  const addColumn = useAddColumn();

  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  // Keep selectedTable in sync with latest data
  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find(t => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
    }
  }, [tables]);

  const filteredTables = search
    ? tables.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : tables;

  const handleCreateTable = async (name: string, description: string) => {
    try {
      const table = await createTable.mutateAsync({ name, description, icon: '📊' });
      setShowCreate(false);
      setSelectedTable(table);
      toast.success(`"${name}" created`);
    } catch {
      toast.error('Failed to create table');
    }
  };

  const handleUseTemplate = async (template: typeof TABLE_TEMPLATES[0]) => {
    setCreatingFromTemplate(true);
    try {
      const table = await createTable.mutateAsync({
        name: template.name,
        description: template.description,
        icon: template.icon,
      });
      for (const col of template.columns) {
        await addColumn.mutateAsync({
          tableId: table.id,
          column: { ...col, id: crypto.randomUUID(), width: 150 } as ColumnDef,
        });
      }
      setSelectedTable(table);
      toast.success(`Created "${template.name}" from template`);
    } catch {
      toast.error('Failed to create from template');
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  // Show table view
  if (selectedTable) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <TableView
          table={selectedTable}
          onBack={() => setSelectedTable(null)}
        />
      </div>
    );
  }

  // Tables list
  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: 'var(--color-bg-primary)',
      padding: '24px 28px',
    }}>
      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Table2 size={22} style={{ color: 'var(--color-accent)' }} />
            <h1 style={{ fontWeight: 700, fontSize: 20, color: 'var(--color-text-primary)', margin: 0 }}>
              Tables
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0 32px' }}>
            Structured data, your way.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{
            background: 'var(--color-accent)',
            border: 'none',
            borderRadius: 9,
            color: '#fff',
            padding: '9px 18px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Plus size={15} /> New Table
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ marginBottom: 20, maxWidth: 420 }}>
          <CreateTableForm
            onSubmit={handleCreateTable}
            onCancel={() => setShowCreate(false)}
            loading={createTable.isPending}
          />
        </div>
      )}

      {/* Search */}
      {tables.length > 0 && (
        <div style={{ marginBottom: 20, position: 'relative', maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tables…"
            style={{
              width: '100%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text-primary)',
              padding: '8px 10px 8px 32px',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <LoadingSpinner />
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No tables yet"
          description="Create a table or start from a template below."
          actionLabel="Create Table"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}>
            {filteredTables.map(table => (
              <TableCardWithCount
                key={table.id}
                table={table}
                onClick={() => setSelectedTable(table)}
              />
            ))}
            {filteredTables.length === 0 && search && (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 40,
                color: 'var(--color-text-muted)',
                fontSize: 14,
              }}>
                No tables match "{search}"
              </div>
            )}
          </div>
        </>
      )}

      {/* Templates section */}
      <div style={{ marginTop: tables.length > 0 ? 0 : 32 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <LayoutGrid size={14} /> Start from a template
        </div>
        {creatingFromTemplate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <LoadingSpinner />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Creating from template…</span>
          </div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: 10,
        }}>
          {TABLE_TEMPLATES.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
