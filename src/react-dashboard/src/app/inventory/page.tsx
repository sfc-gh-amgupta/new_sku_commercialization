"use client";
import { useState, useMemo } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE, SENTIMENT_THEMES } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function InventoryPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const { data: summaryData, loading: summaryLoading } = useSnowflakeQuery(
    `SELECT COUNT(*) as total_records, SUM(CASE WHEN inventory_status='Critical' THEN 1 ELSE 0 END) as critical, SUM(units_available) as total_available, ROUND(AVG(pct_of_reorder_point), 0) as avg_pct FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS`
  );

  const { data: dcData } = useSnowflakeQuery(
    `SELECT dc_name, sku_name, units_available, safety_stock, reorder_point, inventory_status FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS ORDER BY dc_name, sku_name`
  );

  const { data: shipmentData } = useSnowflakeQuery(
    `SELECT shipment_id, sku_name, dc_name, plant_name, units_shipped, shipment_status, days_delayed, carrier_name FROM SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS ORDER BY days_delayed DESC`
  );

  const { data: fullInvData } = useSnowflakeQuery(
    `SELECT dc_name, sku_name, units_on_hand, units_allocated, units_available, reorder_point, safety_stock, inventory_status, pct_of_reorder_point FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS ORDER BY inventory_status DESC, pct_of_reorder_point ASC`
  );

  const criticalDcs = useMemo(() => {
    return dcData.filter((r) => r.INVENTORY_STATUS === "Critical");
  }, [dcData]);

  const filteredDcData = useMemo(() => {
    if (selectedSku === "all") return dcData;
    return dcData.filter((r) => {
      const sku = SKUS.find((s) => s.shortName === r.SKU_NAME || s.name === r.SKU_NAME);
      return sku?.id === selectedSku || r.SKU_NAME === selectedSku;
    });
  }, [dcData, selectedSku]);

  const barTraces = useMemo(() => {
    const rows = filteredDcData;
    const labels = rows.map((r) => `${r.DC_NAME} - ${r.SKU_NAME}`);
    const available = rows.map((r) => Number(r.UNITS_AVAILABLE) || 0);
    const safetyStock = rows.map((r) => Number(r.SAFETY_STOCK) || 0);
    return [
      { x: labels, y: available, type: "bar" as const, name: "Units Available", marker: { color: "#22c55e" } },
      { x: labels, y: safetyStock, type: "scatter" as const, mode: "lines+markers" as const, name: "Safety Stock", line: { dash: "dash" as const, color: "#ef4444", width: 2 }, marker: { color: "#ef4444" } },
    ];
  }, [filteredDcData]);

  const weeksCoverTraces = useMemo(() => {
    const rows = filteredDcData;
    const labels = rows.map((r) => `${r.DC_NAME} - ${r.SKU_NAME}`);
    const weeksCover = rows.map((r) => {
      const available = Number(r.UNITS_AVAILABLE) || 0;
      const reorder = Number(r.REORDER_POINT) || 1;
      return parseFloat((available / (reorder / 2)).toFixed(1));
    });
    const colors = weeksCover.map((w) => w < 2 ? "#ef4444" : w <= 4 ? "#eab308" : "#22c55e");
    return [
      { y: labels, x: weeksCover, type: "bar" as const, orientation: "h" as const, name: "Weeks of Cover", marker: { color: colors } },
    ];
  }, [filteredDcData]);

  const weeksCoverLayout = useMemo(() => ({
    shapes: [{
      type: "line" as const,
      x0: 2,
      x1: 2,
      y0: -0.5,
      y1: filteredDcData.length - 0.5,
      line: { color: "#ef4444", width: 2, dash: "dash" as const },
    }],
    xaxis: { title: "Weeks of Cover", gridcolor: "#334155" },
    yaxis: { gridcolor: "#334155", automargin: true },
    margin: { l: 180, r: 20, t: 30, b: 40 },
  }), [filteredDcData]);

  const filteredShipments = useMemo(() => {
    if (selectedSku === "all") return shipmentData;
    return shipmentData.filter((r) => {
      const sku = SKUS.find((s) => s.shortName === r.SKU_NAME || s.name === r.SKU_NAME);
      return sku?.id === selectedSku || r.SKU_NAME === selectedSku;
    });
  }, [shipmentData, selectedSku]);

  const filteredFullInv = useMemo(() => {
    if (selectedSku === "all") return fullInvData;
    return fullInvData.filter((r) => {
      const sku = SKUS.find((s) => s.shortName === r.SKU_NAME || s.name === r.SKU_NAME);
      return sku?.id === selectedSku || r.SKU_NAME === selectedSku;
    });
  }, [fullInvData, selectedSku]);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading inventory data...</span>
      </div>
    );
  }

  const totalRecords = summaryData.length > 0 ? Number(summaryData[0].TOTAL_RECORDS) : 0;
  const criticalCount = summaryData.length > 0 ? Number(summaryData[0].CRITICAL) : 0;
  const totalAvailable = summaryData.length > 0 ? Number(summaryData[0].TOTAL_AVAILABLE) : 0;
  const avgPct = summaryData.length > 0 ? Number(summaryData[0].AVG_PCT) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
      <p className="text-blue-300 text-sm mb-4">Distribution center inventory levels and supply chain status</p>

      {criticalDcs.length > 0 && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          <span className="font-semibold">Out-of-Stock Alert:</span>{" "}
          {criticalDcs.map((r) => `${r.DC_NAME} (${r.SKU_NAME})`).join(", ")} — inventory status Critical.
        </div>
      )}

      <div className="mb-4">
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#29b5e8]"
        >
          {SKUS.map((sku) => (
            <option key={sku.id} value={sku.id}>{sku.shortName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <MetricCard label="Total DCs Tracked" value={`${totalRecords}`} delta="DC-SKU combinations" />
          <DataLineage metricId="inventory.dc_status" />
        </div>
        <div>
          <MetricCard label="Critical DCs" value={`${criticalCount}`} delta="below safety stock" deltaColor={criticalCount > 0 ? "red" : "green"} />
          <DataLineage metricId="inventory.dc_status" />
        </div>
        <div>
          <MetricCard label="Total Units Available" value={totalAvailable.toLocaleString()} delta="across all DCs" />
          <DataLineage metricId="inventory.dc_status" />
        </div>
        <div>
          <MetricCard label="Avg % of Reorder Point" value={`${avgPct}%`} delta={avgPct >= 100 ? "above reorder" : "below reorder"} deltaColor={avgPct >= 100 ? "green" : "yellow"} />
          <DataLineage metricId="inventory.dc_status" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Units Available vs Safety Stock by DC</h2>
        <PlotlyChart
          data={barTraces}
          layout={{ barmode: "group", yaxis: { title: "Units", gridcolor: "#334155" }, xaxis: { gridcolor: "#334155" } }}
          height={320}
        />
        <DataLineage metricId="inventory.dc_status" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Weeks of Cover by DC</h2>
        <PlotlyChart
          data={weeksCoverTraces}
          layout={weeksCoverLayout}
          height={Math.max(300, filteredDcData.length * 28)}
        />
        <DataLineage metricId="inventory.weeks_cover" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Shipments Status</h2>
        <DataTable
          columns={[
            { key: "SHIPMENT_ID", label: "Shipment ID" },
            { key: "SKU_NAME", label: "SKU" },
            { key: "DC_NAME", label: "DC" },
            { key: "PLANT_NAME", label: "Plant" },
            { key: "UNITS_SHIPPED", label: "Units", format: (v) => Number(v).toLocaleString() },
            { key: "SHIPMENT_STATUS", label: "Status" },
            { key: "DAYS_DELAYED", label: "Days Delayed" },
            { key: "CARRIER_NAME", label: "Carrier" },
          ]}
          data={filteredShipments}
        />
        <DataLineage metricId="distribution.shipments" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Full DC Inventory Detail</h2>
        <DataTable
          columns={[
            { key: "DC_NAME", label: "DC" },
            { key: "SKU_NAME", label: "SKU" },
            { key: "UNITS_ON_HAND", label: "On Hand", format: (v) => Number(v).toLocaleString() },
            { key: "UNITS_ALLOCATED", label: "Allocated", format: (v) => Number(v).toLocaleString() },
            { key: "UNITS_AVAILABLE", label: "Available", format: (v) => Number(v).toLocaleString() },
            { key: "REORDER_POINT", label: "Reorder Pt", format: (v) => Number(v).toLocaleString() },
            { key: "SAFETY_STOCK", label: "Safety Stock", format: (v) => Number(v).toLocaleString() },
            { key: "INVENTORY_STATUS", label: "Status" },
            { key: "PCT_OF_REORDER_POINT", label: "% of Reorder", format: (v) => `${Number(v)}%` },
          ]}
          data={filteredFullInv}
        />
        <DataLineage metricId="inventory.dc_status" />
      </div>
    </div>
  );
}
