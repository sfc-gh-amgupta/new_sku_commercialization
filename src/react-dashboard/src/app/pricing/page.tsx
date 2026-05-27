"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function PricingPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: complianceData, loading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, AVG(price_compliance_pct) as avg_compliance, AVG(price_index) as avg_price_index FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, week_number ORDER BY week_number`
  );

  const { data: regionData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, region, AVG(price_compliance_pct) as avg_compliance FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, region ORDER BY avg_compliance`
  );

  const filtered = selectedSku === "all" ? complianceData : complianceData.filter(r => r.SKU_ID === selectedSku);
  const filteredRegion = selectedSku === "all" ? regionData : regionData.filter(r => r.SKU_ID === selectedSku);

  const avgCompliance = filtered.length > 0 ? filtered.reduce((s, r) => s + (Number(r.AVG_COMPLIANCE) || 0), 0) / filtered.length : 0;
  const avgPriceIndex = filtered.length > 0 ? filtered.reduce((s, r) => s + (Number(r.AVG_PRICE_INDEX) || 0), 0) / filtered.length : 0;
  const plannedSrp = selectedSku === "all" ? SKUS.reduce((s, sk) => s + sk.plannedSrp, 0) / SKUS.length : SKUS.find(s => s.id === selectedSku)?.plannedSrp || 0;

  const weeks = [...new Set(filtered.map(r => Number(r.WEEK_NUMBER)))].sort((a, b) => a - b);
  const weeklyCompliance = weeks.map(w => {
    const rows = filtered.filter(r => Number(r.WEEK_NUMBER) === w);
    return rows.reduce((s, r) => s + (Number(r.AVG_COMPLIANCE) || 0), 0) / rows.length;
  });

  const regionLabels = filteredRegion.map(r => r.REGION as string);
  const regionValues = filteredRegion.map(r => Number(r.AVG_COMPLIANCE) || 0);
  const regionColors = regionValues.map(v => v > 85 ? "#22c55e" : v >= 65 ? "#eab308" : "#ef4444");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading pricing data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Pricing Compliance</h1>
      <p className="text-blue-300 text-sm mb-4">Retailer price compliance tracking vs planned SRP</p>

      <div className="mb-4">
        <select
          value={selectedSku}
          onChange={e => setSelectedSku(e.target.value)}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          {SKUS.map(s => (
            <option key={s.id} value={s.id}>{s.shortName}</option>
          ))}
        </select>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <PlotlyChart
          data={[
            {
              x: weeks.map(w => `W${w}`),
              y: weeklyCompliance,
              type: "scatter",
              mode: "lines",
              name: "Avg Compliance %",
              line: { color: "#29b5e8" },
            },
            {
              x: weeks.map(w => `W${w}`),
              y: weeks.map(() => 90),
              type: "scatter",
              mode: "lines",
              name: "90% Target",
              line: { dash: "dash", color: "#ef4444" },
            },
          ]}
          layout={{
            title: "Average Compliance Rate Over Weeks",
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#fff" },
            xaxis: { title: "Week" },
            yaxis: { title: "Compliance %" },
          }}
        />
        <DataLineage metricId="pricing.compliance_rate" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <MetricCard label="Avg Compliance" value={`${avgCompliance.toFixed(1)}%`} delta={avgCompliance >= 90 ? "On Target" : "Below Target"} deltaColor={avgCompliance >= 90 ? "green" : "red"} />
          <DataLineage metricId="pricing.compliance_rate" />
        </div>
        <div>
          <MetricCard label="Avg Price Index" value={avgPriceIndex.toFixed(2)} delta="vs category avg" />
          <DataLineage metricId="pricing.price_index" />
        </div>
        <div>
          <MetricCard label="Planned SRP" value={`$${plannedSrp.toFixed(2)}`} delta="suggested retail price" />
          <DataLineage metricId="pricing.planned_srp" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
        <PlotlyChart
          data={[
            {
              x: regionLabels,
              y: regionValues,
              type: "bar",
              name: "Compliance %",
              marker: { color: regionColors },
            },
          ]}
          layout={{
            title: "Compliance by Region",
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#fff" },
            xaxis: { title: "Region" },
            yaxis: { title: "Compliance %" },
          }}
        />
        <DataLineage metricId="pricing.retailer_compliance" />
      </div>
    </div>
  );
}
