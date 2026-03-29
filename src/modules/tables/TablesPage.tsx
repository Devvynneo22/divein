import { useState, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import { ArrowLeft, Plus, Table2, Filter, ArrowUpDown, Download, Upload, LayoutGrid, Columns3, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useRows,
  useCreateRow,
  useAddColumn,
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

// ─── Row count fetcher for cards ──────────────────────────────────────────────

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

// ─── CSV Import Preview Modal ─────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div
        className="rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
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

        {/* Column mapping summary */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Column Mapping</p>
          <div className="flex flex-wrap gap-1.5">
            {parseResult.mappedColumns.map((m) => (
              <span
                key={m.csvHeader}
                className="px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  backgroundColor: m.column ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                  {parseResult.headers.map((h) => (
                    <th
                      key={h}
                      className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                      style={{
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {parseResult.headers.map((h) => (
                      <td
                        key={h}
                        className="px-2 py-1 max-w-[200px] truncate"
                        style={{
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                        }}
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
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onMouseEnter={(e) => {
              if (!isImporting && parseResult.rows.length > 0)
                e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            {isImporting ? 'Importing...' : `Import ${parseResult.rows.length} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table View ───────────────────────────────────────────────────────────────

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

  // Board view state
  const selectColumns = table.columns.filter((c) => c.type === 'select');
  const [groupByColumnId, setGroupByColumnId] = useState<string>(
    selectColumns[0]?.id ?? '',
  );

  // Update groupByColumnId when columns change
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

  // Close add column panel on outside click
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

  // ── CSV Export ──────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const csv = exportTableToCSV(table, rows);
    const safeName = table.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadCSV(csv, `${safeName}.csv`);
  }, [table, rows]);

  // ── CSV Import ──────────────────────────────────────────────────────────────

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
      // Reset input so same file can be re-selected
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
      // Invalidate rows cache to show newly imported data
      void queryClient.invalidateQueries({ queryKey: ['tableRows', table.id] });
    } catch {
      setIsImporting(false);
    }
  }, [importPreview, table.id, queryClient]);

  // Toolbar button helper styles
  const toolbarBtnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'colors 0.15s',
    cursor: 'pointer',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
    border: 'none',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-6 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <ArrowLeft size={16} />
          All Tables
        </button>

        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
          >
            {table.icon ? (
              <span className="text-xl">{table.icon}</span>
            ) : (
              <Table2 size={18} style={{ color: 'var(--color-text-muted)' }} />
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
                  if (e.key === 'Escape') {
                    setNameInput(table.name);
                    setEditingName(false);
                  }
                }}
                className="text-2xl font-bold bg-transparent w-full outline-none"
                style={{
                  color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--color-accent)',
                }}
              />
            ) : (
              <h1
                className="text-2xl font-bold truncate cursor-text"
                style={{ color: 'var(--color-text-primary)' }}
                onClick={() => setEditingName(true)}
              >
                {table.name}
              </h1>
            )}
            {table.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{table.description}</p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowFilters((v) => !v);
              setShowSorts(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: (showFilters || filters.length > 0) ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)',
              color: (showFilters || filters.length > 0) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!(showFilters || filters.length > 0)) e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!(showFilters || filters.length > 0)) e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Filter size={13} />
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

          <button
            onClick={() => {
              setShowSorts((v) => !v);
              setShowFilters(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: (showSorts || sorts.length > 0) ? 'var(--color-accent-muted)' : 'var(--color-bg-tertiary)',
              color: (showSorts || sorts.length > 0) ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!(showSorts || sorts.length > 0)) e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!(showSorts || sorts.length > 0)) e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <ArrowUpDown size={13} />
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
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? 'var(--color-bg-primary)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <LayoutGrid size={12} />
                Grid
              </button>
              <button
                onClick={() => setViewMode('board')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: viewMode === 'board' ? 'var(--color-bg-primary)' : 'transparent',
                  color: viewMode === 'board' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  boxShadow: viewMode === 'board' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <Columns3 size={12} />
                Board
              </button>
            </div>
          )}

          {/* CSV Export */}
          <button
            onClick={handleExport}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            title="Export as CSV"
          >
            <Download size={13} />
            Export
          </button>

          {/* CSV Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            title="Import from CSV"
          >
            <Upload size={13} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Add Column — positioned button + floating panel */}
          <div className="relative ml-auto" ref={addColumnRef}>
            <button
              onClick={() => setShowAddColumn((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
            >
              <Plus size={13} />
              Add Column
            </button>
            {showAddColumn && (
              <div
                className="absolute top-full right-0 mt-1 z-50 w-72 rounded-xl shadow-2xl"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-elevated)',
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

      {/* Filter/Sort bars */}
      {showFilters && (
        <FilterBar columns={table.columns} filters={filters} onChange={setFilters} />
      )}
      {showSorts && (
        <SortBar columns={table.columns} sorts={sorts} onChange={setSorts} />
      )}

      {/* Content area — Grid or Board */}
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

      {/* Import Preview Modal */}
      {importPreview && (
        <ImportPreviewModal
          parseResult={importPreview}
          tableName={table.name}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportPreview(null)}
          isImporting={isImporting}
        />
      )}

      {/* Footer */}
      <div
        className="flex-shrink-0 px-6 py-2 text-xs"
        style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        {filters.length > 0 && ' (filtered)'}
      </div>
    </div>
  );
}

// ─── Create table form ────────────────────────────────────────────────────────

interface CreateTableFormProps {
  onSave: (name: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CreateTableForm({ onSave, onCancel, isLoading }: CreateTableFormProps) {
  const [name, setName] = useState('');
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
      }}
    >
      <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        Create New Table
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
          placeholder="Table name..."
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
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          onMouseEnter={(e) => {
            if (name.trim() && !isLoading) e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
        >
          Create
        </button>
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
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TablesPage() {
  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: tables = [], isLoading } = useTables();
  const createTable = useCreateTable();

  // Sync selectedTable if it was updated (e.g. name change)
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

  // ── Table View ─────────────────────────────────────────────────────────────
  if (selectedTable) {
    // Get fresh version from cache
    const freshTable = tables.find((t) => t.id === selectedTable.id) ?? selectedTable;
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col min-w-0">
          <TableView table={freshTable} onBack={() => setSelectedTable(null)} />
        </div>
      </div>
    );
  }

  // ── Table Browser ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Tables</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Structured data at your fingertips
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
          >
            <Plus size={16} />
            New Table
          </button>
        </div>

        {showCreateForm && (
          <CreateTableForm
            onSave={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createTable.isPending}
          />
        )}
      </div>

      {/* Table grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <LoadingSpinner text="Loading tables…" />
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <Table2 size={28} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>No tables yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Create your first table to organize structured data
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed text-sm transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.color = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <Plus size={14} />
              Create a Table
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((t) => (
              <TableCardWithCount
                key={t.id}
                table={t}
                onSelect={() => setSelectedTable(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
