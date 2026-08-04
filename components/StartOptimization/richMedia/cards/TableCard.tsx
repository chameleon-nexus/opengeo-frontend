import React, { useMemo, useState } from 'react';

type Cell = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
type Row = Cell[] | Record<string, unknown> | unknown;

interface Props {
  title: string;
  columns: string[];
  rows: Row[];
}

const MAX_VISIBLE = 20;

const formatCell = (cell: unknown): string => {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') {
    return String(cell);
  }
  try {
    return JSON.stringify(cell);
  } catch {
    return String(cell);
  }
};

const normalizeRow = (row: unknown, columns: string[]): string[] => {
  if (Array.isArray(row)) {
    return row.map((c) => formatCell(c));
  }
  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    if (columns.length > 0) {
      return columns.map((col) => formatCell(obj[col]));
    }
    return Object.values(obj).map((c) => formatCell(c));
  }
  return [formatCell(row)];
};

const formatHeader = (col: unknown): string => {
  if (col === null || col === undefined) return '';
  if (typeof col === 'string' || typeof col === 'number' || typeof col === 'boolean') {
    return String(col);
  }
  if (col && typeof col === 'object') {
    const o = col as Record<string, unknown>;
    const v = o.label ?? o.title ?? o.name ?? o.header ?? o.key;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    try {
      return JSON.stringify(col);
    } catch {
      return String(col);
    }
  }
  return String(col);
};

const TableCard: React.FC<Props> = ({ title, columns, rows }) => {
  const [expanded, setExpanded] = useState(false);
  const safeCols = Array.isArray(columns) ? columns.map(formatHeader) : [];
  const safeRows: string[][] = useMemo(
    () => (Array.isArray(rows) ? rows.map((r) => normalizeRow(r, safeCols)) : []),
    [rows, safeCols],
  );

  const visibleRows = useMemo(() => {
    if (expanded || safeRows.length <= MAX_VISIBLE) return safeRows;
    return safeRows.slice(0, MAX_VISIBLE);
  }, [expanded, safeRows]);

  const hiddenCount = safeRows.length - visibleRows.length;

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-2 py-2 text-left shadow-sm w-full min-w-0">
      <div className="text-xs font-semibold text-gray-800 mb-2 px-1">{title}</div>
      <div className="overflow-x-auto max-w-full">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              {safeCols.map((c, i) => (
                <th
                  key={i}
                  className="text-left font-medium text-gray-600 py-1.5 pr-3 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-50 last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-1.5 pr-3 text-gray-800 tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs text-[#E8553F] hover:underline px-1"
        >
          还有 {hiddenCount} 行，点击展开
        </button>
      ) : null}
    </div>
  );
};

export default TableCard;
