-- Colgate v2 Product Launch Demo - Dynamic Tables
-- Creates all 10 Dynamic Tables (requires AICOLLEGE warehouse)

USE DATABASE SKU_LAUNCH;
USE WAREHOUSE AICOLLEGE;

----------------------------------------------------------------------
-- INVENTORY
----------------------------------------------------------------------

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
WITH latest_inventory AS (
  SELECT dc_id, sku_id, snapshot_date, units_on_hand, units_allocated, units_available, reorder_point, safety_stock
  FROM SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY
  WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY)
)
SELECT i.dc_id, dc.dc_name, dc.city, dc.state, dc.regions_served, i.sku_id, s.sku_name,
  i.snapshot_date, i.units_on_hand, i.units_allocated, i.units_available, i.reorder_point, i.safety_stock,
  CASE WHEN i.units_available <= 0 THEN 'Out of Stock'
       WHEN i.units_available <= i.safety_stock THEN 'Critical'
       WHEN i.units_available <= i.reorder_point THEN 'Low'
       ELSE 'Healthy' END AS inventory_status,
  ROUND(i.units_available / NULLIF(i.reorder_point, 0) * 100, 1) AS pct_of_reorder_point
FROM latest_inventory i
JOIN SKU_LAUNCH.INVENTORY.DIM_DISTRIBUTION_CENTERS dc ON i.dc_id = dc.dc_id
JOIN SKU_LAUNCH.INVENTORY.DIM_SKU s ON i.sku_id = s.sku_id;

----------------------------------------------------------------------
-- SKU_SALES
----------------------------------------------------------------------

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
SELECT s.sku_id, s.sku_name, s.variant, s.is_new_launch, p.region, p.week_ending,
  WEEKOFYEAR(p.week_ending) AS week_number, p.sales_units AS actual_units,
  p.sales_dollars AS actual_revenue, p.avg_price, p.distribution_pct,
  f.forecast_units,
  p.sales_units - f.forecast_units AS variance_units,
  ROUND((p.sales_units - f.forecast_units) / NULLIF(f.forecast_units, 0) * 100, 2) AS variance_pct,
  CASE WHEN p.sales_units >= f.forecast_units * 1.05 THEN 'Above Forecast'
       WHEN p.sales_units >= f.forecast_units * 0.95 THEN 'On Track'
       WHEN p.sales_units >= f.forecast_units * 0.85 THEN 'Below Forecast'
       ELSE 'Critical' END AS performance_status,
  p.price_compliance_pct,
  p.price_index,
  p.actual_stores,
  p.planned_stores
FROM SKU_LAUNCH.SKU_SALES.RAW_OF_WEEKLY_SYNDICATED_POS p
JOIN SKU_LAUNCH.SKU_SALES.DIM_SKU s ON p.sku_id = s.sku_id
LEFT JOIN SKU_LAUNCH.SKU_SALES.PRELAUNCH_FORECAST f
  ON p.sku_id = f.sku_id AND p.region = f.region AND WEEKOFYEAR(p.week_ending) = f.week_number
WHERE s.is_new_launch = TRUE;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.SKU_SALES.CURATED_DT_REGIONAL_VARIANCE
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
WITH regional_totals AS (
  SELECT sku_id, region, SUM(actual_units) AS total_actual, SUM(forecast_units) AS total_forecast, COUNT(DISTINCT week_ending) AS weeks_reported
  FROM SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE GROUP BY sku_id, region
), national_avg AS (
  SELECT sku_id, AVG(total_actual) AS avg_actual, AVG(total_forecast) AS avg_forecast FROM regional_totals GROUP BY sku_id
)
SELECT r.sku_id, s.sku_name, r.region, r.total_actual, r.total_forecast,
  r.total_actual - r.total_forecast AS total_variance,
  ROUND((r.total_actual - r.total_forecast) / NULLIF(r.total_forecast, 0) * 100, 2) AS variance_pct,
  n.avg_actual AS national_avg_actual,
  ROUND((r.total_actual - n.avg_actual) / NULLIF(n.avg_actual, 0) * 100, 2) AS vs_national_pct,
  CASE WHEN r.total_actual > n.avg_actual * 1.10 THEN 'Outperforming'
       WHEN r.total_actual < n.avg_actual * 0.90 THEN 'Underperforming'
       ELSE 'Average' END AS regional_status,
  r.weeks_reported
FROM regional_totals r
JOIN national_avg n ON r.sku_id = n.sku_id
JOIN SKU_LAUNCH.SKU_SALES.DIM_SKU s ON r.sku_id = s.sku_id;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
SELECT st.store_id, st.retailer, st.region, st.state, st.city, st.latitude, st.longitude,
  p.sku_id, sk.sku_name,
  SUM(p.units_sold) AS total_units_sold,
  ROUND(AVG(p.inventory_on_hand), 1) AS avg_inventory,
  SUM(CASE WHEN p.out_of_stock_flag THEN 1 ELSE 0 END) AS oos_days,
  COUNT(DISTINCT p.sale_date) AS days_with_data
FROM SKU_LAUNCH.SKU_SALES.RAW_OF_DAILY_STORE_POS p
JOIN SKU_LAUNCH.SKU_SALES.DIM_STORES st ON p.store_id = st.store_id
JOIN SKU_LAUNCH.SKU_SALES.DIM_SKU sk ON p.sku_id = sk.sku_id
WHERE sk.is_new_launch = TRUE
GROUP BY st.store_id, st.retailer, st.region, st.state, st.city, st.latitude, st.longitude, p.sku_id, sk.sku_name;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
WITH weekly_data AS (
  SELECT
    c.sku_id,
    s.sku_name,
    s.variant,
    WEEKOFYEAR(c.first_purchase_date) AS week_number,
    COUNT(DISTINCT c.consumer_id) AS weekly_new_buyers,
    SUM(CASE WHEN c.is_repeat THEN 1 ELSE 0 END) AS weekly_repeat_buyers,
    AVG(c.purchase_count) AS avg_purchases
  FROM SKU_LAUNCH.SKU_SALES.CONSUMER_PURCHASE c
  JOIN SKU_LAUNCH.SKU_SALES.DIM_SKU s ON c.sku_id = s.sku_id
  WHERE s.is_new_launch = TRUE
  GROUP BY c.sku_id, s.sku_name, s.variant, WEEKOFYEAR(c.first_purchase_date)
)
SELECT
  w.sku_id,
  w.sku_name,
  w.variant,
  w.week_number,
  w.weekly_new_buyers,
  SUM(w.weekly_new_buyers) OVER (PARTITION BY w.sku_id ORDER BY w.week_number) AS cumulative_trial_hh,
  w.weekly_repeat_buyers,
  ROUND(w.weekly_repeat_buyers / NULLIF(w.weekly_new_buyers, 0) * 100, 2) AS repeat_rate_weekly,
  ROUND(w.avg_purchases, 2) AS buy_rate,
  f.trial_forecast,
  f.repeat_rate_forecast,
  ROUND((SUM(w.weekly_new_buyers) OVER (PARTITION BY w.sku_id ORDER BY w.week_number) - f.trial_forecast) / NULLIF(f.trial_forecast, 0) * 100, 1) AS trial_variance_pct,
  CASE WHEN SUM(w.weekly_new_buyers) OVER (PARTITION BY w.sku_id ORDER BY w.week_number) >= f.trial_forecast * 1.02 THEN 'Ahead of Forecast'
       WHEN SUM(w.weekly_new_buyers) OVER (PARTITION BY w.sku_id ORDER BY w.week_number) >= f.trial_forecast * 0.98 THEN 'On Track'
       ELSE 'Behind Forecast' END AS trial_status
FROM weekly_data w
LEFT JOIN SKU_LAUNCH.SKU_SALES.CONSUMER_FORECAST f ON w.sku_id = f.sku_id;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS
  lag = '1 hour' refresh_mode = 'AUTO' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
SELECT
  p.promo_id,
  p.sku_id,
  s.sku_name,
  p.retailer,
  p.week_number,
  p.promo_type,
  p.planned,
  p.executed,
  p.lift_pct,
  p.investment_usd,
  p.incremental_units
FROM SKU_LAUNCH.SKU_SALES.RAW_OF_PROMO_EVENTS p
JOIN SKU_LAUNCH.SKU_SALES.DIM_SKU s ON p.sku_id = s.sku_id
WHERE s.is_new_launch = TRUE;

----------------------------------------------------------------------
-- DISTRIBUTION
----------------------------------------------------------------------

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.DISTRIBUTION.CURATED_DT_STORE_GEOSPATIAL
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
WITH dc_locations AS (
  SELECT 'DC_EAST' AS dc_id, ST_MAKEPOINT(-75.1652, 39.9526) AS geo_point UNION ALL
  SELECT 'DC_WEST', ST_MAKEPOINT(-118.2437, 34.0522) UNION ALL
  SELECT 'DC_CENTRAL', ST_MAKEPOINT(-95.3698, 29.7604)
), stores_with_geo AS (
  SELECT store_id, retailer, region, state, city, latitude, longitude,
    ST_MAKEPOINT(longitude, latitude) AS store_geo_point
  FROM SKU_LAUNCH.DISTRIBUTION.DIM_STORES
)
SELECT s.store_id, s.retailer, s.region, s.state, s.city, s.latitude, s.longitude, s.store_geo_point,
  ROUND(ST_DISTANCE(s.store_geo_point, dc_east.geo_point) / 1609.34, 1) AS distance_to_dc_east_miles,
  ROUND(ST_DISTANCE(s.store_geo_point, dc_west.geo_point) / 1609.34, 1) AS distance_to_dc_west_miles,
  ROUND(ST_DISTANCE(s.store_geo_point, dc_central.geo_point) / 1609.34, 1) AS distance_to_dc_central_miles,
  CASE WHEN ST_DISTANCE(s.store_geo_point, dc_east.geo_point) <= ST_DISTANCE(s.store_geo_point, dc_west.geo_point)
            AND ST_DISTANCE(s.store_geo_point, dc_east.geo_point) <= ST_DISTANCE(s.store_geo_point, dc_central.geo_point) THEN 'DC_EAST'
       WHEN ST_DISTANCE(s.store_geo_point, dc_west.geo_point) <= ST_DISTANCE(s.store_geo_point, dc_central.geo_point) THEN 'DC_WEST'
       ELSE 'DC_CENTRAL' END AS nearest_dc
FROM stores_with_geo s
CROSS JOIN (SELECT geo_point FROM dc_locations WHERE dc_id = 'DC_EAST') dc_east
CROSS JOIN (SELECT geo_point FROM dc_locations WHERE dc_id = 'DC_WEST') dc_west
CROSS JOIN (SELECT geo_point FROM dc_locations WHERE dc_id = 'DC_CENTRAL') dc_central;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
SELECT s.shipment_id, s.plant_id, p.plant_name, s.dc_id, dc.dc_name, s.sku_id, sk.sku_name,
  s.units_shipped, s.ship_date, s.expected_arrival_date, s.actual_arrival_date,
  s.carrier_name, s.shipment_status, s.freight_cost,
  CASE WHEN s.shipment_status = 'In Transit' THEN s.units_shipped ELSE 0 END AS units_in_transit,
  CASE WHEN s.actual_arrival_date > s.expected_arrival_date THEN DATEDIFF('day', s.expected_arrival_date, s.actual_arrival_date)
       WHEN s.shipment_status = 'Delayed' THEN DATEDIFF('day', s.expected_arrival_date, CURRENT_DATE())
       ELSE 0 END AS days_delayed
FROM SKU_LAUNCH.DISTRIBUTION.RAW_OF_DC_SHIPMENTS s
JOIN SKU_LAUNCH.DISTRIBUTION.DIM_MANUFACTURING_PLANTS p ON s.plant_id = p.plant_id
JOIN SKU_LAUNCH.DISTRIBUTION.DIM_DISTRIBUTION_CENTERS dc ON s.dc_id = dc.dc_id
JOIN SKU_LAUNCH.DISTRIBUTION.DIM_SKU sk ON s.sku_id = sk.sku_id;

----------------------------------------------------------------------
-- CONSUMER_INSIGHTS
----------------------------------------------------------------------

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_CALL_TRANSCRIPTS
  IMMUTABLE WHERE (call_date < CURRENT_DATE() - INTERVAL '1 day')
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
WITH base AS (
  SELECT call_id, call_date, audio_file_path, transcript_text
  FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS
  WHERE transcript_text IS NOT NULL
)
SELECT
  call_id,
  call_date,
  audio_file_path,
  transcript_text,
  SNOWFLAKE.CORTEX.SENTIMENT(transcript_text) AS sentiment_score,
  CASE
    WHEN SNOWFLAKE.CORTEX.SENTIMENT(transcript_text) > 0.3 THEN 'positive'
    WHEN SNOWFLAKE.CORTEX.SENTIMENT(transcript_text) < -0.3 THEN 'negative'
    ELSE 'neutral'
  END AS sentiment_label,
  SNOWFLAKE.CORTEX.CLASSIFY_TEXT(
    transcript_text,
    ['packaging issue','product quality','price concern','effectiveness','taste/flavor','recommendation','general feedback']
  )['label']::VARCHAR AS topic_category,
  SNOWFLAKE.CORTEX.CLASSIFY_TEXT(
    transcript_text,
    ['packaging issue','product quality','price concern','effectiveness','taste/flavor','recommendation','general feedback']
  )['score']::FLOAT AS topic_confidence
FROM base;

CREATE OR REPLACE DYNAMIC TABLE SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS
  lag = '1 hour' refresh_mode = 'FULL' initialize = 'ON_CREATE' warehouse = AICOLLEGE
AS
SELECT post_id, platform, sku_id, post_date, content,
  SNOWFLAKE.CORTEX.SENTIMENT(content) AS sentiment_score,
  CASE WHEN SNOWFLAKE.CORTEX.SENTIMENT(content) > 0.3 THEN 'positive'
       WHEN SNOWFLAKE.CORTEX.SENTIMENT(content) < -0.3 THEN 'negative'
       ELSE 'neutral' END AS sentiment_label,
  SNOWFLAKE.CORTEX.CLASSIFY_TEXT(content,
    ['packaging issue','product quality','price concern','effectiveness','taste/flavor','recommendation','general feedback']
  )['label']::STRING AS topic_category,
  SNOWFLAKE.CORTEX.CLASSIFY_TEXT(content,
    ['packaging issue','product quality','price concern','effectiveness','taste/flavor','recommendation','general feedback']
  )['score']::FLOAT AS topic_confidence,
  nps_score,
  social_score,
  _loaded_at
FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK;
