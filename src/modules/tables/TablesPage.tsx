import { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import {
  ArrowLeft, Plus, Table2, Filter, ArrowUpDown, Download, Upload,
  LayoutGrid, Columns3, X, Search,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useAddColumn,
  useCreateRow,
  useRows,
} from './hooks/useTables';
import { TableCard } from './components/TableCard';
import { TableGrid } from './components/TableGrid';
import { TableBoardView } from './components/TableBoardView';
import { FilterBar } from './components/FilterBar';
import { SortBar } from './components/SortBar';
import { AddColumnPanel } from './components/AddColumnPanel';
import { tableService } from '@/shared/lib/tableService';
import { exportTableToCSV, downloadCSV, parseCSVToRows, type CSVParseResult } from '@/shared/lib/csvService';
import type { TableDef, TableFilter, TableSort, ColumnDef } from '@/shared/types/table';
import { EmptyState } from '@/shared/components/EmptyState';

// ─── Row count wrapper for TableCard ──────────────────────────────────────────

function TableCardWithCount({
  table,
  onSelect,
}: {
  table: TableDef;
  onSelect: () => void;
}) {
  const { data: rows = [] } = useRows(table.id);
  return <TableCard table={table} rowCount={rows.length} onClick={onSelect} />;
}

// ─── CSV Import Preview Modal ─────────────────────────────────────────────────

interface ImportPreviewModalProps {
  parseResult: CSVParseResult;
  tableName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

function ImportPreviewModal({ parseResult, tableName, onConfirm, onCancel, isImporting }: ImportPreviewModalProps) {
  const mappedCount = parseResult.mappedColumns.filter((m) => m.column !== null).length;
  const totalCols = parseResult.headers.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Import CSV into &ldquo;{tableName}&rdquo;
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {parseResult.rows.length} rows · {mappedCount}/{totalCols} columns mapped
            </p>
          </div>
          <button
            onClick={onCancel}
            className="transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Column mapping */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Column Mapping
          </p>
          <div className="flex flex-wrap gap-1.5">
            {parseResult.mappedColumns.map((m) => (
              <span
                key={m.csvHeader}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: m.column ? 'var(--color-success-soft, #dcfce7)' : 'var(--color-warning-soft, #fef9c3)',
                  color: m.column ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                {m.csvHeader} {m.column ? `→ ${m.column.name}` : '(skipped)'}
              </span>
            ))}
          </div>
        </div>

        {/* Data preview */}
        <div className="flex-1 overflow-auto px-5 py-3">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Preview (first {Math.min(parseResult.rows.length, 10)} rows)
          </p>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {parseResult.headers.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                      style={{ color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 10).map((row, i) => (
                  <tr
                    key={i}
                    style={{ backgroundColor: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}
                  >
                    {parseResult.headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-1.5 max-w-[200px] truncate"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {row.raw[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 flex items-center justify-end gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isImporting || parseResult.rows.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onMouseEnter={(e) => {
              if (!isImporting && parseResult.rows.length > 0)
                e.currentTarget.style.opacity = '0.85';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {isImporting ? 'Importing…' : `Import ${parseResult.rows.length} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table Detail View ────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'board';

interface TableViewProps {
  table: TableDef;
  onBack: () => void;
}

function TableView({ table, onBack }: TableViewProps) {
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [sorts, setSorts] = useState<TableSort[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSorts, setShowSorts] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(table.name);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [importPreview, setImportPreview] = useState<CSVParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const selectColumns = table.columns.filter((c) => c.type === 'select');
  const [groupByColumnId, setGroupByColumnId] = useState<string>(selectColumns[0]?.id ?? '');

  useEffect(() => {
    if (!selectColumns.find((c) => c.id === groupByColumnId) && selectColumns.length > 0) {
      setGroupByColumnId(selectColumns[0].id);
    }
  }, [table.columns, groupByColumnId, selectColumns]);

  const nameRef = useRef<HTMLInputElement>(null);
  const addColumnRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const updateTable = useUpdateTable();
  const addColumn = useAddColumn();
  const createRow = useCreateRow();
  const { data: rows = [], isLoading } = useRows(table.id, filters, sorts);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (addColumnRef.current && !addColumnRef.current.contains(e.target as Node)) {
        setShowAddColumn(false);
      }
    }
    if (showAddColumn) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showAddColumn]);

  function commitName() {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== table.name) {
      updateTable.mutate({ id: table.id, data: { name: trimmed } });
    } else {
      setNameInput(table.name);
    }
    setEditingName(false);
  }

  function handleAddColumn(column: ColumnDef) {
    addColumn.mutate({ tableId: table.id, column });
    setShowAddColumn(false);
  }

  function handleAddRow() {
    createRow.mutate({ tableId: table.id, data: {} });
  }

  const handleExport = useCallback(() => {
    const csv = exportTableToCSV(table, rows);
    const safeName = table.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadCSV(csv, `${safeName}.csv`);
  }, [table, rows]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const result = parseCSVToRows(text, table.columns);
        setImportPreview(result);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [table.columns],
  );

  const handleImportConfirm = useCallback(async () => {
    if (!importPreview) return;
    setIsImporting(true);
    try {
      for (const row of importPreview.rows) {
        await tableService.createRow({ tableId: table.id, data: row.data });
      }
      setImportPreview(null);
      setIsImporting(false);
      void queryClient.invalidateQueries({ queryKey: ['tableRows', table.id] });
    } catch {
      setIsImporting(false);
    }
  }, [importPreview, table.id, queryClient]);

  // ── Toolbar button style helpers ──────────────────────────────────────────

  function toolbarBtn(active?: boolean): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '5px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.15s',
      backgroundColor: active ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
      color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
    };
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-6 pt-5 pb-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Breadcrumb */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs mb-3 rounded-lg px-2 py-1 transition-colors"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <ArrowLeft size={13} />
          Tables
        </button>

        {/* Table name + icon */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            {table.icon ? (
              <span className="text-lg">{table.icon}</span>
            ) : (
              <Table2 size={16} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                ref={nameRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameInput(table.name); setEditingName(false); }
                }}
                className="text-xl font-bold bg-transparent w-full outline-none"
                style={{
                  color: 'var(--color-text-primary)',
                  borderBottom: '2px solid var(--color-accent)',
                  paddingBottom: '1px',
                }}
              />
            ) : (
              <h1
                className="text-xl font-bold truncate cursor-text"
                style={{ color: 'var(--color-text-primary)' }}
                onClick={() => setEditingName(true)}
                title="Click to rename"
              >
                {table.name}
              </h1>
            )}
            {table.description && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                {table.description}
              </p>
            )}
          </div>
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Filter */}
          <button
            style={toolbarBtn(showFilters || filters.length > 0)}
            onClick={() => { setShowFilters((v) => !v); setShowSorts(false); }}
            onMouseEnter={(e) => {
              if (!(showFilters || filters.length > 0)) e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!(showFilters || filters.length > 0)) e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Filter size={12} />
            Filter
            {filters.length > 0 && (
              <span
                className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {filters.length}
              </span>
            )}
          </button>

          {/* Sort */}
          <button
            style={toolbarBtn(showSorts || sorts.length > 0)}
            onClick={() => { setShowSorts((v) => !v); setShowFilters(false); }}
            onMouseEnter={(e) => {
              if (!(showSorts || sorts.length > 0)) e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!(showSorts || sorts.length > 0)) e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <ArrowUpDown size={12} />
            Sort
            {sorts.length > 0 && (
              <span
                className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                {sorts.length}
              </span>
            )}
          </button>

          {/* View toggle */}
          {selectColumns.length > 0 && (
            <div
              className="flex items-center rounded-lg p-0.5"
              style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'grid' ? 'var(--color-bg-elevated)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <LayoutGrid size={11} />
                Grid
              </button>
              <button
                onClick={() => setViewMode('board')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  backgroundColor: viewMode === 'board' ? 'var(--color-bg-elevated)' : 'transparent',
                  color: viewMode === 'board' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'board' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Columns3 size={11} />
                Board
              </button>
            </div>
          )}

          {/* Export CSV */}
          <button
            style={toolbarBtn()}
            onClick={handleExport}
            disabled={rows.length === 0}
            title="Export as CSV"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <Download size={12} />
            Export
          </button>

          {/* Import CSV */}
          <button
            style={toolbarBtn()}
            onClick={() => fileInputRef.current?.click()}
            title="Import from CSV"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          >
            <Upload size={12} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Add Column */}
          <div className="relative ml-auto" ref={addColumnRef}>
            <button
              style={toolbarBtn()}
              onClick={() => setShowAddColumn((v) => !v)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              <Plus size={12} />
              Add Column
            </button>
            {showAddColumn && (
              <div
                className="absolute top-full right-0 mt-1.5 z-50 w-72 rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  boxShadow: 'var(--shadow-popup)',
                }}
              >
                <AddColumnPanel
                  onSave={handleAddColumn}
                  onCancel={() => setShowAddColumn(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter / Sort bars ──────────────────────────────────────────────── */}
      {showFilters && (
        <FilterBar columns={table.columns} filters={filters} onChange={setFilters} />
      )}
      {showSorts && (
        <SortBar columns={table.columns} sorts={sorts} onChange={setSorts} />
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner text="Loading table…" />
          </div>
        ) : viewMode === 'board' && selectColumns.length > 0 ? (
          <TableBoardView
            table={table}
            rows={rows}
            groupByColumnId={groupByColumnId}
            onGroupByChange={setGroupByColumnId}
          />
        ) : (
          <TableGrid
            table={table}
            rows={rows}
            filters={filters}
            sorts={sorts}
            onSortsChange={setSorts}
            onShowAddColumn={() => setShowAddColumn(true)}
          />
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 py-2.5 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
          {filters.length > 0 && ' (filtered)'}
        </span>
        <button
          onClick={handleAddRow}
          disabled={createRow.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <Plus size={12} />
          Add Row
        </button>
      </div>

      {/* ── Import modal ────────────────────────────────────────────────────── */}
      {importPreview && (
        <ImportPreviewModal
          parseResult={importPreview}
          tableName={table.name}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportPreview(null)}
          isImporting={isImporting}
        />
      )}
    </div>
  );
}

// ─── Table Templates ─────────────────────────────────────────────────────────

interface TableTemplate {
  name: string;
  icon: string;
  description: string;
  columns: import('@/shared/types/table').ColumnDef[];
}

const TABLE_TEMPLATES: TableTemplate[] = [
  {
    name: 'Project Tracker',
    icon: '🚀',
    description: 'Track tasks, owners, status and deadlines',
    columns: [
      { id: crypto.randomUUID(), name: 'Task', type: 'text', width: 220 },
      { id: crypto.randomUUID(), name: 'Status', type: 'select', width: 130, options: ['Not Started', 'In Progress', 'Done', 'Blocked'] },
      { id: crypto.randomUUID(), name: 'Owner', type: 'text', width: 140 },
      { id: crypto.randomUUID(), name: 'Due Date', type: 'date', width: 130 },
      { id: crypto.randomUUID(), name: 'Priority', type: 'select', width: 110, options: ['High', 'Medium', 'Low'] },
      { id: crypto.randomUUID(), name: 'Done', type: 'checkbox', width: 80 },
    ],
  },
  {
    name: 'Contacts',
    icon: '👥',
    description: 'Manage people, companies and emails',
    columns: [
      { id: crypto.randomUUID(), name: 'Name', type: 'text', width: 180 },
      { id: crypto.randomUUID(), name: 'Company', type: 'text', width: 160 },
      { id: crypto.randomUUID(), name: 'Email', type: 'email', width: 200 },
      { id: crypto.randomUUID(), name: 'Phone', type: 'text', width: 140 },
      { id: crypto.randomUUID(), name: 'Tag', type: 'select', width: 120, options: ['Client', 'Partner', 'Lead', 'Vendor'] },
      { id: crypto.randomUUID(), name: 'Last Contact', type: 'date', width: 130 },
    ],
  },
  {
    name: 'Inventory',
    icon: '📦',
    description: 'Track items, quantities and values',
    columns: [
      { id: crypto.randomUUID(), name: 'Item', type: 'text', width: 200 },
      { id: crypto.randomUUID(), name: 'Category', type: 'select', width: 130, options: ['Electronics', 'Furniture', 'Supplies', 'Other'] },
      { id: crypto.randomUUID(), name: 'Quantity', type: 'number', width: 100 },
      { id: crypto.randomUUID(), name: 'Unit Price', type: 'number', width: 110 },
      { id: crypto.randomUUID(), name: 'Location', type: 'text', width: 140 },
      { id: crypto.randomUUID(), name: 'In Stock', type: 'checkbox', width: 80 },
    ],
  },
  {
    name: 'Reading List',
    icon: '📚',
    description: 'Books, articles and notes to read',
    columns: [
      { id: crypto.randomUUID(), name: 'Title', type: 'text', width: 220 },
      { id: crypto.randomUUID(), name: 'Author', type: 'text', width: 150 },
      { id: crypto.randomUUID(), name: 'Status', type: 'select', width: 120, options: ['Want to Read', 'Reading', 'Finished', 'Abandoned'] },
      { id: crypto.randomUUID(), name: 'Rating', type: 'number', width: 90 },
      { id: crypto.randomUUID(), name: 'Link', type: 'url', width: 180 },
      { id: crypto.randomUUID(), name: 'Finished', type: 'checkbox', width: 80 },
    ],
  },
];

function TemplatesSection({ onCreate }: { onCreate: (tpl: TableTemplate) => void }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Quick-start templates
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TABLE_TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.name} template={tpl} onCreate={() => onCreate(tpl)} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, onCreate }: { template: TableTemplate; onCreate: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onCreate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left rounded-xl p-4 transition-all"
      style={{
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: hovered ? 'var(--color-accent-soft)' : 'var(--color-bg-secondary)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      <div className="text-xl mb-2">{template.icon}</div>
      <p className="text-sm font-semibold mb-0.5" style={{ color: hovered ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
        {template.name}
      </p>
      <p className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>
        {template.description}
      </p>
      <p className="text-[10px] mt-2 font-medium" style={{ color: hovered ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
        {template.columns.length} columns · Use template →
      </p>
    </button>
  );
}

// ─── Create Table Form ────────────────────────────────────────────────────────

interface CreateTableFormProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CreateTableForm({ onSave, onCancel, isLoading }: CreateTableFormProps) {
  const [name, setName] = useState('');
  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        border: '1px solid var(--color-accent)',
        backgroundColor: 'var(--color-bg-secondary)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
        Create new table
      </h2>
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) onSave(name.trim());
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Table name…"
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim() || isLoading}
          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => { if (name.trim() && !isLoading) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {isLoading ? 'Creating…' : 'Create'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState('');

  const { data: tables = [], isLoading } = useTables();
  const createTable = useCreateTable();

  // Sync selectedTable when underlying data updates (e.g., column added)
  useEffect(() => {
    if (selectedTable && tables.length > 0) {
      const fresh = tables.find((t) => t.id === selectedTable.id);
      if (fresh && (fresh.name !== selectedTable.name || fresh.columns !== selectedTable.columns)) {
        setSelectedTable(fresh);
      }
    }
  }, [tables, selectedTable]);

  function handleCreate(name: string) {
    createTable.mutate(
      { name },
      {
        onSuccess: (created) => {
          setShowCreateForm(false);
          setSelectedTable(created);
        },
      },
    );
  }

  function handleCreateFromTemplate(tpl: TableTemplate) {
    createTable.mutate(
      { name: tpl.name, columns: tpl.columns },
      {
        onSuccess: (created) => {
          setSelectedTable(created);
        },
      },
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedTable) {
    const freshTable = tables.find((t) => t.id === selectedTable.id) ?? selectedTable;
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <TableView table={freshTable} onBack={() => setSelectedTable(null)} />
        </div>
      </div>
    );
  }

  // ── Table list ─────────────────────────────────────────────────────────────
  const filteredTables = search.trim()
    ? tables.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : tables;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-8 pt-7 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Tables
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Structured data at your fingertips
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <Plus size={15} />
            New Table
          </button>
        </div>

        {/* Search */}
        {tables.length > 0 && (
          <div className="relative max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tables…"
              className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Create form */}
        {showCreateForm && (
          <CreateTableForm
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createTable.isPending}
          />
        )}

        {isLoading ? (
          <LoadingSpinner text="Loading tables…" />
        ) : tables.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <div>
            <EmptyState
              icon="📊"
              title="No tables yet"
              description="Create a table to organize structured data with formulas and filters"
              actionLabel="Create Table"
              onAction={() => setShowCreateForm(true)}
            />
            <TemplatesSection onCreate={handleCreateFromTemplate} />
          </div>
        ) : filteredTables.length === 0 ? (
          /* ── No search results ───────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Search size={28} style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              No tables match &ldquo;{search}&rdquo;
            </p>
            <button
              onClick={() => setSearch('')}
              className="text-sm transition-colors"
              style={{ color: 'var(--color-accent)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              Clear search
            </button>
          </div>
        ) : (
          /* ── Table grid ──────────────────────────────────────────────────── */
          <>
            {search && (
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {filteredTables.length} result{filteredTables.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
              </p>
            )}
            <div
              className="gap-4"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
            >
              {filteredTables.map((t) => (
                <TableCardWithCount
                  key={t.id}
                  table={t}
                  onSelect={() => setSelectedTable(t)}
                />
              ))}
            </div>
            {!search && (
              <TemplatesSection onCreate={handleCreateFromTemplate} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
