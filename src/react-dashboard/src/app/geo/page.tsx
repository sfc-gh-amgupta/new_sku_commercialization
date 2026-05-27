"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

const RETAILERS = ["all", "Walmart", "Kroger", "Target", "Costco"];

export default function GeoPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);
  const [selectedRetailer, setSelectedRetailer] = useState("all");

  const skuFilter = selectedSku !== "all" ? ` WHERE sku_id = '${selectedSku}'` : "";
  const retailerFilter = selectedRetailer !== "all" ? (skuFilter ? ` AND retailer = '${selectedRetailer}'` : ` WHERE retailer = '${selectedRetailer}'`) : "";
  const whereClause = `${skuFilter}${retailerFilter}`;

  const { data: summaryData, loading } = useSnowflakeQuery(
    `SELECT COUNT(DISTINCT store_id) as total_stores, ROUND(AVG(total_units_sold), 0) as avg_units, ROUND(AVG(oos_days), 1) as avg_oos FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE${whereClause}`
  );

  const { data: topStores } = useSnowflakeQuery(
    `SELECT store_id, retailer, state, city, sku_name, total_units_sold, oos_days FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE${whereClause} ORDER BY total_units_sold DESC LIMIT 10`
  );

  const { data: bottomStores } = useSnowflakeQuery(
    `SELECT store_id, retailer, state, city, sku_name, total_units_sold, oos_days FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE${whereClause} ORDER BY total_units_sold ASC LIMIT 10`
  );

  const { data: regionalSummary } = useSnowflakeQuery(
    `SELECT region, retailer, COUNT(*) as store_count, SUM(total_units_sold) as total_units, ROUND(AVG(oos_days), 1) as avg_oos FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE${whereClause} GROUP BY region, retailer ORDER BY total_units DESC LIMIT 20`
  );

  const totalStores = summaryData.length > 0 ? Number(summaryData[0].TOTAL_STORES) || 0 : 0;
  const avgUnits = summaryData.length > 0 ? Number(summaryData[0].AVG_UNITS) || 0 : 0;
  const avgOos = summaryData.length > 0 ? Number(summaryData[0].AVG_OOS) || 0 : 0;

  const highOosRegions = regionalSummary.filter(r => Number(r.AVG_OOS) > 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading geo performance data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Geo Performance</h1>
      <p className="text-blue-300 text-sm mb-4">State-level performance index vs national average</p>

      <div className="flex gap-3 mb-4">
        <select
          value={selectedSku}
          onChange={e => setSelectedSku(e.target.value)}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          {SKUS.map(s => (
            <option key={s.id} value={s.id}>{s.shortName}</option>
          ))}
        </select>
        <select
          value={selectedRetailer}
          onChange={e => setSelectedRetailer(e.target.value)}
          className="bg-slate-800 text-white border border-slate-700 rounded px-3 py-2 text-sm"
        >
          {RETAILERS.map(r => (
            <option key={r} value={r}>{r === "all" ? "All Retailers" : r}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <MetricCard label="Total Stores" value={totalStores.toLocaleString()} delta="active locations" />
          <DataLineage metricId="geo.regional_index" />
        </div>
        <div>
          <MetricCard label="Avg Units/Store" value={avgUnits.toLocaleString()} delta="total units sold" />
          <DataLineage metricId="geo.top_states" />
        </div>
        <div>
          <MetricCard label="Avg OOS Days" value={avgOos.toFixed(1)} delta={avgOos > 3 ? "Above threshold" : "Within target"} deltaColor={avgOos > 3 ? "red" : "green"} />
          <DataLineage metricId="geo.bottom_states" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
          <h2 className="font-semibold text-white mb-3">Top 10 Stores by Units Sold</h2>
          <DataTable
            columns={[
              { key: "STORE_ID", label: "Store" },
              { key: "RETAILER", label: "Retailer" },
              { key: "STATE", label: "State" },
              { key: "CITY", label: "City" },
              { key: "TOTAL_UNITS_SOLD", label: "Units", format: (v: unknown) => Number(v).toLocaleString() },
              { key: "OOS_DAYS", label: "OOS Days" },
            ]}
            data={topStores}
            pageSize={10}
          />
          <DataLineage metricId="geo.top_states" />
        </div>
        <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
          <h2 className="font-semibold text-white mb-3">Bottom 10 Stores by Units Sold</h2>
          <DataTable
            columns={[
              { key: "STORE_ID", label: "Store" },
              { key: "RETAILER", label: "Retailer" },
              { key: "STATE", label: "State" },
              { key: "CITY", label: "City" },
              { key: "TOTAL_UNITS_SOLD", label: "Units", format: (v: unknown) => Number(v).toLocaleString() },
              { key: "OOS_DAYS", label: "OOS Days" },
            ]}
            data={bottomStores}
            pageSize={10}
          />
          <DataLineage metricId="geo.bottom_states" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Regional Summary</h2>
        <DataTable
          columns={[
            { key: "REGION", label: "Region" },
            { key: "RETAILER", label: "Retailer" },
            { key: "STORE_COUNT", label: "Stores" },
            { key: "TOTAL_UNITS", label: "Total Units", format: (v: unknown) => Number(v).toLocaleString() },
            { key: "AVG_OOS", label: "Avg OOS Days" },
          ]}
          data={regionalSummary}
          pageSize={20}
        />
        <DataLineage metricId="geo.regional_index" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Methodology</h2>
        <p className="text-slate-300 text-sm">
          Performance Index = (store_units / national_avg) × 100. A score of 100 means the store performs at the national average.
          Scores above 100 indicate above-average performance; below 100 indicates underperformance relative to the national benchmark.
          National average is computed as the mean of total_units_sold across all stores in the filtered dataset.
        </p>
      </div>

      {highOosRegions.length > 0 && (
        <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-red-700/50">
          <h2 className="font-semibold text-red-300 mb-3">Recommended Actions</h2>
          <ul className="space-y-2">
            {highOosRegions.map((r, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-red-400 mt-0.5">●</span>
                <span>
                  <strong className="text-white">{r.REGION as string} — {r.RETAILER as string}</strong>: Avg OOS of {Number(r.AVG_OOS).toFixed(1)} days exceeds 3-day threshold. Recommend inventory review and replenishment priority increase for this region.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
