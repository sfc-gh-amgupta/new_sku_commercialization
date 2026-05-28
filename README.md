# New SKU Commercialization - CPG Brand Product Launch

A complete Snowflake demo featuring a Cortex Agent for CPG new product innovation commercialization review. Monitors SKU launch performance across sales velocity, inventory health, distribution logistics, and consumer sentiment — with a React dashboard on SPCS and conversational analytics via Snowflake Intelligence.

## Architecture Overview

```
+-------------------------------------------------------------------+
|  React Dashboard (SPCS)                                           |
|  Next.js 14 - SQL API - Agent SSE Streaming                      |
+-------------------------------+-----------------------------------+
                                |
+-------------------------------v-----------------------------------+
|  Cortex Agent: PRODUCT_LAUNCH_AGENT                               |
|  5 Tools: Sales - Inventory - Logistics - Sentiment - Search      |
+-------------------------------+-----------------------------------+
                                |
+-------------------------------v-----------------------------------+
|  4 Semantic Views (Cortex Analyst)                                |
|  SV_SKU_SALES - SV_INVENTORY - SV_DISTRIBUTION - SV_CONSUMER     |
+-------------------------------+-----------------------------------+
                                |
+-------------------------------v-----------------------------------+
|  10 Dynamic Tables + 1 Cortex Search Service                      |
|  Cortex SENTIMENT - CLASSIFY_TEXT - ST_DISTANCE                   |
+-------------------------------+-----------------------------------+
                                |
+-------------------------------v-----------------------------------+
|  19 Source Tables (DIM + RAW) - 205 Audio Files                   |
|  Database: SKU_LAUNCH (4 schemas)                                 |
+-------------------------------------------------------------------+
```

## Solution Overview

CPG brands investing in new product innovation need a structured 12-week post-launch performance review to determine whether adjustments are needed for the remainder of the year. This review spans syndicated POS sales data, retailer store-level insights, distribution center inventory, consumer trial/repeat metrics, and qualitative feedback from social media and call center transcripts.

This demo positions Snowflake as the unified intelligence platform for commercialization analytics. A Cortex Agent orchestrates across four semantic views (Sales, Inventory, Distribution, Consumer Insights), enriched by Dynamic Tables with Cortex AI functions (SENTIMENT, CLASSIFY_TEXT), geospatial distance calculations, and a Cortex Search service over call transcripts and social posts. The React dashboard on SPCS provides an executive-facing visual layer with embedded agent chat.

## Expected Business Outcomes

By deploying this solution, CPG brands can identify underperforming SKUs within the first 12 weeks and trace root causes across the supply chain, detect out-of-stock situations before they impact retailer scorecards, correlate consumer sentiment from social and call center data with sales velocity to explain regional performance gaps, and make data-driven decisions on production adjustments, distribution reallocation, and packaging changes — all through natural language conversations with a unified Cortex Agent.

## Solution Capabilities

| Key Business Capability | Required Technology Component | Enabling Snowflake Feature(s) |
|------------------------|-------------------------------|-------------------------------|
| Syndicated POS Performance Tracking | Weekly/daily sales aggregation with forecast variance | Dynamic Tables, Cortex Analyst, Semantic Views |
| Regional Variance Analysis | Geographic drill-down from national to region to store | Geospatial Functions (ST_DISTANCE), Semantic Views |
| Supply Chain Visibility | DC inventory, shipment tracking, reorder analysis | Dynamic Tables, Cortex Analyst |
| Consumer Trial & Repeat Analysis | Shopper card metrics with forecast comparison | Dynamic Tables, Semantic Views |
| Sentiment Intelligence | AI-classified call transcripts and social posts | Cortex SENTIMENT, CLASSIFY_TEXT, Cortex Search |
| Conversational Analytics | Natural language queries across all data domains | Cortex Agent, Snowflake Intelligence |
| Real-Time Executive Dashboard | Visual KPIs with embedded agent chat | SPCS (React/Next.js), SQL API |
| Live Data Ingestion (Optional) | Incremental streaming into RAW tables | Openflow (NiFi-based) |

## Snowflake Features Role in the Solution

| Workload | Feature | Role in Solution |
|----------|---------|-----------------|
| **AI/ML** | Cortex Agent | 5-tool orchestration across sales, inventory, distribution, sentiment, and search |
| | Cortex Analyst | Text-to-SQL over 4 semantic views for structured data queries |
| | Cortex Search | Semantic search over call transcripts and social media feedback |
| | SENTIMENT (AI SQL) | Continuous sentiment scoring in Dynamic Tables |
| | CLASSIFY_TEXT (AI SQL) | Topic categorization of unstructured feedback |
| **Horizon** | Semantic Views | Business-friendly data model enabling natural language analytics |
| **Data Engineering** | Dynamic Tables | 10 curated tables with AI enrichment, geospatial joins, and forecast comparisons |
| | Git Integration | Source-controlled SQL deployment from GitHub |
| **Geospatial** | ST_DISTANCE, ST_MAKEPOINT | Store-to-DC distance calculations for logistics analysis |
| **Apps** | SPCS (React/Next.js) | Executive dashboard with agent chat, deployed as containerized service |
| **Ingestion** | Openflow (Optional) | NiFi-based incremental data streaming into RAW tables |

## Solution Walkthrough

### Business Scenario: New Product Innovation Commercialization Review

**Setting**: 12-week post-launch performance review of 2 new oral care products. The team needs to assess whether adjustments are required for the remainder of the year.

**Key Personas**: CMO, VP of Innovation, VP of Sales, Director of Insights, Director of Supply Chain

### Scene 1: Executive Dashboard

Open the SPCS dashboard URL. The executive summary shows portfolio-wide KPIs: revenue vs. forecast, SKU health scores, distribution build, and recommended next actions across all 4 launched SKUs.

### Scene 2: Conversational Analytics via Snowflake Intelligence

Open Snowflake Intelligence and select the Product Launch Agent. Run these prompts in sequence:

| # | Prompt | What It Showcases | Expected Insight |
|---|--------|-------------------|-----------------|
| 1 | *How are SKUs performing for the latest launch cycle? Show me the data per SKU.* | SalesAnalyst: Weekly syndicated POS vs. prelaunch forecast at Total US level | SKU1 on pace vs. forecast; SKU2 lagging behind |
| 2 | *What regions are showing the biggest variance from the national forecast for the underperforming SKU?* | SalesAnalyst: Regional drill-down with variance analysis | Most regions within 10% variance; Southwest is the exception |
| 3 | *Can we look at the store level data for Kroger in the region with the most variance to see if there are demand and/or stock issues?* | SalesAnalyst: Daily store-level data from retailer | 750 stores confirmed; SW velocities highest nationally during promo weeks 9-11; 50 stores showing zero sales last 4 days for SKU1 (potential OOS) |
| 4 | *Examine the total quantities of shipment to the DC and inventory count at the DC for SKU 1 and 2.* | InventoryAnalyst + LogisticsAnalyst: Supply chain visibility | Confirms OOS situation for SKU1; shipments adjusted for higher velocities |
| 5 | *Can you look into the consumer purchase data to see if this is backed up for SKU 1 and 2?* | SalesAnalyst: Consumer trial/repeat metrics | SKU1 ahead on trial/repeat forecasts; SKU2 healthy trial but soft repeat (packaging issue) |
| 6 | *Do we have any consumer feedback?* | FeedbackSearch + SentimentAnalyst: Qualitative insights | SKU1: positive flavor reviews (esp. SE region); SKU2: packaging complaints in 40%+ of call transcripts |

### Scene 3: Under the Hood

Walk through the Snowflake objects powering the agent:

1. **Semantic Views** — 4 views (`sql-script/07_create_semantic_views.sql`) giving Cortex Analyst a business-friendly model over sales, inventory, distribution, and consumer data
2. **Dynamic Tables** — 10 tables (`sql-script/04_create_dynamic_tables.sql`) with Cortex SENTIMENT, CLASSIFY_TEXT, and geospatial enrichment
3. **Cortex Search** — PRODUCT_LAUNCH_FEEDBACK_SEARCH service with INCREMENTAL refresh over transcripts and social posts

### Scene 4: Openflow Live Ingestion (Optional)

If Openflow is enabled, show the 5 NiFi process groups streaming incremental data into RAW tables — simulating production data feeds from retailers, DCs, and social platforms.

## Prerequisites

- **Snowflake account** with ACCOUNTADMIN role
- **Cortex AI** enabled (SENTIMENT, CLASSIFY_TEXT) — enable cross-region: `ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';`
- **SPCS** (Snowpark Container Services) enabled
- **Cortex Search** enabled
- **Cortex Agent** / Snowflake Intelligence enabled
- **Docker Desktop** installed and running (for building the React app image)
- **Snowflake CLI** (`snow`) installed

## 1-Prompt CoCo Deployment

```
deploy demo for the skill at https://github.com/sfc-gh-amgupta/new_sku_commercialization
Also create a document of the issues as you deploy using the skill even if you resolve them.
```

## Manual Deployment

### Step 1: Infrastructure
```sql
-- Run src/sql-script/01_setup_infra.sql
-- Creates: SKU_LAUNCH_ROLE, SKU_LAUNCH_WH, database, schemas, stages, compute pool, network rule, EAI
```

### Step 2: Tables
```sql
-- Run src/sql-script/02_create_tables.sql
-- Creates: 19 tables across 4 schemas
```

### Step 3: Load Data
```sql
-- Run src/sql-script/03_load_data.sql
-- Two-step: COPY FILES from git to DATA_STAGE, then COPY INTO tables
-- Also copies 205 MP3 audio files to RAW_AUDIO stage
```

### Step 4: Dynamic Tables
```sql
-- Run src/sql-script/04_create_dynamic_tables.sql
-- Creates: 10 dynamic tables with Cortex AI enrichment
```

### Step 5: Views
```sql
-- Run src/sql-script/05_create_views.sql
```

### Step 6: Cortex Search
```sql
-- Run src/sql-script/06_create_cortex_search.sql
-- Creates: PRODUCT_LAUNCH_FEEDBACK_SEARCH (INCREMENTAL refresh)
```

### Step 7: Semantic Views
```sql
-- Run src/sql-script/07_create_semantic_views.sql
-- Creates: 4 semantic views (Inventory, Sales, Distribution, Consumer Insights)
```

### Step 8: Agent
```sql
-- Run src/sql-script/08_create_agent.sql
-- Creates: PRODUCT_LAUNCH_AGENT (5 tools), grants USAGE, registers in SI
```

### Step 9: React Dashboard (SPCS)
```bash
cd src/react-dashboard

# Login to Snowflake registry
snow spcs image-registry login

# Get registry URL
snow sql -q "SHOW IMAGE REPOSITORIES IN SCHEMA SKU_LAUNCH.INVENTORY"

# Build and push
docker build --platform linux/amd64 -t <registry_url>/sku-launch-dashboard:latest .
docker push <registry_url>/sku-launch-dashboard:latest

# Update SNOWFLAKE_ACCOUNT in 09_deploy_spcs.sql, then run it
```

### Step 10: Verify
```sql
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
```

## Cleanup
```sql
-- Run src/sql-script/99_cleanup.sql
-- Drops: service, compute pool, agent, database, warehouse, role
```

## Object Inventory

| Category | Object | Schema | Type |
|----------|--------|--------|------|
| **Database** | SKU_LAUNCH | - | DATABASE |
| **Schemas** | INVENTORY, SKU_SALES, DISTRIBUTION, CONSUMER_INSIGHTS | - | SCHEMA |
| **Warehouse** | SKU_LAUNCH_WH | - | MEDIUM |
| **Tables** | DIM_DISTRIBUTION_CENTERS, DIM_SKU, RAW_OF_DC_INVENTORY | INVENTORY | TABLE |
| | DIM_SKU, DIM_STORES, RAW_OF_DAILY_STORE_POS, RAW_OF_WEEKLY_SYNDICATED_POS, RAW_OF_PROMO_EVENTS, CONSUMER_PURCHASE, CONSUMER_FORECAST, PRELAUNCH_FORECAST, ML_SKU_FORECAST | SKU_SALES | TABLE |
| | DIM_DISTRIBUTION_CENTERS, DIM_MANUFACTURING_PLANTS, DIM_SKU, DIM_STORES, RAW_OF_DC_SHIPMENTS | DISTRIBUTION | TABLE |
| | RAW_OF_CALL_TRANSCRIPTS, RAW_OF_SOCIAL_MEDIA_FEEDBACK | CONSUMER_INSIGHTS | TABLE |
| **Dynamic Tables** | CURATED_DT_DC_INVENTORY_STATUS | INVENTORY | 1-hour FULL |
| | CURATED_DT_SKU_PERFORMANCE, CURATED_DT_REGIONAL_VARIANCE, CURATED_DT_STORE_PERFORMANCE, CURATED_DT_CONSUMER_METRICS, CURATED_DT_PROMO_EVENTS | SKU_SALES | 1-hour |
| | CURATED_DT_STORE_GEOSPATIAL, CURATED_DT_DC_SHIPMENTS_STATUS | DISTRIBUTION | 1-hour FULL |
| | CURATED_DT_CALL_TRANSCRIPTS, CURATED_DT_SOCIAL_TOPIC_ANALYSIS | CONSUMER_INSIGHTS | 1-hour FULL |
| **Semantic Views** | SV_INVENTORY_SEMANTICS | INVENTORY | SEMANTIC VIEW |
| | SV_SKU_SALES_SEMANTICS | SKU_SALES | SEMANTIC VIEW |
| | SV_DISTRIBUTION_LOGISTICS | DISTRIBUTION | SEMANTIC VIEW |
| | SV_CONSUMER_INSIGHTS | CONSUMER_INSIGHTS | SEMANTIC VIEW |
| **Cortex Search** | PRODUCT_LAUNCH_FEEDBACK_SEARCH | CONSUMER_INSIGHTS | CORTEX SEARCH |
| **Cortex Agent** | PRODUCT_LAUNCH_AGENT (5 tools) | SNOWFLAKE_INTELLIGENCE.AGENTS | AGENT |
| **SPCS** | SKU_LAUNCH_DASHBOARD (React/Next.js) | INVENTORY | SERVICE |
| | SKU_LAUNCH_POOL (CPU_X64_XS) | - | COMPUTE POOL |

## Repository Structure

```
new_sku_commercialization/
├── README.md
├── src/
│   ├── sql-script/              # Numbered deployment SQL scripts (01-09, 99)
│   └── react-dashboard/         # Next.js SPCS app source + Dockerfile
├── data/
│   ├── inventory/               # DC inventory CSVs
│   ├── sku_sales/               # POS, forecast, consumer purchase CSVs
│   ├── distribution/            # Shipments, plants, stores CSVs
│   └── consumer_insights/       # Call transcripts, social feedback CSVs
├── audio/calls/                 # 205 MP3 call recordings
├── openflow/                    # 6 NiFi flow definitions (optional)
├── coco-skill/                  # CoCo automated deployment skill
│   └── deploy.md
└── .snowflake/                  # Skill plugin manifest
```

## Data Summary

| Schema | Table | Rows |
|--------|-------|------|
| INVENTORY | DIM_DISTRIBUTION_CENTERS | 3 |
| INVENTORY | DIM_SKU | 4 |
| INVENTORY | RAW_OF_DC_INVENTORY | 176 |
| SKU_SALES | DIM_SKU | 4 |
| SKU_SALES | DIM_STORES | 2,500 |
| SKU_SALES | RAW_OF_DAILY_STORE_POS | 1,680,001 |
| SKU_SALES | RAW_OF_WEEKLY_SYNDICATED_POS | 336 |
| SKU_SALES | RAW_OF_PROMO_EVENTS | 90 |
| SKU_SALES | CONSUMER_PURCHASE | ~2,000 |
| SKU_SALES | CONSUMER_FORECAST | 4 |
| SKU_SALES | PRELAUNCH_FORECAST | 28 |
| SKU_SALES | ML_SKU_FORECAST | 48 |
| DISTRIBUTION | DIM_DISTRIBUTION_CENTERS | 3 |
| DISTRIBUTION | DIM_MANUFACTURING_PLANTS | 2 |
| DISTRIBUTION | DIM_SKU | 4 |
| DISTRIBUTION | DIM_STORES | 2,500 |
| DISTRIBUTION | RAW_OF_DC_SHIPMENTS | 35 |
| CONSUMER_INSIGHTS | RAW_OF_CALL_TRANSCRIPTS | 200 |
| CONSUMER_INSIGHTS | RAW_OF_SOCIAL_MEDIA_FEEDBACK | 145 |

## Test Questions

| # | Question | Tests |
|---|----------|-------|
| 1 | How are SKUs performing for the latest launch cycle? Show me the data per SKU. | SalesAnalyst: POS vs. forecast comparison |
| 2 | What regions are showing the biggest variance from the national forecast for the underperforming SKU? | SalesAnalyst: Regional variance analysis |
| 3 | Can we look at the store level data for Kroger in the region with the most variance to see if there are demand and/or stock issues? | SalesAnalyst: Store-level drill-down |
| 4 | Examine the total quantities of shipment to the DC and inventory count at the DC for SKU 1 and 2. | InventoryAnalyst + LogisticsAnalyst |
| 5 | Can you look into the consumer purchase data to see if this is backed up for SKU 1 and 2? | SalesAnalyst: Trial/repeat metrics |
| 6 | Do we have any consumer feedback? | FeedbackSearch + SentimentAnalyst |
| 7 | What backup DC options do we have for the Los Angeles DC? | LogisticsAnalyst: Geospatial backup analysis |
| 8 | What are the sentiment scores by topic for BrightSmile Sensitive Pro? | SentimentAnalyst: Topic-level sentiment breakdown |

## License

Apache-2.0
