import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tableService } from '@/shared/lib/tableService';
import type {
  CreateTableInput,
  UpdateTableInput,
  ColumnDef,
  CreateRowInput,
  UpdateRowInput,
  TableFilter,
  TableSort,
} from '@/shared/types/table';

const TABLES_KEY = ['tables'] as const;
const ROWS_KEY = ['tableRows'] as const;

// ─── Table queries ────────────────────────────────────────────────────────────

export function useTables(projectId?: string) {
  return useQuery({
    queryKey: [...TABLES_KEY, { projectId }],
    queryFn: () => tableService.listTables(projectId),
  });
}

export function useTable(id: string) {
  return useQuery({
    queryKey: [...TABLES_KEY, id],
    queryFn: () => tableService.getTable(id),
    enabled: !!id,
  });
}

// ─── Table mutations ──────────────────────────────────────────────────────────

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTableInput) => tableService.createTable(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
    },
  });
}

export function useUpdateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTableInput }) =>
      tableService.updateTable(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
    },
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tableService.deleteTable(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
      qc.invalidateQueries({ queryKey: ROWS_KEY });
    },
  });
}

// ─── Column mutations ─────────────────────────────────────────────────────────

export function useAddColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, column }: { tableId: string; column: ColumnDef }) =>
      tableService.addColumn(tableId, column),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
    },
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableId,
      columnId,
      updates,
    }: {
      tableId: string;
      columnId: string;
      updates: Partial<ColumnDef>;
    }) => tableService.updateColumn(tableId, columnId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
    },
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, columnId }: { tableId: string; columnId: string }) =>
      tableService.deleteColumn(tableId, columnId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TABLES_KEY });
      qc.invalidateQueries({ queryKey: ROWS_KEY });
    },
  });
}

// ─── Row queries ──────────────────────────────────────────────────────────────

export function useRows(tableId: string, filters?: TableFilter[], sorts?: TableSort[]) {
  return useQuery({
    queryKey: [...ROWS_KEY, tableId, { filters, sorts }],
    queryFn: () => tableService.listRows(tableId, filters, sorts),
    enabled: !!tableId,
  });
}

// ─── Row mutations ────────────────────────────────────────────────────────────

export function useCreateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRowInput) => tableService.createRow(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...ROWS_KEY, variables.tableId] });
    },
  });
}

export function useUpdateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRowInput }) =>
      tableService.updateRow(id, data),
    onSuccess: (updatedRow) => {
      qc.invalidateQueries({ queryKey: [...ROWS_KEY, updatedRow.tableId] });
    },
  });
}

export function useDeleteRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tableId }: { id: string; tableId: string }) =>
      tableService.deleteRow(id).then(() => tableId),
    onSuccess: (tableId) => {
      qc.invalidateQueries({ queryKey: [...ROWS_KEY, tableId] });
    },
  });
}

export function useUpdateCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      columnId,
      value,
      tableId,
    }: {
      rowId: string;
      columnId: string;
      value: unknown;
      tableId: string;
    }) => tableService.updateCell(rowId, columnId, value).then((row) => ({ row, tableId })),
    onSuccess: ({ tableId }) => {
      qc.invalidateQueries({ queryKey: [...ROWS_KEY, tableId] });
    },
  });
}
