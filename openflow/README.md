# Openflow Process Group Templates

This directory contains flow definitions for the 5 Openflow ingestion pipelines used in this demo.

## Process Groups

| PG Name | Target Table | Pattern |
|---------|-------------|---------|
| Inventory Ingestion | `SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY` | GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming |
| Distribution Ingestion | `SKU_LAUNCH.DISTRIBUTION.RAW_OF_DC_SHIPMENTS` | GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming |
| Consumer Social Ingestion | `SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK` | GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming |
| Consumer Audio Ingestion | `SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS` | GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming |
| SKU Sales Ingestion | `SKU_LAUNCH.SKU_SALES.RAW_OF_DAILY_STORE_POS` | GenerateFlowFile → ConvertRecord → PutSnowpipeStreaming |

## Architecture

Each PG follows the same pattern:
1. **GenerateFlowFile** - Triggers on schedule (every 5 minutes for demo)
2. **ConvertRecord** - Transforms JSON/CSV to the target schema
3. **PutSnowpipeStreaming** - Writes to the target Snowflake table using Snowpipe Streaming

## Prerequisites

Openflow cannot be enabled programmatically. You must:

1. **Enable Openflow**: Snowsight > Ingestion > Openflow (requires ORGADMIN to accept ToS)
2. **Create Deployment**: Openflow Control Plane > Create a deployment (Snowflake-hosted)
3. **Create Runtime**: Openflow Control Plane > Create a runtime (select deployment, Small node type)

## Deploying Flows (after runtime exists)

Use CoCo with the Openflow skill to recreate these flows:

```
Ask CoCo: "Using the openflow skill, create 5 ingestion process groups that write synthetic 
data to these tables using PutSnowpipeStreaming:
- SKU_LAUNCH.INVENTORY.RAW_OF_DC_INVENTORY
- SKU_LAUNCH.DISTRIBUTION.RAW_OF_DC_SHIPMENTS  
- SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK
- SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS
- SKU_LAUNCH.SKU_SALES.RAW_OF_DAILY_STORE_POS

Each PG should use GenerateFlowFile with JSON records matching the table schema,
scheduled every 5 minutes. Use SNOWFLAKE_MANAGED_TOKEN auth."
```

## Exporting Templates (for future portability)

Once flows are running, export them for re-import on other accounts:

```python
import nipyapi

# After authenticating to the runtime
for pg in nipyapi.canvas.list_all_process_groups(root_id):
    if pg.id != root_id:
        template = nipyapi.templates.create_pg_snippet(pg.id)
        # Save to openflow/templates/<pg_name>.json
```

## Notes

- Openflow uses `SNOWFLAKE_MANAGED_TOKEN` auth (no key pair needed for Snowflake deployments)
- The `execute_as_role` for the runtime needs USAGE on warehouse AICOLLEGE and INSERT on target tables
- `ExecuteSQLStatement` processor does NOT support DML (INSERT) -- use PutSnowpipeStreaming instead
- GenerateFlowFile needs to be upstream of any processor that expects FlowFiles
