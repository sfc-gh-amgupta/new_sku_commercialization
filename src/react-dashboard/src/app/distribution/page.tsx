"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE, RETAILER_SHARES } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function DistributionPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: buildData, loading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, SUM(actual_stores) as actual, SUM(planned_stores) as planned FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance} GROUP BY sku_id, sku_name, week_number ORDER BY week_number`
  );

  const { data: regionData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, region, AVG(actual_stores) as avg_actual, AVG(planned_stores) as avg_planned FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance} WHERE week_number = (SELECT MAX(week_number) FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance}) GROUP BY sku_id, sku_name, region ORDER BY region`
  );

  const { data: shipData } = useSnowflakeQuery(
    `SELECT sku_name, dc_name, plant_name, shipment_status, units_shipped, days_delayed FROM ${SNOWFLAKE_CONFIG.tables.dcShipments} ORDER BY days_delayed DESC LIMIT 30`
  );

  const filtered = selectedSku === "all" ? buildData : buildData.filter(r => r.SKU_ID === selectedSku);
  const regionFiltered = selectedSku === "all" ? regionData : regionData.filter(r => r.SKU_ID === selectedSku);

  const latestWeek = filtered.length > 0 ? Math.max(...filtered.map(r => Number(r.WEEK_NUMBER))) : 0;
  const latestRows = filtered.filter(r => Number(r.WEEK_NUMBER) === latestWeek);
  const w12Actual = latestRows.reduce((s, r) => s + (Number(r.ACTUAL) || 0), 0);
  const w12Planned = latestRows.reduce((s, r) => s + (Number(r.PLANNED) || 0), 0);

  const skuIds = [...new Set(filtered.map(r => r.SKU_ID as string))];
  const buildTraces: any[] = [];
  const skuRows = filtered.sort((a, b) => Number(a.WEEK_NUMBER) - Number(b.WEEK_NUMBER));
  buildTraces.push({
    x: skuRows.map(r => `W${r.WEEK_NUMBER}`),
    y: skuRows.map(r => Number(r.ACTUAL)),
    name: "Actual Stores",
    type: "scatter",
    mode: "lines",
    line: { color: "#f97316", width: 2.5 },
  });
  buildTraces.push({
    x: skuRows.map(r => `W${r.WEEK_NUMBER}`),
    y: skuRows.map(r => Number(r.PLANNED)),
    name: "Planned Stores",
    type: "scatter",
    mode: "lines",
    line: { color: "#60a5fa", width: 2, dash: "dash" },
  });

  const targetAcv = SKUS[0]?.targetAcv || 80;
  const regions = [...new Set(regionFiltered.map(r => r.REGION as string))];
  const acvTraces: any[] = [
    {
      x: regions,
      y: regions.map(region => {
        const rows = regionFiltered.filter(r => r.REGION === region);
        const avgActual = rows.reduce((s, r) => s + (Number(r.AVG_ACTUAL) || 0), 0) / (rows.length || 1);
        const avgPlanned = rows.reduce((s, r) => s + (Number(r.AVG_PLANNED) || 0), 0) / (rows.length || 1);
        return avgPlanned > 0 ? (avgActual / avgPlanned) * targetAcv : 0;
      }),
      name: "Actual ACV %",
      type: "bar",
      marker: { color: "#3b82f6" },
    },
    {
      x: regions,
      y: regions.map(() => targetAcv),
      name: "Target ACV %",
      type: "bar",
      marker: { color: "#f97316" },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading distribution data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Distribution</h1>
      <p className="text-blue-300 text-sm mb-4">Store distribution build and shipment tracking</p>

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

      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Store Distribution Build</h2>
        <PlotlyChart
          data={buildTraces}
          layout={{ yaxis: { title: "Stores" } }}
        />
        <DataLineage metricId="dist.store_build" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <MetricCard label="W12 Actual Stores" value={w12Actual.toLocaleString()} delta={`${latestWeek > 0 ? `Week ${latestWeek}` : ""}`} deltaColor={w12Actual >= w12Planned ? "green" : "red"} />
          <DataLineage metricId="dist.actual_stores" />
        </div>
        <div>
          <MetricCard label="W12 Planned Stores" value={w12Planned.toLocaleString()} delta="target" />
          <DataLineage metricId="dist.planned_stores" />
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">ACV by Region</h2>
        <PlotlyChart
          data={acvTraces}
          layout={{ barmode: "group", yaxis: { title: "ACV %" } }}
        />
        <DataLineage metricId="dist.acv_retailer" />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Shipments</h2>
        <DataTable
          columns={[
            { key: "SKU_NAME", label: "SKU" },
            { key: "DC_NAME", label: "DC" },
            { key: "PLANT_NAME", label: "Plant" },
            { key: "SHIPMENT_STATUS", label: "Status" },
            { key: "UNITS_SHIPPED", label: "Units", format: (v) => Number(v).toLocaleString() },
            { key: "DAYS_DELAYED", label: "Delay", format: (v) => Number(v) > 0 ? `+${v}d` : "On time" },
          ]}
          data={shipData}
          pageSize={15}
        />
        <DataLineage metricId="distribution.shipments" />
      </div>
    </div>
  );
}
