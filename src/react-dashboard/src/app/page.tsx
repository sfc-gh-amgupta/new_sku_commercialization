"use client";
import { useState } from "react";
import { SKUS, SNOWFLAKE_CONFIG } from "@/lib/constants";
import { useSnowflakeQuery } from "@/hooks/useSnowflakeQuery";
import { calculateHealthScores, generateHeadlines, HealthScore } from "@/lib/health";
import MetricCard from "@/components/MetricCard";
import DataLineage from "@/components/DataLineage";

export default function ExecutiveSummary() {
  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const { data: perfData, loading: perfLoading } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, SUM(actual_units) as total_actual_units, SUM(forecast_units) as total_forecast_units,
     SUM(actual_revenue) as total_actual_revenue, SUM(forecast_units * avg_price) as total_forecast_revenue,
     ROUND((SUM(actual_units) - SUM(forecast_units)) / NULLIF(SUM(forecast_units), 0) * 100, 1) as variance_pct,
     AVG(distribution_pct) as avg_distribution_pct, AVG(price_compliance_pct) as avg_price_compliance
     FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance} GROUP BY sku_id, sku_name ORDER BY sku_id`
  );

  const { data: perfRaw } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, actual_units, forecast_units, actual_revenue, distribution_pct, price_compliance_pct, actual_stores, planned_stores
     FROM ${SNOWFLAKE_CONFIG.tables.skuPerformance} ORDER BY sku_id, week_number`
  );

  const { data: promoData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, retailer, week_number, promo_type, planned, executed, lift_pct, investment_usd, incremental_units
     FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS ORDER BY sku_id, week_number`
  );

  const { data: consumerData } = useSnowflakeQuery(
    `SELECT sku_id, sku_name, week_number, weekly_new_buyers, cumulative_trial_hh, weekly_repeat_buyers, repeat_rate_weekly, trial_forecast, trial_variance_pct, trial_status
     FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS ORDER BY sku_id, week_number`
  );

  const { data: sentimentData } = useSnowflakeQuery(
    `SELECT sku_id, AVG(social_score) as avg_social_score, AVG(sentiment_score) as avg_sentiment_score, COUNT(*) as post_count
     FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS GROUP BY sku_id`
  );

  const totalActualRev = perfData.reduce((s, r) => s + (Number(r.TOTAL_ACTUAL_REVENUE) || 0), 0);
  const totalForecastRev = perfData.reduce((s, r) => s + (Number(r.TOTAL_FORECAST_REVENUE) || 0), 0);
  const gapPct = totalForecastRev ? ((totalActualRev - totalForecastRev) / totalForecastRev * 100) : 0;

  const healthScores = calculateHealthScores(perfRaw, promoData, consumerData, sentimentData);
  const headlines = generateHeadlines(healthScores);

  const skusOnTrack = healthScores.filter((s) => s.overall >= 85).length;
  const avgDistribution = perfData.length > 0
    ? perfData.reduce((s, r) => s + (Number(r.AVG_DISTRIBUTION_PCT) || 0), 0) / perfData.length
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-green-900/50";
    if (score >= 70) return "bg-yellow-900/50";
    return "bg-red-900/50";
  };

  const generateActions = (scores: HealthScore[]) => {
    const actions: { priority: "red" | "amber" | "green"; text: string }[] = [];
    for (const s of scores) {
      const sku = SKUS.find((sk) => sk.id === s.skuId);
      const name = sku?.shortName || s.skuId;
      if (s.pricing < 65) actions.push({ priority: "red", text: `Escalate pricing compliance for ${name} — score ${s.pricing}/100` });
      if (s.distribution < 70) actions.push({ priority: "amber", text: `Accelerate distribution build for ${name} — currently ${s.distribution}/100` });
      if (s.promo < 65) actions.push({ priority: "red", text: `Review promo execution gaps for ${name} — score ${s.promo}/100` });
      if (s.trial < 70) actions.push({ priority: "amber", text: `Boost trial activation for ${name} — trial score ${s.trial}/100` });
      if (s.sentiment < 65) actions.push({ priority: "amber", text: `Address consumer sentiment for ${name} — score ${s.sentiment}/100` });
      if (s.overall >= 85) actions.push({ priority: "green", text: `Maintain momentum for ${name} — overall ${s.overall}/100` });
    }
    return actions.sort((a, b) => {
      const order = { red: 0, amber: 1, green: 2 };
      const pDiff = order[a.priority] - order[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.text.localeCompare(b.text);
    });
  };

  if (perfLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#29b5e8]"></div>
        <span className="ml-3 text-blue-300">Loading live data from Snowflake...</span>
      </div>
    );
  }

  const actions = generateActions(healthScores);
  const criticalAlerts = healthScores.filter((s) => {
    const sku = SKUS.find((sk) => sk.id === s.skuId);
    const name = sku?.shortName || s.skuId;
    return actions.some((a) => a.priority === "red" && a.text.includes(name));
  }).length;

  const getSkuSummary = (sku: typeof SKUS[0], score: HealthScore | undefined) => {
    if (!score) return sku.description;
    const issues: string[] = [];
    if (score.sales < 80) issues.push(`Sales underperforming at ${score.sales}%`);
    if (score.pricing < 75) issues.push(`Pricing compliance low at ${score.pricing}%`);
    if (score.distribution < 80) issues.push(`Distribution behind target at ${score.distribution}%`);
    if (score.promo < 75) issues.push(`Promo execution gaps at ${score.promo}%`);
    if (score.trial < 75) issues.push(`Trial below target at ${score.trial}%`);
    if (score.sentiment < 65) issues.push(`Consumer sentiment weak at ${score.sentiment}%`);
    if (issues.length === 0) return `Strong performer — all health components above threshold. Overall ${score.overall}/100.`;
    return `${issues.join(". ")}. Overall health: ${score.overall}/100.`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Executive Summary</h1>
      <p className="text-blue-300 text-sm mb-4">12-week post-launch performance across {SKUS.length} BrightSmile SKUs</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <MetricCard label="Revenue vs Forecast" value={`$${(totalActualRev / 1e6).toFixed(1)}M`} delta={`${gapPct > 0 ? "+" : ""}${gapPct.toFixed(1)}% vs plan`} deltaColor={gapPct >= 0 ? "green" : "red"} />
          <DataLineage metricId="exec.total_revenue" />
        </div>
        <div>
          <MetricCard label="SKUs On Track (Health≥85)" value={`${skusOnTrack} / ${healthScores.length || SKUS.length}`} delta="Health score ≥ 85" deltaColor={skusOnTrack >= 3 ? "green" : "yellow"} />
          <DataLineage metricId="exec.skus_on_track" />
        </div>
        <div>
          <MetricCard label="Critical Alerts" value={`${criticalAlerts}`} delta="SKUs with red actions — see below" deltaColor={criticalAlerts > 0 ? "red" : "green"} />
          <DataLineage metricId="exec.critical_alerts" />
        </div>
        <div>
          <MetricCard label="Avg Distribution Build" value={`${avgDistribution.toFixed(1)}%`} delta="ACV weighted distribution" deltaColor={avgDistribution >= 70 ? "green" : avgDistribution >= 50 ? "yellow" : "red"} />
          <DataLineage metricId="exec.avg_distribution" />
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">SKU Portfolio</h2>
        <div className="space-y-2">
          {SKUS.map((sku) => {
            const score = healthScores.find((s) => s.skuId === sku.id);
            const isExpanded = expandedSku === sku.id;
            return (
              <div key={sku.id} className="border border-slate-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSku(isExpanded ? null : sku.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${(score?.overall || 0) >= 85 ? "bg-green-400" : (score?.overall || 0) >= 70 ? "bg-yellow-400" : "bg-red-400"}`} />
                    <span className="text-white font-medium">{sku.shortName}</span>
                    <span className="text-slate-400 text-sm">{sku.category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${getScoreColor(score?.overall || 0)}`}>{score?.overall || "—"}/100</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-slate-600 bg-slate-800/50">
                    <p className="text-slate-300 text-sm mb-3">{getSkuSummary(sku, score)}</p>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div><span className="text-slate-400">SRP:</span> <span className="text-white">${sku.plannedSrp}</span></div>
                      <div><span className="text-slate-400">Target ACV:</span> <span className="text-white">{sku.targetAcv}%</span></div>
                      <div><span className="text-slate-400">Target Stores:</span> <span className="text-white">{sku.targetStores.toLocaleString()}</span></div>
                      <div><span className="text-slate-400">Target Trial HH:</span> <span className="text-white">{sku.targetTrialHh.toLocaleString()}</span></div>
                      <div><span className="text-slate-400">Forecast Units/Wk:</span> <span className="text-white">{sku.forecastUnitsWeekly.toLocaleString()}</span></div>
                      <div><span className="text-slate-400">Forecast Rev/Wk:</span> <span className="text-white">${(sku.forecastRevenueWeekly / 1e3).toFixed(0)}K</span></div>
                      <div><span className="text-slate-400">Brand:</span> <span className="text-white">{sku.brand}</span></div>
                      <div><span className="text-slate-400">Storyline:</span> <span className="text-white capitalize">{sku.storyline}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {criticalAlerts > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-semibold text-red-300">Critical Alerts ({criticalAlerts} SKU{criticalAlerts > 1 ? "s" : ""})</h2>
          </div>
          <p className="text-red-200 text-sm mb-2">
            {criticalAlerts} SKU{criticalAlerts > 1 ? "s have" : " has"} red-priority action items requiring immediate intervention. See <strong>Recommended Next Actions</strong> below for details.
          </p>
          <DataLineage metricId="exec.critical_alerts" />
        </div>
      )}

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Performance Summary</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          Across the {SKUS.length}-SKU portfolio, total revenue stands at <strong className="text-white">${(totalActualRev / 1e6).toFixed(1)}M</strong> against
          a forecast of <strong className="text-white">${(totalForecastRev / 1e6).toFixed(1)}M</strong> ({gapPct >= 0 ? "+" : ""}{gapPct.toFixed(1)}% variance).
          {" "}<strong className="text-white">{skusOnTrack} of {healthScores.length || SKUS.length}</strong> SKUs are on track with a health score ≥ 85.
          Average distribution build is at <strong className="text-white">{avgDistribution.toFixed(1)}%</strong> ACV.
          {criticalAlerts > 0 && <> There {criticalAlerts === 1 ? "is" : "are"} <strong className="text-red-400">{criticalAlerts} critical alert{criticalAlerts > 1 ? "s" : ""}</strong> requiring immediate attention.</>}
          {" "}The portfolio generated <strong className="text-white">${(totalActualRev / 1e6).toFixed(2)}M</strong> in cumulative revenue over 12 weeks
          with an average weekly run-rate of <strong className="text-white">${((totalActualRev / 12) / 1e6).toFixed(2)}M</strong>.
        </p>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Recommended Next Actions</h2>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${action.priority === "red" ? "bg-red-500" : action.priority === "amber" ? "bg-yellow-500" : "bg-green-500"}`} />
              <span className="text-slate-300 text-sm">{action.text}</span>
            </div>
          ))}
          {actions.length === 0 && <p className="text-slate-400 text-sm">No action items — all SKUs performing within target thresholds.</p>}
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">Action Headlines</h2>
        <div className="space-y-2">
          {headlines.map((h, i) => (
            <div key={i} className={`p-3 rounded-lg border ${h.severity === "red" ? "border-red-700 bg-red-900/20" : h.severity === "amber" ? "border-yellow-700 bg-yellow-900/20" : "border-green-700 bg-green-900/20"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${h.severity === "red" ? "bg-red-500" : h.severity === "amber" ? "bg-yellow-500" : "bg-green-500"}`} />
                <span className={`font-medium text-sm ${h.severity === "red" ? "text-red-300" : h.severity === "amber" ? "text-yellow-300" : "text-green-300"}`}>{h.title}</span>
              </div>
              <p className="text-slate-400 text-xs ml-5">{h.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">SKU Health Scorecard</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-600">
              <th className="pb-2">SKU</th>
              <th className="pb-2 text-center">Overall</th>
              <th className="pb-2 text-center">Sales</th>
              <th className="pb-2 text-center">Distribution</th>
              <th className="pb-2 text-center">Pricing</th>
              <th className="pb-2 text-center">Promo</th>
              <th className="pb-2 text-center">Trial</th>
              <th className="pb-2 text-center">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {healthScores.map((score) => {
              const sku = SKUS.find((s) => s.id === score.skuId);
              return (
                <tr key={score.skuId} className="border-b border-slate-700">
                  <td className="py-2 text-white font-medium">{sku?.shortName || score.skuId}</td>
                  <td className={`py-2 text-center font-bold ${getScoreColor(score.overall)}`}>{score.overall}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.sales)} ${getScoreColor(score.sales)}`}>{score.sales}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.distribution)} ${getScoreColor(score.distribution)}`}>{score.distribution}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.pricing)} ${getScoreColor(score.pricing)}`}>{score.pricing}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.promo)} ${getScoreColor(score.promo)}`}>{score.promo}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.trial)} ${getScoreColor(score.trial)}`}>{score.trial}</td>
                  <td className={`py-2 text-center ${getScoreBg(score.sentiment)} ${getScoreColor(score.sentiment)}`}>{score.sentiment}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <DataLineage metricId="exec.health_scorecard" />
      </div>

      <div className="bg-[#1e3a5f]/80 rounded-lg p-4 mb-6 border border-slate-700">
        <h2 className="font-semibold text-white mb-3">SKU Performance Table</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-600">
              <th className="pb-2">SKU</th>
              <th className="pb-2">Actual Units</th>
              <th className="pb-2">Forecast Units</th>
              <th className="pb-2">Actual Revenue</th>
              <th className="pb-2">Variance %</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {perfData.map((row, i) => {
              const vPct = Number(row.VARIANCE_PCT) || 0;
              return (
                <tr key={i} className="border-b border-slate-700 text-slate-200">
                  <td className="py-2 font-medium">{row.SKU_NAME as string}</td>
                  <td className="py-2">{Number(row.TOTAL_ACTUAL_UNITS).toLocaleString()}</td>
                  <td className="py-2">{Number(row.TOTAL_FORECAST_UNITS).toLocaleString()}</td>
                  <td className="py-2">${(Number(row.TOTAL_ACTUAL_REVENUE) / 1e6).toFixed(2)}M</td>
                  <td className={`py-2 font-medium ${vPct >= 0 ? "text-green-400" : vPct >= -2 ? "text-yellow-400" : "text-red-400"}`}>
                    {vPct > 0 ? "+" : ""}{vPct.toFixed(1)}%
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${vPct >= 0 ? "bg-green-900 text-green-300" : vPct >= -2 ? "bg-yellow-900 text-yellow-300" : "bg-red-900 text-red-300"}`}>
                      {vPct >= 0 ? "On Track" : vPct >= -2 ? "Monitor" : "At Risk"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <DataLineage metricId="exec.sku_table" />
      </div>
    </div>
  );
}
