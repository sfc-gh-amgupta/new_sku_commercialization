-- CPG Brand Product Launch Demo - Prerequisites Check
-- Run this script to verify your account has the required features

-- Check Cortex AI availability
SELECT SNOWFLAKE.CORTEX.SENTIMENT('test') AS cortex_ai_check;

-- Check geospatial
SELECT ST_DISTANCE(ST_MAKEPOINT(-75.16, 39.95), ST_MAKEPOINT(-118.24, 34.05)) AS geo_check;

-- Check SPCS
SHOW COMPUTE POOLS;

-- Check Cortex Search
SHOW CORTEX SEARCH SERVICES;

-- Verify warehouse can be created
-- Required: ACCOUNTADMIN or role with CREATE WAREHOUSE privilege
