// Column type system — this is the core of the module
export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'formula'
  | 'rating'
  | 'progress';

export interface ColumnDef {
  id: string; // stable UUID
  name: string;
  type: ColumnType;
  width?: number; // pixel width, default 150
  options?: string[]; // for 'select' and 'multiselect' types — the available choices
  required?: boolean;
  formula?: string; // for 'formula' type — the expression to evaluate
}

export interface TableDef {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  icon: string | null;
  columns: ColumnDef[]; // parsed from JSON
  createdAt: string;
  updatedAt: string;
}

export interface TableRow {
  id: string;
  tableId: string;
  data: Record<string, unknown>; // key = column id, value = typed data
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableInput {
  name: string;
  description?: string;
  projectId?: string;
  icon?: string;
  columns?: ColumnDef[];
}

export interface UpdateTableInput {
  name?: string;
  description?: string | null;
  projectId?: string | null;
  icon?: string | null;
  columns?: ColumnDef[];
}

export interface CreateRowInput {
  tableId: string;
  data?: Record<string, unknown>;
}

export interface UpdateRowInput {
  data?: Record<string, unknown>;
  sortOrder?: number;
}

export interface TableFilter {
  columnId: string;
  operator:
    | 'eq'
    | 'neq'
    | 'contains'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'empty'
    | 'notEmpty';
  value: unknown;
}

export interface TableSort {
  columnId: string;
  direction: 'asc' | 'desc';
}
