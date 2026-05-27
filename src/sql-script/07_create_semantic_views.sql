-- CPG Brand Product Launch Demo - Semantic Views
-- Creates 4 semantic views for the Cortex Agent tools

USE DATABASE SKU_LAUNCH;

----------------------------------------------------------------------
-- INVENTORY
----------------------------------------------------------------------
USE SCHEMA INVENTORY;

create or replace semantic view SV_INVENTORY_SEMANTICS
	tables (
		DC_INVENTORY as SKU_LAUNCH.INVENTORY.CURATED_DT_DC_INVENTORY_STATUS primary key (DC_ID,SKU_ID) comment='Distribution center inventory levels by SKU'
	)
	facts (
		DC_INVENTORY.UNITS_ON_HAND as units_on_hand comment='Current inventory units at DC',
		DC_INVENTORY.UNITS_ALLOCATED as units_allocated comment='Units allocated to orders',
		DC_INVENTORY.UNITS_AVAILABLE as units_available comment='Available units for new orders',
		DC_INVENTORY.REORDER_POINT as reorder_point comment='Minimum units before reorder',
		DC_INVENTORY.SAFETY_STOCK as safety_stock comment='Safety stock buffer level',
		DC_INVENTORY.PCT_OF_REORDER_POINT as pct_of_reorder_point comment='Percentage of reorder point'
	)
	dimensions (
		DC_INVENTORY.DC_ID as dc_id comment='Distribution center ID',
		DC_INVENTORY.DC_NAME as dc_name comment='Distribution center name',
		DC_INVENTORY.SKU_ID as sku_id comment='SKU identifier',
		DC_INVENTORY.SKU_NAME as sku_name comment='SKU name',
		DC_INVENTORY.INVENTORY_STATUS as inventory_status comment='Inventory health status',
		DC_INVENTORY.SNAPSHOT_DATE as snapshot_date comment='Date of inventory snapshot'
	)
	metrics (
		DC_INVENTORY.TOTAL_AVAILABLE_AT_DC as SUM(units_available) comment='Total available units at DCs',
		DC_INVENTORY.TOTAL_UNITS_AT_DC as SUM(units_on_hand) comment='Total units on hand at DCs'
	)
	comment='DC inventory levels, reorder points, and stock health status'
	ai_verified_queries (
		SOUTHWEST_SUPPLY_ISSUES AS (
 QUESTION 'Tell me more about the Southwest supply chain issues'
 ONBOARDING_QUESTION false
 SQL 'SELECT __dc_inventory.dc_name, __dc_inventory.sku_name, __dc_inventory.units_on_hand, __dc_inventory.units_available, __dc_inventory.inventory_status, __dc_inventory.pct_of_reorder_point FROM __dc_inventory WHERE __dc_inventory.dc_name = ''Los Angeles DC'' ORDER BY __dc_inventory.units_available ASC')
	);

----------------------------------------------------------------------
-- DISTRIBUTION
----------------------------------------------------------------------
USE SCHEMA DISTRIBUTION;

create or replace semantic view SV_DISTRIBUTION_LOGISTICS
	tables (
		STORE_GEO as SKU_LAUNCH.DISTRIBUTION.CURATED_DT_STORE_GEOSPATIAL primary key (STORE_ID) comment='Store geospatial data with distance to nearest DC',
		DC_SHIPMENTS as SKU_LAUNCH.DISTRIBUTION.CURATED_DT_DC_SHIPMENTS_STATUS primary key (SHIPMENT_ID) comment='Shipments to DCs with transit status',
		DC_BACKUP as SKU_LAUNCH.DISTRIBUTION.V_DC_BACKUP_OPTIONS primary key (PRIMARY_DC_ID,BACKUP_DC_ID) comment='DC backup options with geo-distances'
	)
	facts (
		STORE_GEO.DISTANCE_TO_DC_EAST_MILES as DISTANCE_TO_DC_EAST_MILES,
		STORE_GEO.DISTANCE_TO_DC_WEST_MILES as DISTANCE_TO_DC_WEST_MILES,
		STORE_GEO.DISTANCE_TO_DC_CENTRAL_MILES as DISTANCE_TO_DC_CENTRAL_MILES,
		DC_SHIPMENTS.UNITS_SHIPPED as units_shipped,
		DC_SHIPMENTS.UNITS_IN_TRANSIT as units_in_transit,
		DC_SHIPMENTS.FREIGHT_COST as freight_cost,
		DC_SHIPMENTS.DAYS_DELAYED as days_delayed,
		DC_BACKUP.DISTANCE_MILES as distance_miles comment='Distance in miles between primary and backup DC'
	)
	dimensions (
		STORE_GEO.STORE_ID as STORE_ID,
		STORE_GEO.RETAILER as RETAILER,
		STORE_GEO.REGION as REGION,
		STORE_GEO.STATE as STATE,
		STORE_GEO.CITY as CITY,
		STORE_GEO.NEAREST_DC as NEAREST_DC,
		DC_SHIPMENTS.SHIPMENT_ID as shipment_id,
		DC_SHIPMENTS.DC_ID as dc_id,
		DC_SHIPMENTS.DC_NAME as dc_name,
		DC_SHIPMENTS.SKU_ID as sku_id,
		DC_SHIPMENTS.SKU_NAME as sku_name,
		DC_SHIPMENTS.SHIPMENT_STATUS as shipment_status,
		DC_SHIPMENTS.SHIP_DATE as ship_date,
		DC_SHIPMENTS.CARRIER_NAME as carrier_name,
		DC_BACKUP.PRIMARY_DC_ID as primary_dc_id,
		DC_BACKUP.PRIMARY_DC_NAME as primary_dc_name,
		DC_BACKUP.BACKUP_DC_ID as backup_dc_id,
		DC_BACKUP.BACKUP_DC_NAME as backup_dc_name,
		DC_BACKUP.BACKUP_RANK as backup_rank
	)
	metrics (
		DC_SHIPMENTS.TOTAL_IN_TRANSIT as SUM(units_in_transit) comment='Total units currently in transit',
		DC_SHIPMENTS.TOTAL_UNITS_SHIPPED as SUM(units_shipped) comment='Total units shipped'
	)
	comment='Distribution logistics with geospatial store-to-DC distances, shipment tracking, DC backup options'
	ai_verified_queries (
		BACKUP_DC_OPTIONS AS (
 QUESTION 'What backup distribution center options do we have?'
 ONBOARDING_QUESTION false
 SQL 'SELECT __dc_backup.primary_dc_name, __dc_backup.backup_dc_name, __dc_backup.distance_miles, __dc_backup.backup_rank FROM __dc_backup WHERE __dc_backup.primary_dc_id = ''DC003'' ORDER BY __dc_backup.backup_rank')
	);

----------------------------------------------------------------------
-- SKU_SALES
----------------------------------------------------------------------
USE SCHEMA SKU_SALES;

create or replace semantic view SV_SKU_SALES_SEMANTICS
	tables (
		PERFORMANCE as SKU_LAUNCH.SKU_SALES.CURATED_DT_SKU_PERFORMANCE primary key (SKU_ID,REGION,WEEK_ENDING) comment='SKU performance with actual vs forecast, pricing compliance, and store distribution',
		REGIONAL as SKU_LAUNCH.SKU_SALES.CURATED_DT_REGIONAL_VARIANCE primary key (SKU_ID,REGION) comment='Regional variance showing performance vs forecast by region',
		STORES as SKU_LAUNCH.SKU_SALES.CURATED_DT_STORE_PERFORMANCE primary key (STORE_ID,SKU_ID) comment='Store-level performance data',
		CONSUMER_METRICS as SKU_LAUNCH.SKU_SALES.CURATED_DT_CONSUMER_METRICS primary key (SKU_ID,WEEK_NUMBER) comment='Weekly consumer trial and repeat metrics per SKU',
		FORECAST as SKU_LAUNCH.SKU_SALES.ML_SKU_FORECAST primary key (SKU_ID,FORECAST_DATE) comment='ML sales forecast with confidence intervals',
		PROMO_EVENTS as SKU_LAUNCH.SKU_SALES.CURATED_DT_PROMO_EVENTS primary key (PROMO_ID) comment='Promotional events with execution tracking and lift measurement'
	)
	facts (
		PERFORMANCE.ACTUAL_UNITS as actual_units comment='Actual units sold',
		PERFORMANCE.FORECAST_UNITS as forecast_units comment='Forecasted units',
		PERFORMANCE.VARIANCE_PCT as variance_pct comment='Variance from forecast as percentage',
		PERFORMANCE.VARIANCE_UNITS as variance_units comment='Variance from forecast in units',
		PERFORMANCE.ACTUAL_REVENUE as actual_revenue comment='Actual revenue in dollars',
		PERFORMANCE.PRICE_COMPLIANCE_PCT as price_compliance_pct comment='Percentage of stores selling at planned SRP',
		PERFORMANCE.PRICE_INDEX as price_index comment='Actual price divided by planned SRP times 100',
		PERFORMANCE.ACTUAL_STORES as actual_stores comment='Actual number of stores carrying the SKU',
		PERFORMANCE.PLANNED_STORES as planned_stores comment='Planned target store count',
		REGIONAL.TOTAL_ACTUAL as total_actual comment='Total actual units in region',
		REGIONAL.TOTAL_FORECAST as total_forecast comment='Total forecasted units in region',
		REGIONAL.TOTAL_VARIANCE as total_variance comment='Total variance in units',
		REGIONAL.VARIANCE_PCT as REGIONAL.variance_pct comment='Regional variance percentage',
		STORES.AVG_INVENTORY as avg_inventory comment='Average inventory level',
		STORES.OOS_DAYS as oos_days comment='Out of stock days',
		STORES.TOTAL_UNITS_SOLD as total_units_sold comment='Total units sold at store',
		CONSUMER_METRICS.WEEKLY_NEW_BUYERS as weekly_new_buyers comment='New unique buyers in the week',
		CONSUMER_METRICS.CUMULATIVE_TRIAL_HH as cumulative_trial_hh comment='Cumulative trial households to date',
		CONSUMER_METRICS.REPEAT_RATE_WEEKLY as repeat_rate_weekly comment='Weekly repeat purchase rate percentage',
		CONSUMER_METRICS.BUY_RATE as buy_rate comment='Average purchase frequency',
		CONSUMER_METRICS.TRIAL_VARIANCE_PCT as trial_variance_pct comment='Trial vs forecast variance percentage',
		FORECAST.FORECASTED_UNITS as FORECASTED_UNITS,
		FORECAST.LOWER_BOUND as LOWER_BOUND,
		FORECAST.UPPER_BOUND as UPPER_BOUND,
		PROMO_EVENTS.LIFT_PCT as lift_pct comment='Promotional lift percentage',
		PROMO_EVENTS.INVESTMENT_USD as investment_usd comment='Trade spend investment in USD',
		PROMO_EVENTS.INCREMENTAL_UNITS as incremental_units comment='Additional units driven by promotion'
	)
	dimensions (
		PERFORMANCE.REGION as PERFORMANCE.region comment='Geographic region',
		PERFORMANCE.SKU_ID as PERFORMANCE.sku_id comment='SKU identifier',
		PERFORMANCE.SKU_NAME as PERFORMANCE.sku_name comment='Product name',
		PERFORMANCE.WEEK_ENDING as PERFORMANCE.week_ending comment='Week ending date',
		PERFORMANCE.WEEK_NUMBER as PERFORMANCE.week_number comment='Week number of year',
		PERFORMANCE.PERFORMANCE_STATUS as PERFORMANCE.performance_status comment='Performance status',
		REGIONAL.REGION as REGIONAL.region comment='Geographic region',
		REGIONAL.REGIONAL_STATUS as REGIONAL.regional_status comment='Regional performance status',
		REGIONAL.SKU_ID as REGIONAL.sku_id comment='SKU identifier',
		REGIONAL.SKU_NAME as REGIONAL.sku_name comment='Product name',
		STORES.CITY as STORES.city,
		STORES.REGION as STORES.region,
		STORES.RETAILER as STORES.retailer,
		STORES.SKU_ID as STORES.sku_id,
		STORES.SKU_NAME as STORES.sku_name,
		STORES.STATE as STORES.state,
		STORES.STORE_ID as STORES.store_id,
		CONSUMER_METRICS.SKU_ID as CONSUMER_METRICS.sku_id,
		CONSUMER_METRICS.SKU_NAME as CONSUMER_METRICS.sku_name,
		CONSUMER_METRICS.VARIANT as CONSUMER_METRICS.variant,
		CONSUMER_METRICS.WEEK_NUMBER as CONSUMER_METRICS.week_number comment='Week number for consumer metrics',
		CONSUMER_METRICS.TRIAL_STATUS as CONSUMER_METRICS.trial_status,
		FORECAST.SKU_ID as FORECAST.SKU_ID,
		FORECAST.FORECAST_DATE as FORECAST.FORECAST_DATE,
		PROMO_EVENTS.PROMO_ID as PROMO_EVENTS.promo_id,
		PROMO_EVENTS.SKU_ID as PROMO_EVENTS.sku_id,
		PROMO_EVENTS.SKU_NAME as PROMO_EVENTS.sku_name,
		PROMO_EVENTS.RETAILER as PROMO_EVENTS.retailer comment='Retailer for promotional event',
		PROMO_EVENTS.WEEK_NUMBER as PROMO_EVENTS.week_number comment='Week number of promotion',
		PROMO_EVENTS.PROMO_TYPE as PROMO_EVENTS.promo_type comment='Promotion type',
		PROMO_EVENTS.EXECUTED as PROMO_EVENTS.executed comment='Whether the promotion was executed'
	)
	metrics (
		PERFORMANCE.TOTAL_ACTUAL_UNITS as SUM(actual_units) comment='Total actual units sold',
		PERFORMANCE.TOTAL_FORECAST_UNITS as SUM(forecast_units) comment='Total forecasted units',
		PERFORMANCE.TOTAL_REVENUE as SUM(actual_revenue) comment='Total actual revenue',
		PERFORMANCE.AVG_VARIANCE_PCT as ROUND(AVG(variance_pct), 2) comment='Average variance percentage',
		PERFORMANCE.AVG_PRICE_COMPLIANCE as ROUND(AVG(price_compliance_pct), 1) comment='Average pricing compliance rate',
		PERFORMANCE.AVG_DISTRIBUTION_STORES as ROUND(AVG(actual_stores), 0) comment='Average store distribution count',
		FORECAST.TOTAL_FORECASTED as SUM(FORECASTED_UNITS),
		PROMO_EVENTS.TOTAL_INVESTMENT as SUM(investment_usd) comment='Total promotional investment in USD',
		PROMO_EVENTS.AVG_LIFT as ROUND(AVG(lift_pct), 1) comment='Average promotional lift percentage',
		PROMO_EVENTS.TOTAL_INCREMENTAL_UNITS as SUM(incremental_units) comment='Total incremental units from promotions'
	)
	comment='SKU sales performance with ML forecasts, regional variance, store metrics, consumer trial/repeat, pricing compliance, and promotions';

----------------------------------------------------------------------
-- CONSUMER_INSIGHTS
----------------------------------------------------------------------
USE SCHEMA CONSUMER_INSIGHTS;

create or replace semantic view SV_CONSUMER_INSIGHTS
	tables (
		CALL_TRANSCRIPTS as SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_CALL_TRANSCRIPTS primary key (CALL_ID) comment='AI-transcribed and sentiment-analyzed call recordings',
		SOCIAL_SENTIMENT as SKU_LAUNCH.CONSUMER_INSIGHTS.CURATED_DT_SOCIAL_TOPIC_ANALYSIS primary key (POST_ID) comment='Social media sentiment with NPS and social scores'
	)
	facts (
		CALL_TRANSCRIPTS.SENTIMENT_SCORE as CALL_TRANSCRIPTS.sentiment_score,
		CALL_TRANSCRIPTS.TOPIC_CONFIDENCE as CALL_TRANSCRIPTS.topic_confidence,
		SOCIAL_SENTIMENT.SENTIMENT_SCORE as SOCIAL_SENTIMENT.sentiment_score,
		SOCIAL_SENTIMENT.TOPIC_CONFIDENCE as SOCIAL_SENTIMENT.topic_confidence,
		SOCIAL_SENTIMENT.NPS_SCORE as nps_score comment='Net Promoter Score (0-100)',
		SOCIAL_SENTIMENT.SOCIAL_SCORE as social_score comment='Composite social sentiment score (0-100)'
	)
	dimensions (
		CALL_TRANSCRIPTS.CALL_ID as CALL_TRANSCRIPTS.call_id,
		CALL_TRANSCRIPTS.CALL_DATE as CALL_TRANSCRIPTS.call_date,
		CALL_TRANSCRIPTS.SENTIMENT_LABEL as CALL_TRANSCRIPTS.sentiment_label,
		CALL_TRANSCRIPTS.TOPIC_CATEGORY as CALL_TRANSCRIPTS.topic_category,
		SOCIAL_SENTIMENT.POST_ID as SOCIAL_SENTIMENT.post_id,
		SOCIAL_SENTIMENT.PLATFORM as SOCIAL_SENTIMENT.platform,
		SOCIAL_SENTIMENT.SKU_ID as SOCIAL_SENTIMENT.sku_id,
		SOCIAL_SENTIMENT.POST_DATE as SOCIAL_SENTIMENT.post_date,
		SOCIAL_SENTIMENT.SENTIMENT_LABEL as SOCIAL_SENTIMENT.sentiment_label,
		SOCIAL_SENTIMENT.TOPIC_CATEGORY as SOCIAL_SENTIMENT.topic_category
	)
	metrics (
		CALL_TRANSCRIPTS.AVG_CALL_SENTIMENT as AVG(CALL_TRANSCRIPTS.sentiment_score) comment='Average sentiment from call transcripts',
		CALL_TRANSCRIPTS.CALL_COUNT as COUNT(*) comment='Number of calls',
		SOCIAL_SENTIMENT.AVG_SENTIMENT as AVG(SOCIAL_SENTIMENT.sentiment_score),
		SOCIAL_SENTIMENT.POST_COUNT as COUNT(*) comment='Number of social posts',
		SOCIAL_SENTIMENT.AVG_NPS as AVG(nps_score) comment='Average Net Promoter Score',
		SOCIAL_SENTIMENT.AVG_SOCIAL_SCORE as AVG(social_score) comment='Average social sentiment score'
	)
	comment='Consumer sentiment analytics with AI-classified topics, NPS, and social scores from social media and call transcripts';
