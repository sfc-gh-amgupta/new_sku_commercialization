-- Colgate v2 Product Launch Demo - Cleanup
-- Drops all objects created by this demo

-- SPCS Service
DROP SERVICE IF EXISTS SKU_LAUNCH.INVENTORY.COLGATE_LAUNCH_DASHBOARD;

-- Compute Pool
DROP COMPUTE POOL IF EXISTS COLGATE_REACT_POOL;

-- External Access Integration
DROP EXTERNAL ACCESS INTEGRATION IF EXISTS COLGATE_DASHBOARD_EAI;

-- Agent (if DDL-created)
DROP AGENT IF EXISTS SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT;

-- Database (removes all schemas, tables, DTs, views, stages, search services, semantic views)
DROP DATABASE IF EXISTS SKU_LAUNCH;

-- Warehouse
DROP WAREHOUSE IF EXISTS AICOLLEGE;
