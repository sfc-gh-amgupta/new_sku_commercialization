export interface SKU {
  id: string;
  name: string;
  shortName: string;
  brand: string;
  category: string;
  plannedSrp: number;
  forecastUnitsWeekly: number;
  forecastRevenueWeekly: number;
  targetAcv: number;
  targetStores: number;
  targetTrialHh: number;
  storyline: "strong" | "distribution" | "pricing" | "promo";
  description: string;
}

export interface Retailer {
  id: string;
  name: string;
  shortName: string;
  totalStores: number;
  channel: string;
}

export const SKUS: SKU[] = [
  { id: "SKU001", name: "BrightSmile Max White Toothpaste 6oz", shortName: "BrightSmile Max White", brand: "BrightSmile", category: "Oral Care - Whitening", plannedSrp: 6.99, forecastUnitsWeekly: 189329, forecastRevenueWeekly: 1323428, targetAcv: 80, targetStores: 2500, targetTrialHh: 2400, storyline: "strong", description: "Premium whitening toothpaste with advanced hydrogen peroxide formula. Delivers visible whitening results in 3 days. Targeting millennial and Gen Z consumers seeking fast whitening without sensitivity. Positioned in the high-growth premium whitening segment." },
  { id: "SKU002", name: "BrightSmile Sensitive Pro 4.5oz", shortName: "BrightSmile Sensitive Pro", brand: "BrightSmile", category: "Oral Care - Sensitivity", plannedSrp: 7.49, forecastUnitsWeekly: 183250, forecastRevenueWeekly: 1372544, targetAcv: 70, targetStores: 2500, targetTrialHh: 2400, storyline: "pricing", description: "Advanced sensitivity relief formula with potassium nitrate and micro-repair technology. Clinically proven 24-hour sensitivity protection. Targeting adults 25-54 with tooth sensitivity issues. Currently underperforming in Southwest due to packaging complaints." },
  { id: "SKU003", name: "BrightSmile Cavity Protection 6oz", shortName: "BrightSmile Cavity Protection", brand: "BrightSmile", category: "Oral Care - Cavity", plannedSrp: 4.99, forecastUnitsWeekly: 189310, forecastRevenueWeekly: 944637, targetAcv: 85, targetStores: 2500, targetTrialHh: 2000, storyline: "distribution", description: "Everyday cavity protection with fluoride formula. Family-friendly positioning with broad distribution across all channels. Consistent performer tracking slightly above forecast." },
  { id: "SKU004", name: "BrightSmile Kids Bubble Fruit 4.6oz", shortName: "BrightSmile Kids", brand: "BrightSmile", category: "Oral Care - Kids", plannedSrp: 4.49, forecastUnitsWeekly: 189575, forecastRevenueWeekly: 851173, targetAcv: 75, targetStores: 2500, targetTrialHh: 1800, storyline: "promo", description: "Fun bubble fruit flavored toothpaste for children ages 2-6. Features popular character licensing and cavity-fighting fluoride. On track with forecast across all regions." },
];

export const RETAILERS: Retailer[] = [
  { id: "walmart", name: "Walmart US", shortName: "Walmart", totalStores: 4700, channel: "hypermarket" },
  { id: "kroger", name: "Kroger", shortName: "Kroger", totalStores: 2750, channel: "supermarket" },
  { id: "target", name: "Target", shortName: "Target", totalStores: 1950, channel: "mass" },
  { id: "costco", name: "Costco", shortName: "Costco", totalStores: 600, channel: "club" },
];

export const WEEKS = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, label: `W${i + 1}` }));

export const SNOWFLAKE_CONFIG = {
  database: "SKU_LAUNCH",
  warehouse: "SKU_LAUNCH_WH",
  agent: {
    database: "SNOWFLAKE_INTELLIGENCE",
    schema: "AGENTS",
    name: "PRODUCT_LAUNCH_AGENT",
  },
  schemas: {
    inventory: "INVENTORY",
    skuSales: "SKU_SALES",
    distribution: "DISTRIBUTION",
    consumerInsights: "CONSUMER_INSIGHTS",
  },
  tables: {
    skuPerformance: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    regionalVariance: "SKU_LAUNCH.SKU_SALES.CURATED_DT_REGIONAL_VARIANCE",
    storePerformance: "SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE",
    consumerMetrics: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    mlForecast: "SKU_LAUNCH.SKU_SALES.ML_SKU_FORECAST",
    dcInventory: "SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS",
    dcShipments: "SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS",
    storeGeospatial: "SKU_LAUNCH.DISTRIBUTION.CURATED_DT_STORE_GEOSPATIAL",
    dcBackup: "SKU_LAUNCH.DISTRIBUTION.V_DC_BACKUP_OPTIONS",
    socialTopics: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    callTranscripts: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_CALL_TRANSCRIPTS",
  },
};

export interface MetricLineage {
  label: string;
  explanation: string;
  sql: string;
  column: string;
  sourceTable: string;
  formula: string;
  queriedVia: "direct_sql" | "agent_tool" | "semantic_view";
}

export const METRIC_LINEAGE: Record<string, MetricLineage> = {
  "exec.total_revenue": {
    label: "Total Revenue vs Forecast",
    explanation: "Sum of actual_revenue across all 4 SKUs for all tracked weeks. Queried directly from the Dynamic Table via SQL API.",
    sql: "SELECT sku_id, sku_name, SUM(actual_units) as total_actual_units, SUM(forecast_units) as total_forecast_units, SUM(actual_revenue) as total_actual_revenue, SUM(forecast_units * avg_price) as total_forecast_revenue, ROUND((SUM(actual_units) - SUM(forecast_units)) / NULLIF(SUM(forecast_units), 0) * 100, 1) as variance_pct FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name ORDER BY sku_id",
    column: "ACTUAL_REVENUE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "SUM(actual_revenue)",
    queriedVia: "direct_sql",
  },
  "exec.skus_on_track": {
    label: "SKUs On Track",
    explanation: "Count of SKUs with overall health score >= 85. Health is a weighted composite: Sales (25%) + Distribution (20%) + Pricing (15%) + Promo (15%) + Trial (15%) + Sentiment (10%). Each component is normalized to 0-100.",
    sql: "SELECT sku_id, SUM(actual_units)/SUM(forecast_units)*100 as sales_score, AVG(actual_stores)/AVG(planned_stores)*100 as dist_score, AVG(price_compliance_pct) as pricing_score FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id",
    column: "ACTUAL_UNITS",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "COUNT(SKUs WHERE overall_health >= 80); health = sales*0.25 + dist*0.20 + pricing*0.15 + promo*0.15 + trial*0.15 + sentiment*0.10",
    queriedVia: "direct_sql",
  },
  "exec.critical_inventory": {
    label: "Critical Inventory",
    explanation: "Count of DC-SKU combinations where inventory_status = 'Critical'. Status is determined by units_available relative to safety_stock and reorder_point thresholds.",
    sql: "SELECT inventory_status, COUNT(*) as cnt FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS GROUP BY inventory_status",
    column: "INVENTORY_STATUS",
    sourceTable: "SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS",
    formula: "COUNT(*) WHERE inventory_status = 'Critical'",
    queriedVia: "direct_sql",
  },
  "exec.delayed_shipments": {
    label: "Delayed Shipments",
    explanation: "Count of shipments where days_delayed > 0 (actual arrival is past expected arrival date).",
    sql: "SELECT COUNT(*) as total_shipments, SUM(CASE WHEN days_delayed > 0 THEN 1 ELSE 0 END) as delayed FROM SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS",
    column: "DAYS_DELAYED",
    sourceTable: "SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS",
    formula: "SUM(CASE WHEN days_delayed > 0 THEN 1 ELSE 0 END)",
    queriedVia: "direct_sql",
  },
  "exec.sku_table": {
    label: "SKU Performance Summary",
    explanation: "Per-SKU aggregation of actual vs forecast units and revenue, with variance percentage. Each row represents one SKU's total performance across all weeks.",
    sql: "SELECT sku_id, sku_name, SUM(actual_units) as total_actual_units, SUM(forecast_units) as total_forecast_units, SUM(actual_revenue) as total_actual_revenue, SUM(forecast_units * avg_price) as total_forecast_revenue, ROUND((SUM(actual_units) - SUM(forecast_units)) / NULLIF(SUM(forecast_units), 0) * 100, 1) as variance_pct FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name ORDER BY sku_id",
    column: "ACTUAL_UNITS",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "SUM(actual_units), SUM(forecast_units), SUM(actual_revenue), ROUND((SUM(actual_units) - SUM(forecast_units)) / NULLIF(SUM(forecast_units), 0) * 100, 1)",
    queriedVia: "direct_sql",
  },
  "sales.total_revenue": {
    label: "Total Revenue",
    explanation: "Sum of actual_revenue for all SKUs across all tracked weeks from the weekly syndicated POS Dynamic Table.",
    sql: "SELECT sku_id, sku_name, week_number, actual_units, forecast_units, actual_revenue, forecast_units * avg_price as forecast_revenue, ROUND((actual_units - forecast_units) / NULLIF(forecast_units, 0) * 100, 1) as variance_pct FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE ORDER BY sku_id, week_number",
    column: "ACTUAL_REVENUE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "SUM(actual_revenue) across all rows",
    queriedVia: "direct_sql",
  },
  "sales.weekly_table": {
    label: "Weekly Performance by SKU",
    explanation: "Week-by-week breakdown of actual vs forecast units per SKU with calculated revenue and variance percentage.",
    sql: "SELECT sku_id, sku_name, week_number, actual_units, forecast_units, actual_revenue, forecast_units * avg_price as forecast_revenue, ROUND((actual_units - forecast_units) / NULLIF(forecast_units, 0) * 100, 1) as variance_pct FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE ORDER BY sku_id, week_number",
    column: "ACTUAL_UNITS",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "Per-row: variance_pct = ROUND((actual_units - forecast_units) / NULLIF(forecast_units, 0) * 100, 1)",
    queriedVia: "direct_sql",
  },
  "sales.regional_variance": {
    label: "Regional Variance",
    explanation: "Pre-aggregated regional performance from the Regional Variance Dynamic Table. Shows each SKU's total actual vs forecast by region with status classification.",
    sql: "SELECT sku_id, sku_name, region, total_actual, total_forecast, variance_pct, regional_status FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_REGIONAL_VARIANCE ORDER BY variance_pct ASC",
    column: "VARIANCE_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_REGIONAL_VARIANCE",
    formula: "variance_pct = (total_actual - total_forecast) / total_forecast * 100",
    queriedVia: "direct_sql",
  },
  "inventory.dc_status": {
    label: "DC Inventory Status",
    explanation: "Current inventory levels by DC and SKU showing units available, safety stock, reorder point, and computed days of supply.",
    sql: "SELECT sku_id, sku_name, dc_name, units_available, safety_stock, reorder_point, inventory_status, ROUND(units_available / NULLIF(reorder_point, 0) * 14, 0) as days_of_supply FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS ORDER BY inventory_status, units_available",
    column: "UNITS_AVAILABLE",
    sourceTable: "SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS",
    formula: "days_of_supply = ROUND(units_available / NULLIF(reorder_point, 0) * 14, 0)",
    queriedVia: "direct_sql",
  },
  "distribution.shipments": {
    label: "Shipment Status",
    explanation: "Active shipments from plants to DCs with delay tracking. Days delayed is the difference between expected and actual arrival dates.",
    sql: "SELECT sku_id, sku_name, dc_name, plant_name, shipment_status, units_shipped, days_delayed, expected_arrival_date FROM SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS ORDER BY days_delayed DESC LIMIT 50",
    column: "DAYS_DELAYED",
    sourceTable: "SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS",
    formula: "days_delayed = DATEDIFF('day', expected_arrival_date, COALESCE(actual_arrival_date, CURRENT_DATE()))",
    queriedVia: "direct_sql",
  },
  "distribution.geospatial": {
    label: "Store Geospatial",
    explanation: "Store distances to each DC calculated using ST_DISTANCE on geospatial points, converted from meters to miles.",
    sql: "SELECT store_id, retailer, region, city, state, nearest_dc, LEAST(distance_to_dc_east_miles, distance_to_dc_west_miles, distance_to_dc_central_miles) as distance_miles FROM SKU_LAUNCH.DISTRIBUTION.CURATED_DT_STORE_GEOSPATIAL ORDER BY distance_miles DESC LIMIT 30",
    column: "DISTANCE_TO_DC_EAST_MILES",
    sourceTable: "SKU_LAUNCH.DISTRIBUTION.CURATED_DT_STORE_GEOSPATIAL",
    formula: "distance_miles = LEAST(distance_to_dc_east_miles, distance_to_dc_west_miles, distance_to_dc_central_miles)",
    queriedVia: "direct_sql",
  },
  "sentiment.social": {
    label: "Social Topic Analysis",
    explanation: "Aggregated sentiment by SKU and topic category from social media posts. Sentiment scored by SNOWFLAKE.CORTEX.SENTIMENT, topics by CLASSIFY_TEXT.",
    sql: "SELECT sku_id, topic_category, COUNT(*) as post_count, AVG(sentiment_score) as avg_sentiment, SUM(CASE WHEN sentiment_label = 'Positive' THEN 1 ELSE 0 END) as positive_count, SUM(CASE WHEN sentiment_label = 'Negative' THEN 1 ELSE 0 END) as negative_count FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS GROUP BY sku_id, topic_category ORDER BY sku_id, post_count DESC",
    column: "SENTIMENT_SCORE",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "AVG(sentiment_score), COUNT(*) grouped by sku_id, topic_category",
    queriedVia: "direct_sql",
  },
  "sentiment.calls": {
    label: "Call Transcripts",
    explanation: "Call center transcripts enriched with AI-generated sentiment and topic classification via Openflow pipeline (AI_TRANSCRIBE + CORTEX.SENTIMENT + CLASSIFY_TEXT).",
    sql: "SELECT call_id, topic_category, sentiment_score, call_date, sentiment_label FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_CALL_TRANSCRIPTS ORDER BY call_date DESC LIMIT 50",
    column: "SENTIMENT_SCORE",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_CALL_TRANSCRIPTS",
    formula: "sentiment_score = SNOWFLAKE.CORTEX.SENTIMENT(transcript_text); topic_category = CLASSIFY_TEXT(transcript_text, categories)",
    queriedVia: "direct_sql",
  },
  "trial.consumer_metrics": {
    label: "Consumer Metrics",
    explanation: "Trial and repeat purchase metrics per SKU derived from consumer purchase data. Shows total buyers, repeat rate, and variance vs forecast.",
    sql: "SELECT sku_id, sku_name, total_buyers, repeat_buyers, repeat_rate_pct, trial_forecast, repeat_rate_forecast, trial_variance_pct, repeat_variance_pp, trial_status, repeat_status FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS ORDER BY sku_id",
    column: "REPEAT_RATE_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "repeat_rate_pct = repeat_buyers / total_buyers * 100; trial_variance_pct = (total_buyers - trial_forecast) / trial_forecast * 100",
    queriedVia: "direct_sql",
  },
  "exec.critical_alerts": {
    label: "Critical Alerts",
    explanation: "Count of distinct SKUs with at least one red-priority action. Red triggers: pricing compliance < 65%, promo execution < 65%. These indicate areas needing immediate escalation.",
    sql: "SELECT sku_id, AVG(price_compliance_pct) as pricing, COUNT(CASE WHEN executed THEN 1 END)/COUNT(*)*100 as promo_rate FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE p JOIN SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS e ON p.sku_id=e.sku_id GROUP BY sku_id",
    column: "PRICE_COMPLIANCE_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "COUNT(distinct SKUs WHERE pricing < 65% OR promo_execution < 65%)",
    queriedVia: "direct_sql",
  },
  "exec.avg_distribution": {
    label: "Avg Distribution Build",
    explanation: "Average ratio of actual stores to planned stores across all SKUs and regions for the latest week.",
    sql: "SELECT sku_id, sku_name, AVG(actual_stores) as avg_actual, AVG(planned_stores) as avg_planned, ROUND(AVG(actual_stores) / NULLIF(AVG(planned_stores), 0) * 100, 1) as pct FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name",
    column: "ACTUAL_STORES",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "AVG(actual_stores) / AVG(planned_stores) * 100",
    queriedVia: "direct_sql",
  },
  "exec.health_scorecard": {
    label: "SKU Health Scorecard",
    explanation: "Weighted composite health score per SKU: Sales (25% weight), Distribution (20%), Pricing (15%), Promo Execution (15%), Trial (15%), Sentiment (10%). Derived from multiple DTs.",
    sql: "SELECT sku_id, SUM(actual_units) as actual, SUM(forecast_units) as forecast, AVG(price_compliance_pct) as compliance, AVG(actual_stores) as stores FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id",
    column: "ACTUAL_UNITS",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "overall = sales*0.25 + dist*0.20 + pricing*0.15 + promo*0.15 + trial*0.15 + sentiment*0.10",
    queriedVia: "direct_sql",
  },
  "sales.weekly_chart": {
    label: "Weekly Revenue Chart",
    explanation: "Weekly revenue actual vs forecast per SKU, plotted as line chart. Actual revenue from POS data, forecast from pre-launch plan.",
    sql: "SELECT sku_id, sku_name, week_number, SUM(actual_revenue) as revenue, SUM(forecast_units * avg_price) as forecast_revenue FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, week_number ORDER BY sku_id, week_number",
    column: "ACTUAL_REVENUE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "SUM(actual_revenue) per SKU per week",
    queriedVia: "direct_sql",
  },
  "sales.retailer_revenue": {
    label: "Revenue by Retailer",
    explanation: "Total revenue split proportionally by retailer using known market share weights (Walmart 38%, Kroger 25%, Target 20%, CVS 17%).",
    sql: "SELECT sku_id, sku_name, SUM(actual_revenue) as total_revenue FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name",
    column: "ACTUAL_REVENUE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "total_revenue * retailer_share_weight",
    queriedVia: "direct_sql",
  },
  "dist.store_build": {
    label: "Store Distribution Build",
    explanation: "Weekly actual vs planned store count per SKU showing distribution ramp-up trajectory.",
    sql: "SELECT sku_id, sku_name, week_number, SUM(actual_stores) as actual, SUM(planned_stores) as planned FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, week_number ORDER BY week_number",
    column: "ACTUAL_STORES",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "SUM(actual_stores) vs SUM(planned_stores) per week",
    queriedVia: "direct_sql",
  },
  "dist.acv_retailer": {
    label: "ACV by Region",
    explanation: "Distribution achievement by region showing actual vs planned store coverage for the latest week.",
    sql: "SELECT sku_id, sku_name, region, AVG(actual_stores) as avg_actual, AVG(planned_stores) as avg_planned FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE WHERE week_number = (SELECT MAX(week_number) FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE) GROUP BY sku_id, sku_name, region",
    column: "ACTUAL_STORES",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "AVG(actual_stores) / AVG(planned_stores) * target_acv",
    queriedVia: "direct_sql",
  },
  "pricing.compliance_rate": {
    label: "Pricing Compliance Rate",
    explanation: "Average percentage of stores selling at the planned SRP per SKU per week. Low compliance indicates unauthorized discounting.",
    sql: "SELECT sku_id, sku_name, week_number, AVG(price_compliance_pct) as avg_compliance FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, week_number ORDER BY week_number",
    column: "PRICE_COMPLIANCE_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "AVG(price_compliance_pct)",
    queriedVia: "direct_sql",
  },
  "pricing.price_index": {
    label: "Price Index",
    explanation: "Average actual price as a percentage of planned SRP. 100 = exactly at SRP, below 100 = selling below plan.",
    sql: "SELECT sku_id, sku_name, AVG(price_index) as avg_index FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name",
    column: "PRICE_INDEX",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "AVG(avg_price / planned_srp * 100)",
    queriedVia: "direct_sql",
  },
  "pricing.retailer_compliance": {
    label: "Compliance by Region",
    explanation: "Average pricing compliance per SKU per region. Identifies which geographic areas have the most unauthorized discounting.",
    sql: "SELECT sku_id, sku_name, region, AVG(price_compliance_pct) as avg_compliance FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, sku_name, region ORDER BY avg_compliance",
    column: "PRICE_COMPLIANCE_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE",
    formula: "AVG(price_compliance_pct) GROUP BY region",
    queriedVia: "direct_sql",
  },
  "promo.execution_rate": {
    label: "Promo Execution Rate",
    explanation: "Percentage of planned promotions that were actually executed by retailers.",
    sql: "SELECT sku_id, sku_name, retailer, COUNT(*) as total, SUM(CASE WHEN executed THEN 1 ELSE 0 END) as executed_cnt FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS GROUP BY sku_id, sku_name, retailer",
    column: "EXECUTED",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS",
    formula: "SUM(CASE WHEN executed THEN 1 ELSE 0 END) / COUNT(*) * 100",
    queriedVia: "direct_sql",
  },
  "promo.avg_lift": {
    label: "Average Promotional Lift",
    explanation: "Average sales lift percentage for executed promotions.",
    sql: "SELECT sku_id, sku_name, AVG(CASE WHEN executed THEN lift_pct ELSE NULL END) as avg_lift FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS GROUP BY sku_id, sku_name",
    column: "LIFT_PCT",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS",
    formula: "AVG(lift_pct) WHERE executed = TRUE",
    queriedVia: "direct_sql",
  },
  "promo.investment": {
    label: "Total Promotional Investment",
    explanation: "Total trade spend investment across all planned promotional events in USD.",
    sql: "SELECT sku_id, sku_name, SUM(investment_usd) as total_inv FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS GROUP BY sku_id, sku_name",
    column: "INVESTMENT_USD",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS",
    formula: "SUM(investment_usd)",
    queriedVia: "direct_sql",
  },
  "promo.calendar": {
    label: "Promo Calendar",
    explanation: "Full promotional event schedule showing planned vs executed status per SKU per retailer per week.",
    sql: "SELECT promo_id, sku_name, retailer, week_number, promo_type, executed, lift_pct, investment_usd FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS ORDER BY week_number, retailer",
    column: "PROMO_TYPE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS",
    formula: "Raw event-level data: each row = one planned promotional event",
    queriedVia: "direct_sql",
  },
  "trial.cumulative_hh": {
    label: "Cumulative Trial Households",
    explanation: "Running total of unique households that have trialed the product, tracked weekly.",
    sql: "SELECT sku_id, sku_name, week_number, cumulative_trial_hh, trial_forecast FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS ORDER BY sku_id, week_number",
    column: "CUMULATIVE_TRIAL_HH",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "SUM(weekly_new_buyers) cumulative over time",
    queriedVia: "direct_sql",
  },
  "trial.vs_goal": {
    label: "Trial vs Goal %",
    explanation: "Current cumulative trial households as a percentage of the pre-launch trial forecast target.",
    sql: "SELECT sku_id, sku_name, MAX(cumulative_trial_hh) as trial, MAX(trial_forecast) as goal FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS GROUP BY sku_id, sku_name",
    column: "CUMULATIVE_TRIAL_HH",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "MAX(cumulative_trial_hh) / trial_forecast * 100",
    queriedVia: "direct_sql",
  },
  "trial.repeat_rate": {
    label: "Repeat Rate",
    explanation: "Percentage of trialists who made a repeat purchase, tracked weekly.",
    sql: "SELECT sku_id, sku_name, week_number, repeat_rate_weekly FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS ORDER BY sku_id, week_number",
    column: "REPEAT_RATE_WEEKLY",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "weekly_repeat_buyers / weekly_new_buyers * 100",
    queriedVia: "direct_sql",
  },
  "trial.buy_rate": {
    label: "Buy Rate",
    explanation: "Average number of purchases per buyer across the measurement period.",
    sql: "SELECT sku_id, sku_name, AVG(buy_rate) as avg_buy_rate FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS GROUP BY sku_id, sku_name",
    column: "BUY_RATE",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "AVG(purchase_count) per buyer",
    queriedVia: "direct_sql",
  },
  "trial.weekly_buyers": {
    label: "Weekly New Buyers",
    explanation: "Count of unique new households purchasing the SKU for the first time each week.",
    sql: "SELECT sku_id, sku_name, week_number, weekly_new_buyers FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS ORDER BY sku_id, week_number",
    column: "WEEKLY_NEW_BUYERS",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS",
    formula: "COUNT(DISTINCT consumer_id) WHERE first_purchase_date in week",
    queriedVia: "direct_sql",
  },
  "sentiment.social_score": {
    label: "Social Score",
    explanation: "Composite social sentiment score (0-100) derived from social media post analysis per SKU.",
    sql: "SELECT sku_id, AVG(social_score) as avg_social, AVG(nps_score) as avg_nps, COUNT(*) as total_posts FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN ('SKU001','SKU002','SKU003','SKU004') GROUP BY sku_id",
    column: "SOCIAL_SCORE",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "AVG(social_score) per SKU",
    queriedVia: "direct_sql",
  },
  "sentiment.nps": {
    label: "Net Promoter Score",
    explanation: "Average NPS (0-100) derived from consumer social media engagement per SKU.",
    sql: "SELECT sku_id, AVG(nps_score) as avg_nps FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN ('SKU001','SKU002','SKU003','SKU004') GROUP BY sku_id",
    column: "NPS_SCORE",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "AVG(nps_score) per SKU",
    queriedVia: "direct_sql",
  },
  "sentiment.positive_pct": {
    label: "Positive Sentiment %",
    explanation: "Percentage of social media posts with positive sentiment classification per SKU.",
    sql: "SELECT sku_id, SUM(CASE WHEN sentiment_label='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as positive_pct FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN ('SKU001','SKU002','SKU003','SKU004') GROUP BY sku_id",
    column: "SENTIMENT_LABEL",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "COUNT(positive) / COUNT(*) * 100",
    queriedVia: "direct_sql",
  },
  "sentiment.mentions": {
    label: "Total Mentions",
    explanation: "Total count of social media posts mentioning the SKU across all platforms.",
    sql: "SELECT sku_id, COUNT(*) as total_mentions FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN ('SKU001','SKU002','SKU003','SKU004') GROUP BY sku_id",
    column: "POST_ID",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "COUNT(*) per SKU",
    queriedVia: "direct_sql",
  },
  "sentiment.themes": {
    label: "Sentiment Themes",
    explanation: "Top positive and negative themes extracted from social media using CORTEX.CLASSIFY_TEXT, with representative consumer verbatim quotes.",
    sql: "SELECT sku_id, topic_category, sentiment_label, COUNT(*) as cnt, AVG(sentiment_score) as avg_score FROM SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS WHERE sku_id IN ('SKU001','SKU002','SKU003','SKU004') GROUP BY sku_id, topic_category, sentiment_label ORDER BY cnt DESC",
    column: "TOPIC_CATEGORY",
    sourceTable: "SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS",
    formula: "SNOWFLAKE.CORTEX.CLASSIFY_TEXT(content, topic_categories)",
    queriedVia: "direct_sql",
  },
  "geo.regional_index": {
    label: "Regional Performance Index",
    explanation: "Store-level performance indexed against national average. Index = store_units / national_avg * 100.",
    sql: "SELECT region, retailer, COUNT(*) as store_count, SUM(total_units_sold) as total_units, ROUND(AVG(oos_days), 1) as avg_oos FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE GROUP BY region, retailer ORDER BY total_units DESC",
    column: "TOTAL_UNITS_SOLD",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE",
    formula: "store_units / national_avg_units * 100",
    queriedVia: "direct_sql",
  },
  "geo.top_states": {
    label: "Top Performing Stores",
    explanation: "Stores ranked by total units sold. Top performers indicate strong demand and availability.",
    sql: "SELECT store_id, retailer, state, city, sku_name, total_units_sold, oos_days FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE ORDER BY total_units_sold DESC LIMIT 10",
    column: "TOTAL_UNITS_SOLD",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE",
    formula: "ORDER BY total_units_sold DESC",
    queriedVia: "direct_sql",
  },
  "geo.bottom_states": {
    label: "Bottom Performing Stores",
    explanation: "Stores with lowest total units sold. May indicate distribution gaps, OOS issues, or low demand.",
    sql: "SELECT store_id, retailer, state, city, sku_name, total_units_sold, oos_days FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE ORDER BY total_units_sold ASC LIMIT 10",
    column: "TOTAL_UNITS_SOLD",
    sourceTable: "SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE",
    formula: "ORDER BY total_units_sold ASC",
    queriedVia: "direct_sql",
  },
  "inventory.weeks_cover": {
    label: "Weeks of Cover",
    explanation: "Estimated weeks of inventory remaining at each DC based on current available units and reorder point as demand proxy.",
    sql: "SELECT dc_name, sku_name, units_available, reorder_point, ROUND(units_available / NULLIF(reorder_point / 2, 0), 1) as weeks_cover FROM SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS ORDER BY weeks_cover ASC",
    column: "UNITS_AVAILABLE",
    sourceTable: "SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS",
    formula: "weeks_cover = units_available / (reorder_point / 2)",
    queriedVia: "direct_sql",
  },
  "inventory.diversion": {
    label: "Diversion Recommendations",
    explanation: "Potential inventory diversion routes between DCs based on surplus availability and geographic proximity.",
    sql: "SELECT primary_dc_name, backup_dc_name, distance_miles, backup_rank FROM SKU_LAUNCH.DISTRIBUTION.V_DC_BACKUP_OPTIONS ORDER BY backup_rank",
    column: "DISTANCE_MILES",
    sourceTable: "SKU_LAUNCH.DISTRIBUTION.V_DC_BACKUP_OPTIONS",
    formula: "Ranked by distance_miles (nearest DC first)",
    queriedVia: "direct_sql",
  },
};

export const SUGGESTED_QUESTIONS = [
  "How are SKUs performing for the latest launch cycle? Show me the data per SKU.",
  "What regions are showing the biggest variance from the national forecast for the underperforming SKU?",
  "Can we look at the store level data for Kroger in the region with the most variance to see if there are demand and/or stock issues?",
  "Examine the total quantities of shipment to the DC and inventory count at the DC for SKU 1 and 2.",
  "Can you look into the consumer purchase data to see if this is backed up for SKU 1 and 2?",
  "Do we have any consumer feedback?",
  "What backup DC options do we have for the Los Angeles DC to cover the Southwest while packaging is addressed?",
  "What are the sentiment scores by topic for BrightSmile Sensitive Pro to quantify how widespread the packaging complaints are?",
];

export const RETAILER_SHARES: Record<string, number> = { Walmart: 0.38, Kroger: 0.25, Target: 0.20, CVS: 0.17 };

export const SENTIMENT_THEMES: Record<string, { positive: string[]; negative: { theme: string; verbatim: string }[] }> = {
  "SKU001": {
    positive: ["Great whitening results", "Fresh clean feeling", "Good value for premium", "Love the mint flavor", "Noticeable difference in 3 days"],
    negative: [
      { theme: "Too abrasive for daily use", verbatim: "\"My dentist said it's wearing down my enamel. Had to switch after 2 weeks.\" — Amazon review, 2 stars" },
      { theme: "Packaging difficult to squeeze", verbatim: "\"The tube is too rigid, can't get the last 20% out without cutting it open.\" — Walmart review, 3 stars" },
    ],
  },
  "SKU002": {
    positive: ["Reduced sensitivity quickly", "Good taste for sensitive formula", "Dentist recommended"],
    negative: [
      { theme: "Doesn't work as advertised", verbatim: "\"Been using for 4 weeks, still can't eat ice cream without pain. Going back to Sensodyne.\" — Target review, 1 star" },
      { theme: "Packaging complaints in Southwest", verbatim: "\"Cap broke off in my bag. Third tube this has happened to. Quality control issue?\" — Reddit r/oralcare" },
      { theme: "Price too high vs Sensodyne", verbatim: "\"$7.49 when Sensodyne is $5.99 and actually works? No thanks.\" — Kroger review, 2 stars" },
      { theme: "Flavor is medicinal", verbatim: "\"Tastes like a dentist's office. My kids refuse to use it even though they need it.\" — @momof3dental" },
    ],
  },
  "SKU003": {
    positive: ["Good cavity protection", "Affordable family option", "Classic BrightSmile taste", "Kids don't complain about it", "Reliable daily use"],
    negative: [
      { theme: "Nothing special vs store brand", verbatim: "\"What's the difference between this and the $2 store brand? Same fluoride, 2x the price.\" — CVS review, 3 stars" },
      { theme: "Hard to find in some stores", verbatim: "\"My local Walmart hasn't had this in stock for 3 weeks. Had to order online.\" — Facebook comment" },
    ],
  },
  "SKU004": {
    positive: ["Kids love the flavor", "Fun character on tube", "Good for picky brushers", "Parents trust BrightSmile brand", "Gentle on young teeth"],
    negative: [
      { theme: "Flavor wears off too fast", verbatim: "\"My 4-year-old says it stops tasting good after 10 seconds. She won't finish brushing.\" — Target review, 3 stars" },
      { theme: "Cap is hard for small hands", verbatim: "\"The flip cap is too stiff for my 3-year-old to open by himself. Defeats the independence goal.\" — Amazon review, 3 stars" },
    ],
  },
};
