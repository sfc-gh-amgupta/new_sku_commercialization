"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE, RETAILER_SHARES } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function SalesPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: weeklyData, loading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, SUM(actual_revenue) as revenue, SUM(forecast_units * avg_price) as forecast_revenue FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance} GROUP BY sku_id, sku_name, week_number ORDER BY sku_id, week_number`
  );

  const { data: regionalData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, region, total_actual, total_forecast, variance_pct, regional_status FROM ${SNOWFLAKE_CONFIG.tables.regionalVariance} ORDER BY variance_pct ASC`
  );

  const filtered = selectedSku === "all" ? weeklyData : weeklyData.filter(r => r.SKU_ID === selectedSku);
  const regionalFiltered = selectedSku === "all" ? regionalData : regionalData.filter(r => r.SKU_ID === selectedSku);

  const totalRevenue = filtered.reduce((s, r) => s + (Number(r.REVENUE) || 0), 0);
  const totalForecast = filtered.reduce((s, r) => s + (Number(r.FORECAST_REVENUE) || 0), 0);
  const vsForecastPct = totalForecast ? ((totalRevenue - totalForecast) / totalForecast * 100) : 0;
  const totalUnits = filtered.reduce((s, r) => s + (Number(r.REVENUE) / 6 || 0), 0);

  const skuIds = [...new Set(filtered.map(r => r.SKU_ID as string))];
  const weeks = [...new Set(filtered.map(r => Number(r.WEEK_NUMBER)))].sort((a, b) => a - b);
  const selectedSkuName = SKUS.find(s => s.id === selectedSku)?.shortName || "All SKUs";

  const revenueTraces: any[] = [];
  const weekLabels = weeks.map(w => `W${w}`);

  if (selectedSku === "all") {
    skuIds.forEach((skuId, idx) => {
      const skuRows = filtered.filter(r => r.SKU_ID === skuId).sort((a, b) => Number(a.WEEK_NUMBER) - Number(b.WEEK_NUMBER));
      const skuName = skuRows[0]?.SKU_NAME as string || skuId;
      const colors = ["#f97316", "#3b82f6", "#10b981", "#a855f7"];
      revenueTraces.push({
        x: skuRows.map(r => `W${r.WEEK_NUMBER}`),
        y: skuRows.map(r => Number(r.REVENUE)),
        name: skuName,
        type: "scatter",
        mode: "lines",
        line: { color: colors[idx % 4], width: 2.5 },
      });
    });
  } else {
    const skuRows = filtered.sort((a, b) => Number(a.WEEK_NUMBER) - Number(b.WEEK_NUMBER));
    revenueTraces.push({
      x: skuRows.map(r => `W${r.WEEK_NUMBER}`),
      y: skuRows.map(r => Number(r.REVENUE)),
      name: "Actual",
      type: "scatter",
      mode: "lines",
      line: { color: "#f97316", width: 2.5 },
    });
    revenueTraces.push({
      x: skuRows.map(r => `W${r.WEEK_NUMBER}`),
      y: skuRows.map(r => Number(r.FORECAST_REVENUE)),
      name: "Forecast",
      type: "scatter",
      mode: "lines",
      line: { color: "#60a5fa", width: 2, dash: "dash" },
    });
  }

  const retailers = Object.keys(RETAILER_SHARES);
  const retailerActual = retailers.map(r => totalRevenue * RETAILER_SHARES[r]);
  const retailerForecast = retailers.map(r => totalForecast * RETAILER_SHARES[r]);
  const retailerTraces: any[] = [
    { x: retailers, y: retailerActual, name: "Actual", type: "bar", marker: { color: "#3b82f6" } },
    { x: retailers, y: retailerForecast, name: "Forecast", type: "bar", marker: { color: "#f97316" } },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading sales data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Sales Performance</h1>
      <p className="text-blue-300 text-sm mb-4">Weekly syndicated POS revenue tracking</p>

      <div className="mb-4">
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#29b5e8]"
        >
          {SKUS.map(sku => (
            <option key={sku.id} value={sku.id}>{sku.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold text-white mb-3">{selectedSku === "all" ? "All SKUs" : selectedSkuName} — Weekly Revenue</h2>
        <PlotlyChart
          data={revenueTraces}
          layout={{ yaxis: { title: "Revenue (USD)", gridcolor: "#334155", tickformat: "~s" } }}
        />
        <DataLineage metricId="sales.weekly_chart" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <MetricCard label="Total Revenue" value={`$${(totalRevenue / 1e6).toFixed(2)}M`} delta={`${vsForecastPct >= 0 ? "+" : ""}${vsForecastPct.toFixed(1)}% vs forecast`} deltaColor={vsForecastPct >= 0 ? "green" : "red"} />
          <DataLineage metricId="sales.total_revenue" />
        </div>
        <div>
          <MetricCard label="vs Forecast %" value={`${vsForecastPct >= 0 ? "+" : ""}${vsForecastPct.toFixed(1)}%`} delta={vsForecastPct >= 0 ? "above plan" : "below plan"} deltaColor={vsForecastPct >= 0 ? "green" : "red"} />
          <DataLineage metricId="sales.total_revenue" />
        </div>
        <div>
          <MetricCard label="Total Units (est)" value={`${(totalUnits / 1e6).toFixed(2)}M`} delta="estimated from revenue" />
          <DataLineage metricId="sales.total_revenue" />
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Revenue by Retailer</h2>
        <PlotlyChart
          data={retailerTraces}
          layout={{ barmode: "group", yaxis: { title: "Revenue ($)" } }}
        />
        <DataLineage metricId="sales.retailer_revenue" />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Regional Variance</h2>
        <DataTable
          columns={[
            { key: "SKU_NAME", label: "SKU" },
            { key: "REGION", label: "Region" },
            { key: "TOTAL_ACTUAL", label: "Actual", format: (v) => `$${Number(v).toLocaleString()}` },
            { key: "TOTAL_FORECAST", label: "Forecast", format: (v) => `$${Number(v).toLocaleString()}` },
            { key: "VARIANCE_PCT", label: "Variance", format: (v) => `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}%` },
            { key: "REGIONAL_STATUS", label: "Status" },
          ]}
          data={regionalFiltered}
          pageSize={20}
        />
        <DataLineage metricId="sales.regional_variance" />
      </div>
    </div>
  );
}
