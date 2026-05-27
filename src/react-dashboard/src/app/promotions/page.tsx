"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function PromotionsPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: promoSummary, loading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, COUNT(*) as total, SUM(CASE WHEN executed THEN 1 ELSE 0 END) as executed_cnt, ROUND(AVG(CASE WHEN executed THEN lift_pct ELSE NULL END), 1) as avg_lift, SUM(investment_usd) as total_inv, SUM(incremental_units) as total_incr FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS GROUP BY sku_id, sku_name`
  );

  const { data: retailerData } = useSnowflakeQuery(
    `SELECT retailer, COUNT(*) as total, SUM(CASE WHEN executed THEN 1 ELSE 0 END) as executed_cnt FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS GROUP BY retailer ORDER BY retailer`
  );

  const { data: calendarData } = useSnowflakeQuery(
    `SELECT promo_id, sku_id, sku_name, retailer, week_number, promo_type, executed, lift_pct, investment_usd FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS ORDER BY week_number, retailer`
  );

  const filteredSummary = selectedSku === "all" ? promoSummary : promoSummary.filter(r => r.SKU_ID === selectedSku);
  const filteredCalendar = selectedSku === "all" ? calendarData : calendarData.filter(r => r.SKU_ID === selectedSku);

  const totalPromos = filteredSummary.reduce((s, r) => s + (Number(r.TOTAL) || 0), 0);
  const totalExecuted = filteredSummary.reduce((s, r) => s + (Number(r.EXECUTED_CNT) || 0), 0);
  const executionRate = totalPromos > 0 ? (totalExecuted / totalPromos * 100) : 0;
  const avgLift = filteredSummary.length > 0 ? filteredSummary.reduce((s, r) => s + (Number(r.AVG_LIFT) || 0), 0) / filteredSummary.length : 0;
  const totalInvestment = filteredSummary.reduce((s, r) => s + (Number(r.TOTAL_INV) || 0), 0);
  const totalIncremental = filteredSummary.reduce((s, r) => s + (Number(r.TOTAL_INCR) || 0), 0);

  const retailerLabels = retailerData.map(r => r.RETAILER as string);
  const retailerRates = retailerData.map(r => {
    const t = Number(r.TOTAL) || 1;
    const e = Number(r.EXECUTED_CNT) || 0;
    return (e / t * 100);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading promotions data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Promotions</h1>
      <p className="text-blue-300 text-sm mb-4">Promotional event execution and lift tracking</p>

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

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <MetricCard label="Execution Rate" value={`${executionRate.toFixed(1)}%`} delta={`${totalExecuted}/${totalPromos} events`} deltaColor={executionRate >= 80 ? "green" : "red"} />
          <DataLineage metricId="promo.execution_rate" />
        </div>
        <div>
          <MetricCard label="Avg Lift" value={`${avgLift.toFixed(1)}%`} delta="executed promos only" />
          <DataLineage metricId="promo.avg_lift" />
        </div>
        <div>
          <MetricCard label="Total Investment" value={`$${(totalInvestment / 1000).toFixed(0)}K`} delta="promo spend" />
          <DataLineage metricId="promo.investment" />
        </div>
        <div>
          <MetricCard label="Incremental Units" value={totalIncremental.toLocaleString()} delta="attributed to promos" />
          <DataLineage metricId="promo.incremental_units" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <PlotlyChart
          data={[
            {
              x: retailerLabels,
              y: retailerRates,
              type: "bar",
              name: "Execution Rate %",
              marker: { color: "#29b5e8" },
            },
          ]}
          layout={{
            title: "Execution Rate by Retailer",
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            font: { color: "#fff" },
            xaxis: { title: "Retailer" },
            yaxis: { title: "Execution Rate %" },
          }}
        />
        <DataLineage metricId="promo.execution_rate" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Promo Calendar</h2>
        <DataTable
          columns={[
            { key: "SKU_NAME", label: "SKU" },
            { key: "RETAILER", label: "Retailer" },
            { key: "WEEK_NUMBER", label: "Week", format: (v: unknown) => `W${v}` },
            { key: "PROMO_TYPE", label: "Type" },
            { key: "EXECUTED", label: "Executed", format: (v: unknown) => v ? "✓" : "✗" },
            { key: "LIFT_PCT", label: "Lift %", format: (v: unknown) => v ? `${Number(v).toFixed(1)}%` : "—" },
            { key: "INVESTMENT_USD", label: "Investment", format: (v: unknown) => `$${Number(v).toLocaleString()}` },
          ]}
          data={filteredCalendar}
          pageSize={20}
        />
        <DataLineage metricId="promo.calendar" />
      </div>
    </div>
  );
}
