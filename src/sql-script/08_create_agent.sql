-- CPG Brand Product Launch Demo - Cortex Agent
-- Creates the Product Launch Agent in Snowflake Intelligence
-- NOTE: If CREATE AGENT DDL is not available on your account, create via Snowflake Intelligence UI

CREATE AGENT SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT
FROM SPECIFICATION $$
name: Product Launch Agent
description: Analyzes new SKU launch performance across sales, inventory, distribution, and consumer sentiment
tools:
  - tool_type: cortex_analyst_text_to_sql
    name: InventoryAnalyst
    description: Analyzes DC inventory levels, stock health, reorder points, and supply chain issues
    tool_spec:
      semantic_view: SKU_LAUNCH.INVENTORY.SV_INVENTORY_SEMANTICS
  - tool_type: cortex_analyst_text_to_sql
    name: SalesAnalyst
    description: Analyzes SKU sales performance, regional variance, store metrics, consumer trial/repeat, pricing compliance, ML forecasts, and promotional effectiveness
    tool_spec:
      semantic_view: SKU_LAUNCH.SKU_SALES.SV_SKU_SALES_SEMANTICS
  - tool_type: cortex_analyst_text_to_sql
    name: LogisticsAnalyst
    description: Analyzes distribution logistics, geospatial store-to-DC distances, shipment tracking, and DC backup options
    tool_spec:
      semantic_view: SKU_LAUNCH.DISTRIBUTION.SV_DISTRIBUTION_LOGISTICS
  - tool_type: cortex_analyst_text_to_sql
    name: SentimentAnalyst
    description: Analyzes consumer sentiment from AI-classified call transcripts and social media posts with NPS and social scores
    tool_spec:
      semantic_view: SKU_LAUNCH.CONSUMER_INSIGHTS.SV_CONSUMER_INSIGHTS
  - tool_type: cortex_search
    name: FeedbackSearch
    description: Searches call transcripts and social media posts for qualitative consumer feedback
    tool_spec:
      service: SKU_LAUNCH.CONSUMER_INSIGHTS.PRODUCT_LAUNCH_FEEDBACK_SEARCH
$$;
