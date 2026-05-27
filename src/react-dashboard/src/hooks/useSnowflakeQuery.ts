"use client";
import { useState, useEffect, useCallback } from "react";

interface SqlResult {
  data: Record<string, unknown>[];
  columns: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSnowflakeQuery(sql: string, enabled = true): SqlResult {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!sql || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/snowflake/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText);
        setError(`HTTP ${resp.status}: ${errText}`);
        return;
      }
      const result = await resp.json();

      if (result.code && result.code !== "090001" && result.code !== "090000") {
        setError(result.message || "Query failed");
        return;
      }

      const cols = (result.resultSetMetaData?.rowType || []).map((r: { name: string }) => r.name);
      setColumns(cols);

      const rows = (result.data || []).map((row: string[]) => {
        const obj: Record<string, unknown> = {};
        cols.forEach((col: string, i: number) => {
          const val = row[i];
          const num = Number(val);
          obj[col] = val === null || val === undefined ? null : !isNaN(num) && val !== "" ? num : val;
        });
        return obj;
      });
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sql, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, columns, loading, error, refetch: fetchData };
}
