---
name: deploy_sku_launch_product_launch
description: "Deploy the CPG Brand New SKU Commercialization demo to a Snowflake account. Creates database, tables, Dynamic Tables, Cortex Search, Semantic Views, Cortex Agent, and SPCS React dashboard. Use when: deploy sku launch, setup product launch demo, install sku launch, deploy cpg brand. Triggers: product launch, sku launch, new sku commercialization, cpg brand."
---

# Deploy CPG Brand Product Launch Demo

Fully automated deployment of the CPG Brand New SKU Commercialization demo. Uses git-based data loading via EXECUTE IMMEDIATE and Docker build from source for the SPCS React dashboard.

**Source repo**: `https://github.com/sfc-gh-amgupta/new_sku_commercialization`

## Step 0: Show Object Inventory

Before ANY deployment, present this inventory to the user so they know what will be created:

| Category | Objects | Count |
|----------|---------|-------|
| Database | SKU_LAUNCH | 1 |
| Schemas | INVENTORY, SKU_SALES, DISTRIBUTION, CONSUMER_INSIGHTS | 4 |
| Warehouse | AICOLLEGE (MEDIUM) | 1 |
| Tables | DIM + RAW tables across 4 schemas | 19 |
| Dynamic Tables | Curated DTs with Cortex AI (SENTIMENT, CLASSIFY_TEXT, ST_DISTANCE) | 10 |
| View | V_DC_BACKUP_OPTIONS (geospatial) | 1 |
| Cortex Search | PRODUCT_LAUNCH_FEEDBACK_SEARCH (345 docs) | 1 |
| Semantic Views | SV_INVENTORY, SV_SKU_SALES, SV_DISTRIBUTION, SV_CONSUMER_INSIGHTS | 4 |
| Cortex Agent | PRODUCT_LAUNCH_AGENT (5 tools) | 1 |
| SPCS Service | SKU_LAUNCH_DASHBOARD (Next.js React app) | 1 |
| Compute Pool | SKU_LAUNCH_POOL (CPU_X64_XS) | 1 |
| Image Repository | IMAGE_REPO | 1 |
| Network Rule | SKU_LAUNCH_EGRESS_RULE | 1 |
| External Access Integration | SKU_LAUNCH_EAI | 1 |
| Stages | RAW_FILES (x4), RAW_AUDIO, APP_SPECS | 6 |
| Audio Files | MP3 call recordings | 205 |
| **Total objects** | | **~52** |

**Ask** user: "This will create ~52 objects in your account including a Medium warehouse and SPCS compute pool. Proceed?"

## Step 1: Check Prerequisites

**Check** Docker is available:
```bash
docker --version
```

**If Docker is NOT installed:**
- macOS: Check for Homebrew first:
  ```bash
  brew --version && brew install --cask docker
  ```
  If Homebrew is not available:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- Linux: `curl -fsSL https://get.docker.com | sh`
- After install, remind user to **launch Docker Desktop** and wait for the daemon to start.

**If Docker daemon not running** (common on macOS after install):
```bash
open -a Docker
```
Wait 15-30 seconds, then verify with `docker info`. Retry up to 3 times.

**Check** Snowflake CLI:
```bash
snow --version
```

**Check** Cross-Region Inference (required for Cortex AI functions SENTIMENT, CLASSIFY_TEXT used in Dynamic Tables):
```sql
SHOW PARAMETERS LIKE 'CORTEX_ENABLED_CROSS_REGION' IN ACCOUNT;
```

If the value is NOT `ANY_REGION`:
- **Inform user**: "Cross-region inference is recommended for this demo. The Dynamic Tables use SNOWFLAKE.CORTEX.SENTIMENT() and CLASSIFY_TEXT() which may not be available in all regions natively. Enabling cross-region allows Cortex to route requests to regions where the functions are available. This will run: `ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';` — Proceed?"
- **If user agrees**, run:
```sql
ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';
```
- **If user declines**, warn: "Dynamic Tables with AI functions (CURATED_DT_CALL_TRANSCRIPTS, CURATED_DT_SOCIAL_TOPIC_ANALYSIS) may fail to refresh without cross-region inference."

## Step 2: Cleanup (if re-deploying)

**Ask** user: "Should I clean up any existing SKU_LAUNCH objects first?"

If yes, run cleanup:
```sql
USE ROLE ACCOUNTADMIN;
DROP SERVICE IF EXISTS SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
DROP COMPUTE POOL IF EXISTS SKU_LAUNCH_POOL;
DROP EXTERNAL ACCESS INTEGRATION IF EXISTS SKU_LAUNCH_EAI;
DROP AGENT IF EXISTS SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT;
DROP DATABASE IF EXISTS SKU_LAUNCH;
DROP WAREHOUSE IF EXISTS AICOLLEGE;
```

## Step 3: Create Git Integration and Repository

```sql
USE ROLE ACCOUNTADMIN;
```

```sql
CREATE OR REPLACE API INTEGRATION SKU_LAUNCH_GIT_INTEGRATION
    API_PROVIDER = GIT_HTTPS_API
    API_ALLOWED_PREFIXES = ('https://github.com/sfc-gh-amgupta/')
    ENABLED = TRUE
    COMMENT = 'Integration for CPG Brand Product Launch repository';
```

```sql
CREATE DATABASE IF NOT EXISTS SKU_LAUNCH COMMENT = 'New SKU Commercialization - CPG Brand Product Launch Demo';
CREATE SCHEMA IF NOT EXISTS SKU_LAUNCH.INVENTORY;
```

```sql
CREATE OR REPLACE GIT REPOSITORY SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT
    API_INTEGRATION = SKU_LAUNCH_GIT_INTEGRATION
    ORIGIN = 'https://github.com/sfc-gh-amgupta/new_sku_commercialization.git'
    COMMENT = 'CPG Brand Product Launch source code and data';
```

```sql
ALTER GIT REPOSITORY SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT FETCH;
```

## Step 4: Run SQL Scripts (01-07) via EXECUTE IMMEDIATE

Run each script from the git repository. **Wait for each to complete before proceeding.**

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/01_setup_infra.sql;
```

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/02_create_tables.sql;
```

**IMPORTANT**: Before running 03_load_data.sql, the data must be staged. The load script references data from the git stage directly:

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/03_load_data.sql;
```

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/04_create_dynamic_tables.sql;
```

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/05_create_views.sql;
```

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/06_create_cortex_search.sql;
```

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/07_create_semantic_views.sql;
```

## Step 5: Create Agent

```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/08_create_agent.sql;
```

If DDL fails (some accounts may not support CREATE AGENT), instruct the user to create the agent manually via Snowflake Intelligence UI with:
- Name: PRODUCT_LAUNCH_AGENT
- Location: SNOWFLAKE_INTELLIGENCE.AGENTS
- 4 Cortex Analyst tools (one per semantic view):
  - InventoryAnalyst → SKU_LAUNCH.INVENTORY.SV_INVENTORY_SEMANTICS
  - SalesAnalyst → SKU_LAUNCH.SKU_SALES.SV_SKU_SALES_SEMANTICS
  - LogisticsAnalyst → SKU_LAUNCH.DISTRIBUTION.SV_DISTRIBUTION_LOGISTICS
  - SentimentAnalyst → SKU_LAUNCH.CONSUMER_INSIGHTS.SV_CONSUMER_INSIGHTS
- 1 Cortex Search tool:
  - FeedbackSearch → SKU_LAUNCH.CONSUMER_INSIGHTS.PRODUCT_LAUNCH_FEEDBACK_SEARCH

## Step 6: Build and Push Docker Image

**IMPORTANT**: Build from repo source. NO Docker Hub dependency.

Clone repo and build:
```bash
git clone https://github.com/sfc-gh-amgupta/new_sku_commercialization.git /tmp/sku_launch_deploy
```

```bash
docker build --platform linux/amd64 -t sku-launch-dashboard:latest /tmp/sku_launch_deploy/src/react-dashboard
```

Login to Snowflake image registry (uses active `snow` connection — no Docker Hub login needed):
```bash
snow spcs image-registry login
```

Get registry URL and push:
```bash
snow spcs image-repository url SKU_LAUNCH.INVENTORY.IMAGE_REPO
```

Use the returned URL to tag and push:
```bash
docker tag sku-launch-dashboard:latest <REPO_URL>/sku-launch-dashboard:latest
docker push <REPO_URL>/sku-launch-dashboard:latest
```

Replace `<REPO_URL>` with the actual URL from the previous command. This takes 2-5 minutes.

Verify image uploaded:
```sql
SHOW IMAGES IN IMAGE REPOSITORY SKU_LAUNCH.INVENTORY.IMAGE_REPO;
```

## Step 6b: Deploy SPCS Service

**IMPORTANT**: Before running 09_deploy_spcs.sql, update the `SNOWFLAKE_ACCOUNT` env var in the service spec to match the target account. Detect the account identifier:

```sql
SELECT CURRENT_ACCOUNT_NAME() || '-' || CURRENT_ORGANIZATION_NAME() AS account_locator;
```

Also update the network rule to use the target account's host:
```sql
CREATE OR REPLACE NETWORK RULE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_EGRESS_RULE
  MODE = EGRESS
  TYPE = HOST_PORT
  VALUE_LIST = ('<account_locator>.snowflakecomputing.com:443');
```

Then deploy:
```sql
EXECUTE IMMEDIATE FROM @SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/src/sql-script/09_deploy_spcs.sql;
```

Wait for SPCS service:
```sql
SELECT SYSTEM$GET_SERVICE_STATUS('SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD');
```
If PENDING, wait 30s and retry up to 10 times.

## Step 7: Verify All Objects Against Inventory

Run these verification queries and present results as a pass/fail table:

```sql
USE DATABASE SKU_LAUNCH;

SELECT 'Tables' AS category, COUNT(*) AS found, 19 AS expected
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_CATALOG = 'SKU_LAUNCH' AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
UNION ALL
SELECT 'Dynamic Tables', COUNT(*), 10
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_CATALOG = 'SKU_LAUNCH' AND TABLE_TYPE = 'DYNAMIC TABLE'
UNION ALL
SELECT 'Views', COUNT(*), 1
FROM INFORMATION_SCHEMA.VIEWS
WHERE TABLE_CATALOG = 'SKU_LAUNCH' AND TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA');
```

```sql
SHOW CORTEX SEARCH SERVICES IN DATABASE SKU_LAUNCH;
-- Expected: 1 (PRODUCT_LAUNCH_FEEDBACK_SEARCH)
```

```sql
SHOW SEMANTIC VIEWS IN DATABASE SKU_LAUNCH;
-- Expected: 4
```

```sql
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
-- Expected: 1 endpoint (app, port 3000, public)
```

```sql
SELECT 'INVENTORY.RAW_OF_DC_INVENTORY' AS tbl, COUNT(*) AS rows FROM SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY
UNION ALL SELECT 'SKU_SALES.RAW_OF_DAILY_STORE_POS', COUNT(*) FROM SKU_LAUNCH.SKU_SALES.RAW_OF_DAILY_STORE_POS
UNION ALL SELECT 'SKU_SALES.DIM_STORES', COUNT(*) FROM SKU_LAUNCH.SKU_SALES.DIM_STORES
UNION ALL SELECT 'CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS', COUNT(*) FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS
UNION ALL SELECT 'CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK', COUNT(*) FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK;
-- Expected: 176, 1680001, 2500, 200, 145
```

Present a verification summary table showing:
- Expected vs Found for each object category
- PASS/FAIL status for each
- Data row counts

**Do NOT proceed to Step 8 unless ALL verifications pass.**

## Step 8: End-to-End Test Plan

Test the agent with these questions. Present each question, run it, and report the result.

Run each via the agent (use `snowflake_sql_execute` with timeout_seconds=1200 — the agent orchestrates multiple tools and complex queries can take 30-90s):

```sql
SELECT SNOWFLAKE.CORTEX.DATA_AGENT_RUN(
  'SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT',
  $${"messages": [{"role": "user", "content": [{"type": "text", "text": "YOUR QUESTION"}]}]}$$
);
```

| # | Question | Expected Behavior | Pass Criteria |
|---|----------|-------------------|---------------|
| 1 | Give me a 12-week performance review for our new product launch | SalesAnalyst invoked | Revenue, units, variance data returned |
| 2 | Which region is underperforming the most? | SalesAnalyst + regional data | Specific region identified with variance % |
| 3 | Tell me more about the Southwest supply chain issues | InventoryAnalyst invoked | LA DC inventory status, critical/low items |
| 4 | What backup distribution center options do we have? | LogisticsAnalyst invoked | DC backup options with distances |
| 5 | Can you look into the consumer purchase data to see if this is backed up? | SalesAnalyst consumer metrics | Trial/repeat data returned |
| 6 | Search for consumer feedback about packaging issues | FeedbackSearch invoked | Call transcripts or social posts about packaging |

**After each question**: Check the response contains relevant data. Report pass/fail.

**Only declare deployment SUCCESS after all test questions produce reasonable results.**

## Step 9: Deployment Complete — Everything You Need to Demo

After all tests pass, present the following to the user as the final deployment handoff.

### 9a. Retrieve Live URLs

**IMPORTANT**: Always query the database for the latest URLs — NEVER cache or hardcode them.

```sql
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
```
Capture the `ingress_url` — this is the **Product Launch Dashboard URL**.

### 9b. Present Final Summary

---

**Deployment Complete!** Here is everything you need to run the demo.

#### Access Points

| What | Where |
|------|-------|
| **Product Launch Dashboard** | `https://<ACTUAL ingress_url from Step 9a>` (open in browser — requires Snowflake OAuth) |
| **Cortex Agent (Snowflake Intelligence)** | Snowsight > AI & ML > Agents > PRODUCT_LAUNCH_AGENT |

#### Invoke Agent via SQL

```sql
SELECT SNOWFLAKE.CORTEX.DATA_AGENT_RUN(
  'SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT',
  $${"messages": [{"role": "user", "content": [{"type": "text", "text": "YOUR QUESTION HERE"}]}]}$$
);
```

#### Demo Test Questions

| # | Question | Domain |
|---|----------|--------|
| 1 | Give me a 12-week performance review for our new product launch | Sales |
| 2 | Which region is underperforming the most? | Regional |
| 3 | Drill into Kroger store data for the underperforming region | Store-level |
| 4 | Tell me more about the Southwest supply chain issues | Inventory |
| 5 | What backup distribution center options do we have? | Logistics |
| 6 | Can you look into the consumer purchase data to see if this is backed up? | Consumer |
| 7 | Search for feedback about packaging issues from calls and social media | Search |

#### What Was Deployed & Where to Find It

| Category | Objects | Snowsight Location |
|----------|---------|-------------------|
| **Database** | SKU_LAUNCH | Databases > SKU_LAUNCH |
| **Schemas** | INVENTORY, SKU_SALES, DISTRIBUTION, CONSUMER_INSIGHTS | Databases > SKU_LAUNCH > Schemas |
| **Tables** | 19 (DIM + RAW) | Each schema's Tables tab |
| **Dynamic Tables** | 10 (with Cortex AI enrichment) | Each schema's Dynamic Tables tab |
| **Cortex Search** | PRODUCT_LAUNCH_FEEDBACK_SEARCH | AI & ML > Cortex Search |
| **Semantic Views** | SV_INVENTORY, SV_SKU_SALES, SV_DISTRIBUTION, SV_CONSUMER_INSIGHTS | Each schema's Semantic Views tab |
| **Cortex Agent** | PRODUCT_LAUNCH_AGENT (5 tools) | AI & ML > Agents (or Snowflake Intelligence) |
| **SPCS Service** | SKU_LAUNCH_DASHBOARD (React/Next.js) | Compute > Services |
| **Compute Pool** | SKU_LAUNCH_POOL (CPU_X64_XS) | Compute > Compute Pools |
| **Warehouse** | AICOLLEGE (MEDIUM) | Warehouses |

#### Monitoring

- **Dynamic Table refresh**: Snowsight > Dynamic Tables — check refresh history (1-hour lag)
- **Cortex Search index**: `SHOW CORTEX SEARCH SERVICES IN DATABASE SKU_LAUNCH;` — check indexing_state = ACTIVE
- **SPCS Service health**: `SELECT SYSTEM$GET_SERVICE_STATUS('SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD');`
- **Audio stage**: `LIST @SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_AUDIO;` — 205 MP3 files

---

## Step 10 (Optional): Deploy Openflow Ingestion Pipelines

This step sets up 5 Openflow process groups that simulate incremental data ingestion into the RAW tables. **Requires Openflow to be enabled on the target account.**

### 10a: Check Openflow Availability

```sql
SHOW OPENFLOW DEPLOYMENTS;
```

| Result | Action |
|--------|--------|
| Returns rows | Openflow is enabled — continue to 10b |
| Syntax error | Try legacy: `SHOW OPENFLOW DATA PLANE INTEGRATIONS;` |
| Empty / permission error | Openflow not enabled — tell user: "Openflow is not enabled on this account. To enable: Snowsight > Ingestion > Openflow (requires ORGADMIN to accept Terms of Service). Then create a deployment and runtime via the UI. After that, re-run this step." |

If Openflow is not available, **skip this step** — the demo works without it since all RAW tables are pre-populated with seed data.

### 10b: Check for Existing Runtime

```sql
SHOW OPENFLOW RUNTIMES IN ACCOUNT;
```

If no runtime exists, instruct user:
> "You have Openflow enabled but no runtime. Create one via: Snowsight > Ingestion > Openflow > Create a runtime. Select your deployment, choose Small node type, and assign a role with INSERT privileges on SKU_LAUNCH tables. Then return here."

### 10c: Create Ingestion Flows

Once a runtime is confirmed, use the CoCo Openflow skill to create 5 process groups:

> "Using the openflow skill, create 5 ingestion PGs on the runtime. Each uses GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming with SNOWFLAKE_MANAGED_TOKEN auth, scheduled every 5 minutes:"

| PG Name | Target Table | 
|---------|-------------|
| Inventory Ingestion | `SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY` |
| Distribution Ingestion | `SKU_LAUNCH.DISTRIBUTION.RAW_OF_DC_SHIPMENTS` |
| Consumer Social Ingestion | `SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK` |
| Consumer Audio Ingestion | `SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS` |
| SKU Sales Ingestion | `SKU_LAUNCH.SKU_SALES.RAW_OF_DAILY_STORE_POS` |

The Openflow runtime role needs:
```sql
GRANT USAGE ON DATABASE SKU_LAUNCH TO ROLE <openflow_runtime_role>;
GRANT USAGE ON ALL SCHEMAS IN DATABASE SKU_LAUNCH TO ROLE <openflow_runtime_role>;
GRANT INSERT ON ALL TABLES IN DATABASE SKU_LAUNCH TO ROLE <openflow_runtime_role>;
GRANT USAGE, OPERATE ON WAREHOUSE AICOLLEGE TO ROLE <openflow_runtime_role>;
```

See `openflow/README.md` in this repo for detailed PG architecture and schema mappings.

---

## Stopping Points

- After Step 0: if user declines to proceed
- After Step 1: if Docker not available and user can't install
- After Step 4: before Docker build (confirm SQL infrastructure is set up)
- After Step 6: if Docker build/push fails
- After Step 7: if verification fails (troubleshoot before testing)

## Troubleshooting

**Docker not found**: Install via `brew install --cask docker` (macOS) or `curl -fsSL https://get.docker.com | sh` (Linux)

**Docker daemon not running**: `open -a Docker` (macOS), `sudo systemctl start docker` (Linux), wait 15-30s

**snow spcs image-registry login fails**: Ensure `snow` CLI is configured with an active connection. Run `snow connection test` to verify.

**SPCS service stuck in PENDING**: Check `DESCRIBE COMPUTE POOL SKU_LAUNCH_POOL`. If SUSPENDED, run `ALTER COMPUTE POOL SKU_LAUNCH_POOL RESUME`.

**EXECUTE IMMEDIATE fails**: Fetch git repo first: `ALTER GIT REPOSITORY SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT FETCH;`

**COPY INTO fails with "file not found"**: Ensure the git repository has been fetched. Files are referenced from `@SKU_LAUNCH.INVENTORY.SKU_LAUNCH_GIT/branches/main/data/...`

**Cortex Search not starting**: Uses INCREMENTAL refresh and may take 2-5 minutes to build initial index. Check `indexing_state` via `SHOW CORTEX SEARCH SERVICES`.

**Dynamic Tables not refreshing**: Check warehouse AICOLLEGE is STARTED: `SHOW WAREHOUSES LIKE 'AICOLLEGE'`. If suspended, `ALTER WAREHOUSE AICOLLEGE RESUME`.

**Dynamic Tables with AI functions fail**: SENTIMENT and CLASSIFY_TEXT require Cortex AI availability. Enable cross-region: `ALTER ACCOUNT SET CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION';`

**Agent creation fails with syntax error**: Ensure the script uses `CREATE AGENT ... FROM SPECIFICATION $$...$$;`. If DDL not supported on your account, create via Snowflake Intelligence UI.

**Agent invocation fails with "Unknown function"**: Use `SNOWFLAKE.CORTEX.DATA_AGENT_RUN('<fqn>', $${ ... }$$)` — not `SNOWFLAKE.CORTEX.AGENT()`.

**SPCS 403 / Auth error**: The React app reads `/snowflake/session/token` for SPCS OAuth. Ensure the EAI (SKU_LAUNCH_EAI) allows egress to the correct account host. Update network rule: `ALTER NETWORK RULE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_EGRESS_RULE SET VALUE_LIST = ('<your-account>.snowflakecomputing.com:443');`

**SPCS endpoint requires biometric/passkey in browser**: Public SPCS endpoints use Snowflake OAuth which requires passkey verification. This is expected behavior.

**SPCS not picking up new Docker image**: `ALTER SERVICE ... SUSPEND` / `RESUME` does NOT pull a new image. You must `DROP SERVICE` and `CREATE SERVICE` again. The ingress URL will change — always query `SHOW ENDPOINTS`.

**SNOWFLAKE_HOST env var**: Do NOT set SNOWFLAKE_HOST explicitly in the service spec. Let Snowflake auto-inject the internal hostname. Setting it manually forces traffic over the internet where the SPCS OAuth token is invalid.

**Network rule host value**: Must match your account exactly. Use `SELECT CURRENT_ORGANIZATION_NAME() || '-' || CURRENT_ACCOUNT_NAME() || '.snowflakecomputing.com' AS host;` to determine the correct value.

**Geospatial functions fail**: ST_DISTANCE and ST_MAKEPOINT require geospatial support. This is enabled by default on most accounts. If not: check account parameters.

**DATA_AGENT_RUN query times out**: Agent queries can take 30-90s. Use `timeout_seconds=1200` with CoCo's SQL tool.

## Cleanup

```sql
USE ROLE ACCOUNTADMIN;
DROP SERVICE IF EXISTS SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
DROP COMPUTE POOL IF EXISTS SKU_LAUNCH_POOL;
DROP EXTERNAL ACCESS INTEGRATION IF EXISTS SKU_LAUNCH_EAI;
DROP AGENT IF EXISTS SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT;
DROP DATABASE IF EXISTS SKU_LAUNCH;
DROP WAREHOUSE IF EXISTS AICOLLEGE;
DROP INTEGRATION IF EXISTS SKU_LAUNCH_GIT_INTEGRATION;
```
