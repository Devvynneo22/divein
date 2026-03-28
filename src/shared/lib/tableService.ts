/**
 * Table Data Service — abstraction layer over storage.
 *
 * Current: in-memory (for web-only development).
 * Future:  swap implementation to Electron IPC (window.api.tables.*) without
 *          changing any component or hook code.
 */
import type {
  TableDef,
  TableRow,
  ColumnDef,
  CreateTableInput,
  UpdateTableInput,
  CreateRowInput,
  UpdateRowInput,
  TableFilter,
  TableSort,
} from '@/shared/types/table';

// ─── Persistent store ────────────────────────────────────────────────────────

const TABLES_KEY = 'nexus-tables';
const ROWS_KEY = 'nexus-table-rows';

function loadTables(): TableDef[] {
  try {
    const raw = localStorage.getItem(TABLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TableDef[];
  } catch {
    return [];
  }
}

function loadRows(): TableRow[] {
  try {
    const raw = localStorage.getItem(ROWS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TableRow[];
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables));
    localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
  } catch {
    // ignore storage errors
  }
}

let tables: TableDef[] = loadTables();
let rows: TableRow[] = loadRows();

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ─── Default column template ─────────────────────────────────────────────────

function defaultColumns(): ColumnDef[] {
  return [
    { id: generateId(), name: 'Name', type: 'text', width: 250 },
    {
      id: generateId(),
      name: 'Status',
      type: 'select',
      width: 120,
      options: ['Todo', 'In Progress', 'Done'],
    },
    { id: generateId(), name: 'Notes', type: 'text', width: 200 },
  ];
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function applyFilter(value: unknown, filter: TableFilter): boolean {
  const { operator, value: filterValue } = filter;

  // empty / notEmpty work for all types
  if (operator === 'empty') {
    return value === null || value === undefined || value === '' || value === false;
  }
  if (operator === 'notEmpty') {
    return value !== null && value !== undefined && value !== '' && value !== false;
  }

  // Type-specific operators
  switch (operator) {
    case 'eq':
      if (typeof value === 'number' && typeof filterValue === 'string') {
        return value === parseFloat(filterValue);
      }
      return String(value ?? '').toLowerCase() === String(filterValue ?? '').toLowerCase();

    case 'neq':
      if (typeof value === 'number' && typeof filterValue === 'string') {
        return value !== parseFloat(filterValue);
      }
      return String(value ?? '').toLowerCase() !== String(filterValue ?? '').toLowerCase();

    case 'contains':
      if (Array.isArray(value)) {
        // multiselect: check if array contains the filter value
        return value.includes(String(filterValue ?? ''));
      }
      return String(value ?? '').toLowerCase().includes(String(filterValue ?? '').toLowerCase());

    case 'gt':
      return Number(value) > Number(filterValue);
    case 'lt':
      return Number(value) < Number(filterValue);
    case 'gte':
      return Number(value) >= Number(filterValue);
    case 'lte':
      return Number(value) <= Number(filterValue);

    default:
      return true;
  }
}

function applyFilters(row: TableRow, filters: TableFilter[]): boolean {
  return filters.every((f) => applyFilter(row.data[f.columnId], f));
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  // Nullish values sort last regardless of direction
  const aNull = a === null || a === undefined || a === '';
  const bNull = b === null || b === undefined || b === '';
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else if (typeof a === 'string' && typeof b === 'string') {
    // Try date comparison first (ISO strings)
    const aDate = Date.parse(a);
    const bDate = Date.parse(b);
    if (!isNaN(aDate) && !isNaN(bDate)) {
      cmp = aDate - bDate;
    } else {
      cmp = a.localeCompare(b);
    }
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    cmp = Number(a) - Number(b);
  } else {
    cmp = String(a).localeCompare(String(b));
  }

  return direction === 'asc' ? cmp : -cmp;
}

function applySort(rowList: TableRow[], sorts: TableSort[]): TableRow[] {
  if (sorts.length === 0) return rowList;
  return [...rowList].sort((a, b) => {
    for (const sort of sorts) {
      const cmp = compareValues(
        a.data[sort.columnId],
        b.data[sort.columnId],
        sort.direction,
      );
      if (cmp !== 0) return cmp;
    }
    return a.sortOrder - b.sortOrder;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const tableService = {
  // ── Table CRUD ──────────────────────────────────────────────────────────────

  async listTables(projectId?: string): Promise<TableDef[]> {
    let result = [...tables];
    if (projectId !== undefined) {
      result = result.filter((t) => t.projectId === projectId);
    }
    return result.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  },

  async getTable(id: string): Promise<TableDef | null> {
    return tables.find((t) => t.id === id) ?? null;
  },

  async createTable(input: CreateTableInput): Promise<TableDef> {
    const table: TableDef = {
      id: generateId(),
      name: input.name,
      description: input.description ?? null,
      projectId: input.projectId ?? null,
      icon: input.icon ?? null,
      columns: input.columns ?? defaultColumns(),
      createdAt: now(),
      updatedAt: now(),
    };
    tables.push(table);
    persist();
    return table;
  },

  async updateTable(id: string, input: UpdateTableInput): Promise<TableDef> {
    const idx = tables.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Table ${id} not found`);
    const existing = tables[idx];
    const updated: TableDef = {
      ...existing,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.columns !== undefined && { columns: input.columns }),
      updatedAt: now(),
    };
    tables[idx] = updated;
    persist();
    return updated;
  },

  async deleteTable(id: string): Promise<void> {
    tables = tables.filter((t) => t.id !== id);
    rows = rows.filter((r) => r.tableId !== id);
    persist();
  },

  // ── Column management ────────────────────────────────────────────────────────

  async addColumn(tableId: string, column: ColumnDef): Promise<TableDef> {
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error(`Table ${tableId} not found`);
    const table = tables[idx];
    tables[idx] = {
      ...table,
      columns: [...table.columns, column],
      updatedAt: now(),
    };
    persist();
    return tables[idx];
  },

  async updateColumn(
    tableId: string,
    columnId: string,
    updates: Partial<ColumnDef>,
  ): Promise<TableDef> {
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error(`Table ${tableId} not found`);
    const table = tables[idx];
    tables[idx] = {
      ...table,
      columns: table.columns.map((c) =>
        c.id === columnId ? { ...c, ...updates } : c,
      ),
      updatedAt: now(),
    };
    persist();
    return tables[idx];
  },

  async deleteColumn(tableId: string, columnId: string): Promise<TableDef> {
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new Error(`Table ${tableId} not found`);
    const table = tables[idx];
    tables[idx] = {
      ...table,
      columns: table.columns.filter((c) => c.id !== columnId),
      updatedAt: now(),
    };
    // Clean up column data from all rows
    rows = rows.map((r) => {
      if (r.tableId !== tableId) return r;
      const newData = { ...r.data };
      delete newData[columnId];
      return { ...r, data: newData, updatedAt: now() };
    });
    persist();
    return tables[idx];
  },

  // ── Row CRUD ─────────────────────────────────────────────────────────────────

  async listRows(
    tableId: string,
    filters?: TableFilter[],
    sorts?: TableSort[],
  ): Promise<TableRow[]> {
    let result = rows.filter((r) => r.tableId === tableId);
    if (filters && filters.length > 0) {
      result = result.filter((r) => applyFilters(r, filters));
    }
    result = applySort(result, sorts ?? []);
    if (!sorts || sorts.length === 0) {
      result.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return result;
  },

  async getRow(id: string): Promise<TableRow | null> {
    return rows.find((r) => r.id === id) ?? null;
  },

  async createRow(input: CreateRowInput): Promise<TableRow> {
    const tableRows = rows.filter((r) => r.tableId === input.tableId);
    const maxOrder =
      tableRows.length > 0 ? Math.max(...tableRows.map((r) => r.sortOrder)) : 0;
    const row: TableRow = {
      id: generateId(),
      tableId: input.tableId,
      data: input.data ?? {},
      sortOrder: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    rows.push(row);
    persist();
    return row;
  },

  async updateRow(id: string, input: UpdateRowInput): Promise<TableRow> {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Row ${id} not found`);
    const existing = rows[idx];
    rows[idx] = {
      ...existing,
      ...(input.data !== undefined && { data: { ...existing.data, ...input.data } }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      updatedAt: now(),
    };
    persist();
    return rows[idx];
  },

  async deleteRow(id: string): Promise<void> {
    rows = rows.filter((r) => r.id !== id);
    persist();
  },

  async updateCell(rowId: string, columnId: string, value: unknown): Promise<TableRow> {
    const idx = rows.findIndex((r) => r.id === rowId);
    if (idx === -1) throw new Error(`Row ${rowId} not found`);
    rows[idx] = {
      ...rows[idx],
      data: { ...rows[idx].data, [columnId]: value },
      updatedAt: now(),
    };
    persist();
    return rows[idx];
  },

  // ── Utility ──────────────────────────────────────────────────────────────────

  async getRowCount(tableId: string): Promise<number> {
    return rows.filter((r) => r.tableId === tableId).length;
  },
};
