"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE, RETAILER_SHARES } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function TrialRepeatPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: summaryData, loading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, MAX(cumulative_trial_hh) as max_trial, MAX(trial_forecast) as goal, AVG(repeat_rate_weekly) as avg_repeat, AVG(buy_rate) as avg_buy FROM ${SNOWFLAKE_CONFIG.tables.consumerMetrics} GROUP BY sku_id, sku_name`
  );

  const { data: weeklyData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, cumulative_trial_hh, trial_forecast, weekly_new_buyers, repeat_rate_weekly FROM ${SNOWFLAKE_CONFIG.tables.consumerMetrics} ORDER BY sku_id, week_number`
  );

  const summaryFiltered = selectedSku === "all" ? summaryData : summaryData.filter(r => r.SKU_ID === selectedSku);
  const weeklyFiltered = selectedSku === "all" ? weeklyData : weeklyData.filter(r => r.SKU_ID === selectedSku);

  const totalTrial = summaryFiltered.reduce((s, r) => s + (Number(r.MAX_TRIAL) || 0), 0);
  const totalGoal = summaryFiltered.reduce((s, r) => s + (Number(r.GOAL) || 0), 0);
  const trialVsGoal = totalGoal ? ((totalTrial - totalGoal) / totalGoal * 100) : 0;
  const avgRepeat = summaryFiltered.length > 0 ? summaryFiltered.reduce((s, r) => s + (Number(r.AVG_REPEAT) || 0), 0) / summaryFiltered.length : 0;
  const avgBuy = summaryFiltered.length > 0 ? summaryFiltered.reduce((s, r) => s + (Number(r.AVG_BUY) || 0), 0) / summaryFiltered.length : 0;

  const skuIds = [...new Set(weeklyFiltered.map(r => r.SKU_ID as string))];

  const trialTraces: any[] = [];
  skuIds.forEach(skuId => {
    const rows = weeklyFiltered.filter(r => r.SKU_ID === skuId);
    const skuName = rows[0]?.SKU_NAME as string || skuId;
    trialTraces.push({
      x: rows.map(r => `W${r.WEEK_NUMBER}`),
      y: rows.map(r => Number(r.CUMULATIVE_TRIAL_HH)),
      name: `${skuName} (Actual)`,
      type: "scatter",
      mode: "lines",
      line: { color: "#29b5e8" },
    });
    trialTraces.push({
      x: rows.map(r => `W${r.WEEK_NUMBER}`),
      y: rows.map(r => Number(r.TRIAL_FORECAST)),
      name: `${skuName} (Goal)`,
      type: "scatter",
      mode: "lines",
      line: { color: "#475569", dash: "dash" },
    });
  });

  const buyerTraces: any[] = skuIds.map((skuId, idx) => {
    const rows = weeklyFiltered.filter(r => r.SKU_ID === skuId);
    const skuName = rows[0]?.SKU_NAME as string || skuId;
    return {
      x: rows.map(r => `W${r.WEEK_NUMBER}`),
      y: rows.map(r => Number(r.WEEKLY_NEW_BUYERS)),
      name: skuName,
      type: "bar" as const,
      marker: { color: idx === 0 ? "#29b5e8" : idx === 1 ? "#475569" : idx === 2 ? "#38bdf8" : "#64748b" },
    };
  });

  const repeatTraces: any[] = skuIds.map(skuId => {
    const rows = weeklyFiltered.filter(r => r.SKU_ID === skuId);
    const skuName = rows[0]?.SKU_NAME as string || skuId;
    return {
      x: rows.map(r => `W${r.WEEK_NUMBER}`),
      y: rows.map(r => Number(r.REPEAT_RATE_WEEKLY)),
      name: skuName,
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: "#29b5e8" },
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading consumer metrics...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Trial & Repeat</h1>
      <p className="text-blue-300 text-sm mb-4">Consumer panel trial and repeat purchase metrics</p>

      <div className="mb-4">
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#29b5e8]"
        >
          {SKUS.map(sku => (
            <option key={sku.id} value={sku.id}>{sku.shortName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <MetricCard label="Cumulative Trial HH" value={totalTrial.toLocaleString()} delta="households" />
          <DataLineage metricId="trial.cumulative_hh" />
        </div>
        <div>
          <MetricCard label="Trial vs Goal %" value={`${trialVsGoal >= 0 ? "+" : ""}${trialVsGoal.toFixed(1)}%`} delta={trialVsGoal >= 0 ? "above goal" : "below goal"} deltaColor={trialVsGoal >= 0 ? "green" : "red"} />
          <DataLineage metricId="trial.vs_goal" />
        </div>
        <div>
          <MetricCard label="Repeat Rate" value={`${avgRepeat.toFixed(1)}%`} delta="avg across SKUs" deltaColor={avgRepeat >= 25 ? "green" : "yellow"} />
          <DataLineage metricId="trial.repeat_rate" />
        </div>
        <div>
          <MetricCard label="Buy Rate" value={avgBuy.toFixed(2)} delta="units per buyer" />
          <DataLineage metricId="trial.buy_rate" />
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Trial Build vs Goal</h2>
        <PlotlyChart
          data={trialTraces}
          layout={{ yaxis: { title: "Households" } }}
        />
        <DataLineage metricId="trial.cumulative_hh" />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Weekly New Buyers</h2>
        <PlotlyChart
          data={buyerTraces}
          layout={{ barmode: "group", yaxis: { title: "New Buyers" } }}
        />
        <DataLineage metricId="trial.weekly_buyers" />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Repeat Rate Trend</h2>
        <PlotlyChart
          data={repeatTraces}
          layout={{ yaxis: { title: "Repeat Rate %" } }}
        />
        <DataLineage metricId="trial.repeat_rate" />
      </div>
    </div>
  );
}
