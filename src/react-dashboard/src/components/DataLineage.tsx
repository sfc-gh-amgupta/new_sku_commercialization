"use client";
import { useState, useEffect } from "react";
import { METRIC_LINEAGE } from "@/lib/constants";

interface DataLineageProps {
  metricId: string;
}

export default function DataLineage({ metricId }: DataLineageProps) {
  const [expanded, setExpanded] = useState(false);
  const [sqlExpanded, setSqlExpanded] = useState(false);
  const [columnLineage, setColumnLineage] = useState<{ sourceColumn: string; sourceDb: string; sourceSchema: string; sourceTable: string; sourceDomain: string; targetColumn: string; targetDb: string; targetSchema: string; targetTable: string; targetDomain: string; distance: number }[]>([]);
  const [lineageLoading, setLineageLoading] = useState(false);

  const lineage = METRIC_LINEAGE[metricId];
  if (!lineage) return null;

  useEffect(() => {
    if (!expanded) return;
    setLineageLoading(true);
    fetch("/api/snowflake/lineage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectName: lineage.sourceTable, column: lineage.column }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.data && data.data.length > 0) {
          const rows = data.data.map((row: string[]) => ({
            sourceColumn: row[5] || "",
            sourceDb: row[0] || "",
            sourceSchema: row[1] || "",
            sourceTable: row[2] || "",
            sourceDomain: row[3] || "",
            targetColumn: row[12] || "",
            targetDb: row[7] || "",
            targetSchema: row[8] || "",
            targetTable: row[9] || "",
            targetDomain: row[10] || "",
            distance: Number(row[14]) || 1,
          }));
          setColumnLineage(rows);
        }
      })
      .catch(() => {})
      .finally(() => setLineageLoading(false));
  }, [expanded, lineage.sourceTable, lineage.column]);

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        {expanded ? "Hide" : "Explain this?"}
      </button>

      {expanded && (
        <div className="mt-2 bg-slate-800/50 border border-slate-600 rounded-lg p-3 text-xs space-y-3">
          <div>
            <div className="font-medium text-blue-200 mb-1">1. Explanation</div>
            <p className="text-slate-300">{lineage.explanation}</p>
          </div>

          <div>
            <div className="font-medium text-blue-200 mb-1 flex items-center gap-2">
              2. SQL Executed
              <button onClick={() => setSqlExpanded(!sqlExpanded)} className="text-blue-400 hover:text-blue-300">
                {sqlExpanded ? "collapse" : "expand"}
              </button>
            </div>
            {sqlExpanded && (
              <pre className="bg-slate-900 rounded p-2 overflow-x-auto text-green-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{lineage.sql}</pre>
            )}
            {!sqlExpanded && (
              <code className="text-green-300 bg-slate-900 px-1.5 py-0.5 rounded">{lineage.sql.slice(0, 60)}...</code>
            )}
          </div>

          <div>
            <div className="font-medium text-blue-200 mb-1">3. Column Lineage</div>
            <p className="text-slate-500 italic mb-1">Extracted using Snowflake Data Lineage function (SNOWFLAKE.CORE.GET_LINEAGE)</p>
            {lineageLoading && <span className="text-slate-400 animate-pulse">Loading column lineage...</span>}
            {!lineageLoading && columnLineage.length > 0 && (
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-1">
                  <code className="text-cyan-300 bg-slate-900 px-1 rounded font-bold">{lineage.column}</code>
                </div>
                <div className="flex items-center gap-1" style={{ paddingLeft: 16 }}>
                  <span className="text-slate-500">└→</span>
                  <code className="text-orange-300 bg-slate-900 px-1 rounded">{lineage.sourceTable}</code>
                  <span className="text-slate-500 text-[10px] ml-1">[Dynamic Table]</span>
                </div>
                {columnLineage.map((row, i) => (
                  <div key={i} className="flex items-center gap-1" style={{ paddingLeft: (row.distance + 1) * 16 }}>
                    <span className="text-slate-500">└→</span>
                    <code className="text-yellow-300 bg-slate-900 px-1 rounded">{row.sourceDb}.{row.sourceSchema}.{row.sourceTable}.{row.sourceColumn}</code>
                    <span className="text-slate-500 text-[10px] ml-1">[{row.sourceDomain === 'DYNAMIC_TABLE' ? 'Dynamic Table' : row.sourceDomain === 'TABLE' ? 'Table' : row.sourceDomain === 'STAGE' ? 'Stage' : row.sourceDomain}]</span>
                  </div>
                ))}
              </div>
            )}
            {!lineageLoading && columnLineage.length === 0 && (
              <span className="text-slate-500">No column lineage available for this column</span>
            )}
          </div>

          <div>
            <div className="font-medium text-blue-200 mb-1">4. Formula</div>
            <code className="text-pink-300 bg-slate-900 px-1.5 py-0.5 rounded">{lineage.formula}</code>
          </div>
        </div>
      )}
    </div>
  );
}
