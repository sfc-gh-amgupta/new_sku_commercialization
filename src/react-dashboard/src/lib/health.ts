import { SKUS } from "./constants";

export interface HealthScore {
  skuId: string;
  overall: number;
  sales: number;
  distribution: number;
  pricing: number;
  promo: number;
  trial: number;
  sentiment: number;
}

export interface Headline {
  severity: "red" | "amber" | "green";
  title: string;
  description: string;
  skuId: string;
}

export function calculateHealthScores(
  perfData: Record<string, any>[],
  promoData: Record<string, any>[],
  consumerData: Record<string, any>[],
  sentimentData: Record<string, any>[]
): HealthScore[] {
  return SKUS.map((sku) => {
    const skuPerf = perfData.filter((r) => r.SKU_ID === sku.id);
    const totalActual = skuPerf.reduce((s, r) => s + (Number(r.TOTAL_ACTUAL_UNITS || r.ACTUAL_UNITS) || 0), 0);
    const totalForecast = skuPerf.reduce((s, r) => s + (Number(r.TOTAL_FORECAST_UNITS || r.FORECAST_UNITS) || 0), 0);
    const salesScore = totalForecast ? Math.min(100, Math.round((totalActual / totalForecast) * 100)) : 0;

    const avgCompliance = skuPerf.length
      ? skuPerf.reduce((s, r) => s + (Number(r.PRICE_COMPLIANCE_PCT) || 0), 0) / skuPerf.length
      : 90;
    const pricingScore = Math.round(avgCompliance);

    const avgStores = skuPerf.length
      ? skuPerf.reduce((s, r) => s + (Number(r.ACTUAL_STORES) || 0), 0) / skuPerf.length
      : 0;
    const plannedStores = skuPerf.length
      ? skuPerf.reduce((s, r) => s + (Number(r.PLANNED_STORES) || 0), 0) / skuPerf.length
      : 1;
    const distScore = plannedStores ? Math.min(100, Math.round((avgStores / plannedStores) * 100)) : 0;

    const skuPromos = promoData.filter((r) => r.SKU_ID === sku.id);
    const executed = skuPromos.filter((r) => r.EXECUTED === true || r.EXECUTED === "true").length;
    const promoScore = skuPromos.length ? Math.round((executed / skuPromos.length) * 100) : 100;

    const skuConsumer = consumerData.filter((r) => r.SKU_ID === sku.id);
    const maxTrial = skuConsumer.length ? Math.max(...skuConsumer.map((r) => Number(r.CUMULATIVE_TRIAL_HH) || 0)) : 0;
    const trialGoal = sku.targetTrialHh;
    const trialScore = trialGoal ? Math.min(100, Math.round((maxTrial / trialGoal) * 100)) : 0;

    const skuSent = sentimentData.filter((r) => r.SKU_ID === sku.id);
    const avgSocial = skuSent.length
      ? skuSent.reduce((s, r) => s + (Number(r.AVG_SOCIAL_SCORE) || Number(r.AVG_SOCIAL) || Number(r.SOCIAL_SCORE) || 0), 0) / skuSent.length
      : 50;
    const sentimentScore = Math.round(avgSocial);

    const overall = Math.round(
      salesScore * 0.25 + distScore * 0.20 + pricingScore * 0.15 + promoScore * 0.15 + trialScore * 0.15 + sentimentScore * 0.10
    );

    return { skuId: sku.id, overall, sales: salesScore, distribution: distScore, pricing: pricingScore, promo: promoScore, trial: trialScore, sentiment: sentimentScore };
  });
}

export function generateHeadlines(scores: HealthScore[]): Headline[] {
  const headlines: Headline[] = [];
  for (const score of scores) {
    const sku = SKUS.find((s) => s.id === score.skuId)!;
    const issues: string[] = [];
    let worstSeverity: "red" | "amber" | "green" = "green";

    if (score.pricing < 65) { issues.push(`Pricing ${score.pricing}%`); worstSeverity = "red"; }
    if (score.distribution < 70) { issues.push(`Distribution ${score.distribution}%`); if (worstSeverity !== "red") worstSeverity = "red"; }
    if (score.promo < 65) { issues.push(`Promo ${score.promo}%`); if (worstSeverity !== "red") worstSeverity = "red"; }
    if (score.trial < 70) { issues.push(`Trial ${score.trial}%`); if (worstSeverity !== "red") worstSeverity = "amber"; }
    if (score.sentiment < 65) { issues.push(`Sentiment ${score.sentiment}%`); if (worstSeverity !== "red") worstSeverity = "amber"; }

    if (issues.length > 0) {
      headlines.push({
        severity: worstSeverity,
        title: `${sku.shortName}: ${issues.length} area${issues.length > 1 ? "s" : ""} need attention`,
        description: issues.join(" | "),
        skuId: sku.id,
      });
    }
  }
  headlines.sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.severity] - { red: 0, amber: 1, green: 2 }[b.severity]));
  return headlines;
}
