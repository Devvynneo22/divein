/**
 * CSV Import/Export Service
 *
 * Handles CSV parsing (with proper RFC 4180 quoting) and export
 * for the Tables module.
 */
import type { TableDef, TableRow, ColumnDef, ColumnType } from '@/shared/types/table';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellToString(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined || value === '') return '';

  switch (type) {
    case 'checkbox':
      return value ? 'true' : 'false';
    case 'multiselect':
      return Array.isArray(value) ? (value as string[]).join(', ') : String(value);
    case 'number':
      return String(value);
    default:
      return String(value);
  }
}

export function exportTableToCSV(table: TableDef, rows: TableRow[]): string {
  const headers = table.columns.map((col) => escapeCSVField(col.name));
  const headerLine = headers.join(',');

  const dataLines = rows.map((row) =>
    table.columns
      .map((col) => escapeCSVField(cellToString(row.data[col.id], col.type)))
      .join(','),
  );

  return [headerLine, ...dataLines].join('\r\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── CSV Parse ────────────────────────────────────────────────────────────────

/**
 * RFC 4180-compliant CSV parser that handles:
 * - Quoted fields with commas, newlines, and escaped quotes ("")
 * - Unquoted fields
 * - CRLF and LF line endings
 */
export function parseCSV(csvString: string): string[][] {
  const results: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const next = csvString[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"' && current === '') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\r' && next === '\n') {
        row.push(current);
        current = '';
        results.push(row);
        row = [];
        i++; // skip \n
      } else if (char === '\n') {
        row.push(current);
        current = '';
        results.push(row);
        row = [];
      } else {
        current += char;
      }
    }
  }

  // Push last field/row
  if (current !== '' || row.length > 0) {
    row.push(current);
    results.push(row);
  }

  return results;
}

// ─── Type coercion ────────────────────────────────────────────────────────────

function coerceValue(raw: string, type: ColumnType, column: ColumnDef): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return type === 'checkbox' ? false : undefined;

  switch (type) {
    case 'number': {
      const num = Number(trimmed);
      return isNaN(num) ? undefined : num;
    }
    case 'checkbox':
      return ['true', '1', 'yes', 'y'].includes(trimmed.toLowerCase());
    case 'multiselect':
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    case 'select': {
      // Try to match against options (case-insensitive)
      if (column.options) {
        const match = column.options.find(
          (o) => o.toLowerCase() === trimmed.toLowerCase(),
        );
        if (match) return match;
      }
      return trimmed;
    }
    case 'date':
    case 'text':
    case 'url':
    case 'email':
    default:
      return trimmed;
  }
}

export interface ParsedCSVRow {
  data: Record<string, unknown>;
  raw: Record<string, string>; // original string values for preview
}

export interface CSVParseResult {
  headers: string[];
  mappedColumns: Array<{ csvHeader: string; column: ColumnDef | null }>;
  rows: ParsedCSVRow[];
  unmappedHeaders: string[];
}

/**
 * Parse CSV string and map columns to table column definitions.
 * Matching is case-insensitive by column name.
 */
export function parseCSVToRows(csvString: string, columns: ColumnDef[]): CSVParseResult {
  const parsed = parseCSV(csvString);
  if (parsed.length === 0) {
    return { headers: [], mappedColumns: [], rows: [], unmappedHeaders: [] };
  }

  const [headerRow, ...dataRows] = parsed;
  const headers = headerRow.map((h) => h.trim());

  // Map CSV headers to table columns (case-insensitive)
  const columnMap = new Map(columns.map((c) => [c.name.toLowerCase(), c]));
  const mappedColumns = headers.map((h) => ({
    csvHeader: h,
    column: columnMap.get(h.toLowerCase()) ?? null,
  }));
  const unmappedHeaders = mappedColumns
    .filter((m) => m.column === null)
    .map((m) => m.csvHeader);

  const rows: ParsedCSVRow[] = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== '')) // skip blank rows
    .map((row) => {
      const data: Record<string, unknown> = {};
      const raw: Record<string, string> = {};

      headers.forEach((header, i) => {
        const mapping = mappedColumns[i];
        const cellValue = row[i] ?? '';
        raw[header] = cellValue;

        if (mapping.column) {
          const coerced = coerceValue(cellValue, mapping.column.type, mapping.column);
          if (coerced !== undefined) {
            data[mapping.column.id] = coerced;
          }
        }
      });

      return { data, raw };
    });

  return { headers, mappedColumns, rows, unmappedHeaders };
}
