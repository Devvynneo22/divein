import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Table2, Filter, ArrowUpDown } from 'lucide-react';
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useRows,
  useAddColumn,
} from './hooks/useTables';
import { TableCard } from './components/TableCard';
import { TableGrid } from './components/TableGrid';
import { FilterBar } from './components/FilterBar';
import { SortBar } from './components/SortBar';
import { AddColumnPanel } from './components/AddColumnPanel';
import { tableService } from '@/shared/lib/tableService';
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

// ─── Table View ───────────────────────────────────────────────────────────────

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

  const nameRef = useRef<HTMLInputElement>(null);
  const addColumnRef = useRef<HTMLDivElement>(null);

  const updateTable = useUpdateTable();
  const addColumn = useAddColumn();
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          All Tables
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
            {table.icon ? (
              <span className="text-xl">{table.icon}</span>
            ) : (
              <Table2 size={18} className="text-[var(--color-text-muted)]" />
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
                className="text-2xl font-bold bg-transparent text-[var(--color-text-primary)] outline-none border-b border-[var(--color-accent)] w-full"
              />
            ) : (
              <h1
                className="text-2xl font-bold text-[var(--color-text-primary)] cursor-text hover:text-[var(--color-text-primary)] truncate"
                onClick={() => setEditingName(true)}
              >
                {table.name}
              </h1>
            )}
            {table.description && (
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{table.description}</p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowFilters((v) => !v);
              setShowSorts(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showFilters || filters.length > 0
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Filter size={13} />
            Filter
            {filters.length > 0 && (
              <span className="bg-[var(--color-accent)] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {filters.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowSorts((v) => !v);
              setShowFilters(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showSorts || sorts.length > 0
                ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <ArrowUpDown size={13} />
            Sort
            {sorts.length > 0 && (
              <span className="bg-[var(--color-accent)] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {sorts.length}
              </span>
            )}
          </button>

          {/* Add Column — positioned button + floating panel */}
          <div className="relative ml-auto" ref={addColumnRef}>
            <button
              onClick={() => setShowAddColumn((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Plus size={13} />
              Add Column
            </button>
            {showAddColumn && (
              <div className="absolute top-full right-0 mt-1 z-50 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-2xl">
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

      {/* Grid */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
            Loading...
          </div>
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

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 mb-6">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
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
          className="flex-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        <button
          onClick={() => name.trim() && onSave(name.trim())}
          disabled={!name.trim() || isLoading}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
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
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Tables</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Structured data at your fingertips
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
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
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
            Loading...
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-secondary)] flex items-center justify-center">
              <Table2 size={28} className="text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-[var(--color-text-secondary)] font-medium">No tables yet</p>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                Create your first table to organize structured data
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
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
