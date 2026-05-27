"use client";
import { useState, useMemo } from "react";
import { SKUS, SNOWFLAKE_CONFIG, METRIC_LINEAGE, SENTIMENT_THEMES } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";
import DataTable from "@/components/DataTable";
import PlotlyChart from "@/components/PlotlyChart";

export default function SentimentPage() {
  const [selectedSku, setSelectedSku] = useState(SKUS[0].id);

  const skuFilter = SKUS.map((s) => `'${s.id}'`).join(",");

  const { data: summaryData, loading: summaryLoading } = useSnowflakeQuery(
    `SELECT sku_id, AVG(social_score) as avg_social, AVG(nps_score) as avg_nps, SUM(CASE WHEN sentiment_label='positive' THEN 1 ELSE 0 END) as pos_count, SUM(CASE WHEN sentiment_label='negative' THEN 1 ELSE 0 END) as neg_count, COUNT(*) as total FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN (${skuFilter}) GROUP BY sku_id`
  );

  const { data: trendData } = useSnowflakeQuery(
    `SELECT sku_id, DATE_TRUNC('week', post_date) as week, AVG(social_score) as avg_social, AVG(nps_score) as avg_nps FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN (${skuFilter}) GROUP BY sku_id, week ORDER BY week`
  );

  const { data: topicData } = useSnowflakeQuery(
    `SELECT sku_id, topic_category, COUNT(*) as cnt, ROUND(AVG(sentiment_score), 2) as avg_sent FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN (${skuFilter}) GROUP BY sku_id, topic_category ORDER BY cnt DESC`
  );

  const filtered = useMemo(() => {
    if (selectedSku === "all") return summaryData;
    return summaryData.filter((r) => r.SKU_ID === selectedSku);
  }, [summaryData, selectedSku]);

  const avgSocial = filtered.length > 0 ? filtered.reduce((s, r) => s + (Number(r.AVG_SOCIAL) || 0), 0) / filtered.length : 0;
  const avgNps = filtered.length > 0 ? filtered.reduce((s, r) => s + (Number(r.AVG_NPS) || 0), 0) / filtered.length : 0;
  const totalPos = filtered.reduce((s, r) => s + (Number(r.POS_COUNT) || 0), 0);
  const totalNeg = filtered.reduce((s, r) => s + (Number(r.NEG_COUNT) || 0), 0);
  const totalMentions = filtered.reduce((s, r) => s + (Number(r.TOTAL) || 0), 0);
  const positivePct = totalMentions > 0 ? (totalPos / totalMentions) * 100 : 0;

  const hasHighNegative = summaryData.some((r) => {
    const total = Number(r.TOTAL) || 1;
    const neg = Number(r.NEG_COUNT) || 0;
    return (neg / total) * 100 > 30;
  });

  const worstSku = useMemo(() => {
    if (summaryData.length === 0) return "SKU001";
    let worst = summaryData[0];
    summaryData.forEach((r) => {
      const currNeg = (Number(r.NEG_COUNT) || 0) / (Number(r.TOTAL) || 1);
      const worstNeg = (Number(worst.NEG_COUNT) || 0) / (Number(worst.TOTAL) || 1);
      if (currNeg > worstNeg) worst = r;
    });
    return worst.SKU_ID as string;
  }, [summaryData]);

  const themeSku = selectedSku === "all" ? worstSku : selectedSku;
  const themes = SENTIMENT_THEMES[themeSku];

  const trendTraces = useMemo(() => {
    const skuIds = selectedSku === "all" ? SKUS.map((s) => s.id) : [selectedSku];
    const traces: any[] = skuIds.map((skuId) => {
      const skuRows = trendData.filter((r) => r.SKU_ID === skuId);
      const sku = SKUS.find((s) => s.id === skuId);
      return {
        x: skuRows.map((r) => r.WEEK as string),
        y: skuRows.map((r) => Number(r.AVG_SOCIAL)),
        type: "scatter" as const,
        mode: "lines+markers" as const,
        name: sku?.shortName || skuId,
        line: { width: 2 },
      };
    });
    if (trendData.length > 0) {
      const weeks = [...new Set(trendData.map((r) => r.WEEK as string))].sort();
      traces.push({
        x: weeks,
        y: weeks.map(() => 65),
        type: "scatter" as const,
        mode: "lines" as const,
        name: "Benchmark (65)",
        line: { dash: "dash", color: "#64748b", width: 1 },
      });
    }
    return traces;
  }, [trendData, selectedSku]);

  const compositionTraces = useMemo(() => {
    const rows = selectedSku === "all" ? summaryData : summaryData.filter((r) => r.SKU_ID === selectedSku);
    const labels = rows.map((r) => {
      const sku = SKUS.find((s) => s.id === r.SKU_ID);
      return sku?.shortName || (r.SKU_ID as string);
    });
    const posVals = rows.map((r) => Number(r.POS_COUNT) || 0);
    const negVals = rows.map((r) => Number(r.NEG_COUNT) || 0);
    const neutralVals = rows.map((r) => (Number(r.TOTAL) || 0) - (Number(r.POS_COUNT) || 0) - (Number(r.NEG_COUNT) || 0));
    return [
      { x: labels, y: posVals, type: "bar" as const, name: "Positive", marker: { color: "#22c55e" } },
      { x: labels, y: neutralVals, type: "bar" as const, name: "Neutral", marker: { color: "#64748b" } },
      { x: labels, y: negVals, type: "bar" as const, name: "Negative", marker: { color: "#ef4444" } },
    ];
  }, [summaryData, selectedSku]);

  const filteredTopicData = useMemo(() => {
    if (selectedSku === "all") return topicData;
    return topicData.filter((r) => r.SKU_ID === selectedSku);
  }, [topicData, selectedSku]);

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading sentiment data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Consumer Sentiment</h1>
      <p className="text-blue-300 text-sm mb-4">Social media sentiment analysis powered by Cortex AI</p>

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

      {hasHighNegative && (
        <div className="mb-4 bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-200 text-sm">
          <span className="font-semibold">Alert:</span> One or more SKUs have negative sentiment exceeding 30%. Immediate attention required.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <MetricCard
            label="Avg Social Score"
            value={avgSocial.toFixed(1)}
            delta={`${avgSocial >= 65 ? "+" : ""}${(avgSocial - 65).toFixed(1)} vs benchmark (65)`}
            deltaColor={avgSocial >= 65 ? "green" : "red"}
          />
          <DataLineage metricId="sentiment.social_score" />
        </div>
        <div>
          <MetricCard
            label="Avg NPS"
            value={avgNps.toFixed(1)}
            delta={`${avgNps >= 45 ? "+" : ""}${(avgNps - 45).toFixed(1)} vs benchmark (45)`}
            deltaColor={avgNps >= 45 ? "green" : "red"}
          />
          <DataLineage metricId="sentiment.nps" />
        </div>
        <div>
          <MetricCard
            label="Positive %"
            value={`${positivePct.toFixed(1)}%`}
            delta={`${totalPos.toLocaleString()} positive mentions`}
            deltaColor={positivePct >= 50 ? "green" : "yellow"}
          />
          <DataLineage metricId="sentiment.positive_pct" />
        </div>
        <div>
          <MetricCard
            label="Total Mentions"
            value={totalMentions.toLocaleString()}
            delta="social posts analyzed"
          />
          <DataLineage metricId="sentiment.mentions" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Sentiment Trend (Weekly Social Score)</h2>
        <PlotlyChart
          data={trendTraces}
          layout={{ title: "", yaxis: { title: "Social Score", gridcolor: "#334155" }, xaxis: { gridcolor: "#334155" } }}
        />
        <DataLineage metricId="sentiment.social_score" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700 mb-6">
        <h2 className="font-semibold text-white mb-3">Sentiment Composition</h2>
        <PlotlyChart
          data={compositionTraces}
          layout={{ barmode: "stack", yaxis: { title: "Mentions" } }}
        />
        <DataLineage metricId="sentiment.positive_pct" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
          <h2 className="font-semibold text-white mb-3">Top Positive Themes</h2>
          <p className="text-xs text-slate-400 mb-2">{selectedSku === "all" ? `Showing worst-performing SKU: ${SKUS.find((s) => s.id === themeSku)?.shortName}` : ""}</p>
          {themes?.positive.map((t, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
              <span className="text-sm text-slate-200">{t}</span>
            </div>
          ))}
          <DataLineage metricId="sentiment.themes" />
        </div>
        <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
          <h2 className="font-semibold text-white mb-3">Top Negative Themes</h2>
          <p className="text-xs text-slate-400 mb-2">{selectedSku === "all" ? `Showing worst-performing SKU: ${SKUS.find((s) => s.id === themeSku)?.shortName}` : ""}</p>
          {themes?.negative.map((t, i) => (
            <div key={i} className="py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span className="text-sm text-slate-200">{t.theme}</span>
              </div>
              <p className="text-xs text-slate-400 italic ml-4 mt-1">{t.verbatim}</p>
            </div>
          ))}
          <DataLineage metricId="sentiment.themes" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Topic Analysis</h2>
        <DataTable
          columns={[
            { key: "SKU_ID", label: "SKU" },
            { key: "TOPIC_CATEGORY", label: "Topic" },
            { key: "CNT", label: "Count" },
            { key: "AVG_SENT", label: "Avg Sentiment", format: (v) => Number(v).toFixed(2) },
          ]}
          data={filteredTopicData}
        />
        <DataLineage metricId="sentiment.social" />
      </div>
    </div>
  );
}
