-- CPG Brand Product Launch Demo - Cortex Agent
-- Creates the Product Launch Agent in Snowflake Intelligence
-- Uses current CREATE AGENT spec format (tool_spec/tool_resources with execution_environment)

USE ROLE ACCOUNTADMIN;

CREATE OR REPLACE AGENT SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT
FROM SPECIFICATION $$
tools:
  - tool_spec:
      type: cortex_analyst_text_to_sql
      name: InventoryAnalyst
      description: Analyzes DC inventory levels, stock health, reorder points, and supply chain issues
  - tool_spec:
      type: cortex_analyst_text_to_sql
      name: SalesAnalyst
      description: Analyzes SKU sales performance, regional variance, store metrics, consumer trial/repeat, pricing compliance, ML forecasts, and promotional effectiveness
  - tool_spec:
      type: cortex_analyst_text_to_sql
      name: LogisticsAnalyst
      description: Analyzes distribution logistics, geospatial store-to-DC distances, shipment tracking, and DC backup options
  - tool_spec:
      type: cortex_analyst_text_to_sql
      name: SentimentAnalyst
      description: Analyzes consumer sentiment from AI-classified call transcripts and social media posts with NPS and social scores
  - tool_spec:
      type: cortex_search
      name: FeedbackSearch
      description: Searches call transcripts and social media posts for qualitative consumer feedback
tool_resources:
  InventoryAnalyst:
    semantic_view: SKU_LAUNCH.INVENTORY.SV_INVENTORY_SEMANTICS
    execution_environment:
      type: warehouse
      warehouse: SKU_LAUNCH_WH
  SalesAnalyst:
    semantic_view: SKU_LAUNCH.SKU_SALES.SV_SKU_SALES_SEMANTICS
    execution_environment:
      type: warehouse
      warehouse: SKU_LAUNCH_WH
  LogisticsAnalyst:
    semantic_view: SKU_LAUNCH.DISTRIBUTION.SV_DISTRIBUTION_LOGISTICS
    execution_environment:
      type: warehouse
      warehouse: SKU_LAUNCH_WH
  SentimentAnalyst:
    semantic_view: SKU_LAUNCH.CONSUMER_INSIGHTS.SV_CONSUMER_INSIGHTS
    execution_environment:
      type: warehouse
      warehouse: SKU_LAUNCH_WH
  FeedbackSearch:
    search_service: SKU_LAUNCH.CONSUMER_INSIGHTS.PRODUCT_LAUNCH_FEEDBACK_SEARCH
$$;

-- Grant access to the agent
GRANT USAGE ON AGENT SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT TO ROLE SKU_LAUNCH_ROLE;
GRANT USAGE ON AGENT SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT TO ROLE PUBLIC;

-- Register agent in Snowflake Intelligence (agents are NOT auto-discovered)
ALTER SNOWFLAKE INTELLIGENCE SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT
  ADD AGENT SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT;

USE ROLE SKU_LAUNCH_ROLE;
