"use client";
import { useState, useMemo } from "react";

interface Column {
  key: string;
  label: string;
  format?: (v: unknown) => string;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  pageSize?: number;
}

export default function DataTable({ columns, data, pageSize = 20 }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!filter.trim()) return data;
    const q = filter.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => String(row[col.key] ?? "").toLowerCase().includes(q))
    );
  }, [data, filter, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) {
        return sortDir === "asc" ? an - bn : bn - an;
      }
      const as = String(av);
      const bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div>
      <div className="mb-2">
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          className="bg-slate-700 border border-slate-500 rounded px-3 py-1 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#29b5e8] w-48"
        />
        <span className="ml-2 text-xs text-slate-400">{sorted.length} rows</span>
      </div>
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-800">
            <tr className="text-left text-slate-400 border-b border-slate-600">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="pb-2 px-2 cursor-pointer hover:text-white select-none"
                >
                  {col.label}
                  {sortCol === col.key && (
                    <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-b border-slate-700/50 text-slate-200">
                {columns.map((col) => (
                  <td key={col.key} className="py-1 px-2">
                    {col.format ? col.format(row[col.key]) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="text-xs text-blue-300 disabled:text-slate-500">Prev</button>
          <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="text-xs text-blue-300 disabled:text-slate-500">Next</button>
        </div>
      )}
    </div>
  );
}
