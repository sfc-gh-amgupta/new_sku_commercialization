"use client";
import { SNOWFLAKE_CONFIG, METRIC_LINEAGE } from "@/lib/constants";
import DataLineage from "@/components/DataLineage";

export default function ArchitecturePage() {
  const metricIds = Object.keys(METRIC_LINEAGE);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Architecture & Data Lineage</h1>
      <p className="text-blue-300 text-sm mb-6">Complete data flow from raw ingestion to agent-powered insights</p>

      <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-4">End-to-End Data Pipeline</h2>
        <div className="flex items-center justify-between text-xs text-center gap-1">
          {[
            { label: "External Files", sub: "CSV / JSON / MP3", color: "bg-emerald-600" },
            { label: "Snowflake Stage", sub: "@RAW_FILES", color: "bg-green-600" },
            { label: "Openflow", sub: "5 Process Groups", color: "bg-yellow-600" },
            { label: "RAW Tables", sub: "RAW_OF_*", color: "bg-orange-600" },
            { label: "Dynamic Tables", sub: "CURATED_DT_*", color: "bg-red-600" },
            { label: "Semantic Views", sub: "SV_*", color: "bg-purple-600" },
            { label: "Cortex Agent", sub: "PRODUCT_LAUNCH_AGENT", color: "bg-cyan-600" },
            { label: "React UI", sub: "This Dashboard", color: "bg-blue-600" },
          ].map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={`${step.color} rounded-lg px-2 py-3 min-w-[90px]`}>
                <div className="font-medium text-white">{step.label}</div>
                <div className="text-white/70 mt-0.5">{step.sub}</div>
              </div>
              {i < 7 && <span className="text-slate-400 mx-1">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Snowflake Objects</h2>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <h3 className="text-blue-300 font-medium">Database</h3>
            <p className="text-white">{SNOWFLAKE_CONFIG.database}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-blue-300 font-medium">Schemas</h3>
            {Object.values(SNOWFLAKE_CONFIG.schemas).map((s) => <p key={s} className="text-white">{s}</p>)}
          </div>
          <div className="space-y-1">
            <h3 className="text-blue-300 font-medium">Agent</h3>
            <p className="text-white">{SNOWFLAKE_CONFIG.agent.database}.{SNOWFLAKE_CONFIG.agent.schema}.{SNOWFLAKE_CONFIG.agent.name}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-blue-300 font-medium">Warehouse</h3>
            <p className="text-white">{SNOWFLAKE_CONFIG.warehouse}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
        <h2 className="font-semibold text-white mb-4">Complete Metric Lineage ({metricIds.length} metrics)</h2>
        <div className="space-y-3">
          {metricIds.map((id) => (
            <div key={id} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm text-orange-300 font-medium">{METRIC_LINEAGE[id].label}</code>
                <span className="text-xs text-slate-500">({id})</span>
              </div>
              <code className="text-xs text-slate-400">{METRIC_LINEAGE[id].sourceTable}</code>
              <DataLineage metricId={id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
