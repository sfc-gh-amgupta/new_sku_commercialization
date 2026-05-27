# New SKU Commercialization - CPG Brand Product Launch Demo

A complete Snowflake-native solution for monitoring new product (SKU) launches across sales performance, inventory health, distribution logistics, and consumer sentiment. Powered by Cortex AI, Cortex Search, Semantic Views, Dynamic Tables, and a React dashboard deployed on Snowpark Container Services (SPCS).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React Dashboard (SPCS)                                         │
│  Next.js 14 · SQL API · Agent SSE Streaming                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Cortex Agent: PRODUCT_LAUNCH_AGENT                             │
│  5 Tools: Sales · Inventory · Logistics · Sentiment · Search   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  4 Semantic Views (Cortex Analyst)                              │
│  SV_SKU_SALES · SV_INVENTORY · SV_DISTRIBUTION · SV_CONSUMER   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  10 Dynamic Tables + 1 Cortex Search Service                    │
│  Cortex SENTIMENT · CLASSIFY_TEXT · ST_DISTANCE                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  19 Source Tables (DIM + RAW) · 205 Audio Files                 │
│  Database: SKU_LAUNCH (4 schemas)                               │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Snowflake account with:
  - **Cortex AI** enabled (SENTIMENT, CLASSIFY_TEXT)
  - **SPCS** (Snowpark Container Services) enabled
  - **Cortex Search** enabled
  - **Cortex Agent** / Snowflake Intelligence enabled
  - **Geospatial functions** (ST_DISTANCE, ST_MAKEPOINT)
- **Docker** installed locally (for building the React app image)
- **ACCOUNTADMIN** role (or equivalent privileges)

## Quick Start with CoCo

1. Clone this repo and connect CoCo to your Snowflake account
2. Tell CoCo: *"Deploy the CPG Brand demo using the scripts in src/sql-script/"*
3. Or follow the step-by-step below

## Step-by-Step Deployment

### Step 1: Infrastructure
```
Run src/sql-script/01_setup_infra.sql
```
Creates warehouse, database, schemas, stages, compute pool, network rule, EAI.

### Step 2: Tables
```
Run src/sql-script/02_create_tables.sql
```

### Step 3: Upload Data
```bash
# Upload CSVs to stages
snow stage copy data/inventory/ @SKU_LAUNCH.INVENTORY.RAW_FILES/seed/ --recursive
snow stage copy data/sku_sales/ @SKU_LAUNCH.SKU_SALES.RAW_FILES/seed/ --recursive
snow stage copy data/distribution/ @SKU_LAUNCH.DISTRIBUTION.RAW_FILES/seed/ --recursive
snow stage copy data/consumer_insights/ @SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_FILES/seed/ --recursive
snow stage copy audio/calls/ @SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_AUDIO/calls/ --recursive
```

### Step 4: Load Data
```
Run src/sql-script/03_load_data.sql
```

### Step 5: Dynamic Tables
```
Run src/sql-script/04_create_dynamic_tables.sql
```

### Step 6: Views
```
Run src/sql-script/05_create_views.sql
```

### Step 7: Cortex Search
```
Run src/sql-script/06_create_cortex_search.sql
```

### Step 8: Semantic Views
```
Run src/sql-script/07_create_semantic_views.sql
```

### Step 9: Agent
```
Run src/sql-script/08_create_agent.sql
```
If DDL fails, create manually via Snowflake Intelligence UI with the same tool configuration.

### Step 10: React Dashboard (SPCS)
```bash
cd src/react-dashboard

# Get your image registry URL
snow sql -q "SHOW IMAGE REPOSITORIES IN SCHEMA SKU_LAUNCH.INVENTORY"

# Login to Snowflake registry
snow spcs image-registry login

# Build and push
docker build --platform linux/amd64 -t <registry_url>/sku-launch-dashboard:latest .
docker push <registry_url>/sku-launch-dashboard:latest

# Update SNOWFLAKE_ACCOUNT in 09_deploy_spcs.sql, then run it
```

### Step 11: Verify
```sql
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
```
Visit the endpoint URL to see the dashboard.

## Cleanup
```
Run src/sql-script/99_cleanup.sql
```

## Repository Structure

```
├── src/
│   ├── sql-script/           # Numbered deployment SQL scripts
│   └── react-dashboard/      # Next.js SPCS app source + Dockerfile
├── data/                     # Seed data CSVs
├── audio/calls/              # 205 MP3 call recordings
├── coco-skill/               # CoCo automated deployment skill
└── README.md
```

## License

Apache-2.0
