# CoCo Deployment Skill: Colgate v2 Product Launch Demo

When the user asks to deploy the Colgate v2 demo, follow these steps in order:

## Step 1: Run Prerequisites Check
Execute `src/sql-script/00_prerequisites.sql` to verify Cortex AI, SPCS, and geospatial are available.

## Step 2: Setup Infrastructure
Execute `src/sql-script/01_setup_infra.sql`.
**Important**: Update the network rule host value to match the target account's host (e.g., `<account>.snowflakecomputing.com:443`).

## Step 3: Create Tables
Execute `src/sql-script/02_create_tables.sql`.

## Step 4: Upload Data to Stages
Run these commands to upload seed data:
```
snow stage copy data/inventory/ @SKU_LAUNCH.INVENTORY.RAW_FILES/seed/ --recursive
snow stage copy data/sku_sales/ @SKU_LAUNCH.SKU_SALES.RAW_FILES/seed/ --recursive
snow stage copy data/distribution/ @SKU_LAUNCH.DISTRIBUTION.RAW_FILES/seed/ --recursive
snow stage copy data/consumer_insights/ @SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_FILES/seed/ --recursive
snow stage copy audio/calls/ @SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_AUDIO/calls/ --recursive
```

## Step 5: Load Data
Execute `src/sql-script/03_load_data.sql`.
Verify row counts match:
- RAW_OF_DAILY_STORE_POS: 1,680,001 rows
- DIM_STORES: 2,500 rows
- CONSUMER_PURCHASE: 7,900 rows

## Step 6: Create Dynamic Tables
Execute `src/sql-script/04_create_dynamic_tables.sql`.
Wait for initial refresh to complete (check with `SHOW DYNAMIC TABLES IN DATABASE SKU_LAUNCH`).

## Step 7: Create Views
Execute `src/sql-script/05_create_views.sql`.

## Step 8: Create Cortex Search
Execute `src/sql-script/06_create_cortex_search.sql`.
Verify: `SHOW CORTEX SEARCH SERVICES IN DATABASE SKU_LAUNCH` should show 1 service.

## Step 9: Create Semantic Views
Execute `src/sql-script/07_create_semantic_views.sql`.
Verify: `SHOW SEMANTIC VIEWS IN DATABASE SKU_LAUNCH` should show 4 views.

## Step 10: Create Agent
Execute `src/sql-script/08_create_agent.sql`.
If DDL fails, instruct the user to create the agent manually via Snowflake Intelligence UI with:
- Name: PRODUCT_LAUNCH_AGENT
- 4 Cortex Analyst tools (one per semantic view)
- 1 Cortex Search tool (PRODUCT_LAUNCH_FEEDBACK_SEARCH)

## Step 11: Deploy SPCS Dashboard
1. Ensure Docker is running
2. Get registry URL: `SHOW IMAGE REPOSITORIES IN SCHEMA SKU_LAUNCH.INVENTORY`
3. Login: `snow spcs image-registry login`
4. Build: `docker build --platform linux/amd64 -t <registry>/colgate-launch-react:latest src/react-dashboard/`
5. Push: `docker push <registry>/colgate-launch-react:latest`
6. Update SNOWFLAKE_ACCOUNT env var in `09_deploy_spcs.sql` to target account
7. Execute `src/sql-script/09_deploy_spcs.sql`
8. Get endpoint: `SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.COLGATE_LAUNCH_DASHBOARD`

## Step 12: Verification
- Visit the SPCS endpoint URL
- Verify Executive Summary loads with data
- Test Agent chat with: "Give me a 12-week performance review for our new product launch"
- Confirm all 4 data domains respond (sales, inventory, distribution, sentiment)

## Troubleshooting
- **DT not refreshing**: Check warehouse AICOLLEGE is running
- **Cortex Search empty**: Ensure RAW_OF_CALL_TRANSCRIPTS has transcript_text values
- **Agent not responding**: Verify semantic views exist and agent tools reference correct FQNs
- **SPCS 403**: Check EAI allows egress to account host, verify token at /snowflake/session/token
